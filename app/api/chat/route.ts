import { google } from '@ai-sdk/google';
import {
	convertToModelMessages,
	createUIMessageStreamResponse,
	streamText,
	toUIMessageStream,
	type UIMessage,
} from 'ai';
import { z } from 'zod';
import { buildSystemPrompt } from '@/lib/prompt';
import { findRelevantChunks } from '@/lib/retrieval';

const CHAT_MODEL = 'gemini-3.5-flash-lite';
// How much of a passage the UI shows under an answer. The full text stays
// in the database; this is only what travels to the browser.
const SOURCE_PREVIEW_LENGTH = 300;

const bodySchema = z.object({
	documentId: z.string({ error: 'documentId is required.' }).min(1),
	messages: z.array(z.custom<UIMessage>()).min(1, 'A message is required.'),
});

export async function POST(request: Request) {
	const body = await request.json().catch(() => null);
	const parsed = bodySchema.safeParse(body);

	if (!parsed.success) {
		return Response.json(
			{ error: parsed.error.issues[0].message },
			{ status: 400 },
		);
	}

	const { documentId, messages } = parsed.data;

	// Retrieval uses the newest question only. Earlier turns stay in `messages`
	const question = lastUserText(messages);
	if (!question) {
		return Response.json({ error: 'No question was sent.' }, { status: 400 });
	}

	try {
		const matches = await findRelevantChunks(documentId, question);

		const result = streamText({
			model: google(CHAT_MODEL),
			system: buildSystemPrompt(matches),
			messages: await convertToModelMessages(messages),
		});

		return createUIMessageStreamResponse({
			stream: toUIMessageStream({
				stream: result.stream,
				messageMetadata: ({ part }) =>
					part.type === 'finish'
						? {
								sources: matches.map((match) => ({
									pageNumber: match.pageNumber,
									score: match.score,
									preview: truncate(match.text, SOURCE_PREVIEW_LENGTH),
								})),
							}
						: undefined,
			}),
		});
	} catch (error) {
		console.error('[chat] failed', error);
		return Response.json(
			{ error: 'Could not answer right now. Please try again.' },
			{ status: 500 },
		);
	}
}

function lastUserText(messages: UIMessage[]): string | null {
	const message = messages.findLast((m) => m.role === 'user');
	if (!message) return null;

	// A message is a list of parts (text, files, ...); we only need the text.
	const text = message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join(' ')
		.trim();

	return text.length > 0 ? text : null;
}

function truncate(text: string, max: number): string {
	const clean = text.replace(/\s+/g, ' ').trim();
	return clean.length <= max ? clean : `${clean.slice(0, max)}...`;
}
