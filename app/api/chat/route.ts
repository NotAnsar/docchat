import { google } from '@ai-sdk/google';
import {
	convertToModelMessages,
	createUIMessageStreamResponse,
	streamText,
	toUIMessageStream,
	type UIMessage,
} from 'ai';
import { z } from 'zod';
import { log } from '@/lib/logger';
import { buildSystemPrompt } from '@/lib/prompt';
import { findRelevantChunks } from '@/lib/retrieval';

const CHAT_MODEL = 'gemini-3.5-flash-lite';
// How much of a passage the UI shows under an answer. The full text stays
// in the database; this is only what travels to the browser.
const SOURCE_PREVIEW_LENGTH = 300;

// Caps so a client cannot post an unbounded payload straight through to Gemini.
const MAX_MESSAGES = 50;
const MAX_QUESTION_LENGTH = 4000;

const bodySchema = z.object({
	documentId: z.string({ error: 'documentId is required.' }).min(1),
	messages: z
		.array(z.custom<UIMessage>())
		.min(1, 'A message is required.')
		.max(MAX_MESSAGES, 'Too many messages in this conversation.'),
});

export async function POST(request: Request) {
	const started = Date.now();

	// Logs the refusal and returns it, so no request leaves without a trace.
	const reject = (reason: string, status: number) => {
		log('chat.rejected', { reason, status, ms: Date.now() - started });
		return Response.json({ error: reason }, { status });
	};

	const body = await request.json().catch(() => null);
	const parsed = bodySchema.safeParse(body);

	if (!parsed.success) {
		return reject(parsed.error.issues[0].message, 400);
	}

	const { documentId, messages } = parsed.data;

	// Retrieval uses the newest question only. Earlier turns stay in `messages`
	const question = lastUserText(messages);
	if (!question) {
		return reject('No question was sent.', 400);
	}

	if (question.length > MAX_QUESTION_LENGTH) {
		return reject(
			`Questions are limited to ${MAX_QUESTION_LENGTH} characters.`,
			400,
		);
	}

	try {
		const matches = await findRelevantChunks(documentId, question);

		log('chat.retrieved', {
			documentId,
			matches: matches.length,
			topScore: matches[0]?.score,
			ms: Date.now() - started,
		});

		const result = streamText({
			model: google(CHAT_MODEL),
			system: buildSystemPrompt(matches),
			messages: await convertToModelMessages(messages),
			// The handler returns as soon as the stream opens, so the total time
			// is only known here, once the last token has been sent.
			onFinish: ({ finishReason }) =>
				log('chat.answered', {
					documentId,
					finishReason,
					ms: Date.now() - started,
				}),
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
		log('chat.failed', {
			documentId,
			ms: Date.now() - started,
			error: error instanceof Error ? error.message : 'unknown',
		});

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
