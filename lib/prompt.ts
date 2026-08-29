import type { Match } from '@/lib/retrieval';

// Builds the instructions sent to the model with every question.
// The instructions include the passages that matched the question, and rules
export function buildSystemPrompt(matches: Match[]): string {
	if (matches.length === 0) {
		return [
			'You answer questions about a document.',
			'No passage from the document matched this question.',
			'Tell the user the document does not seem to cover it. Do not answer from your own knowledge.',
		].join('\n');
	}

	const passages = matches
		.map((match, i) => `[${i + 1}] (page ${match.pageNumber})\n${match.text}`)
		.join('\n\n');

	return [
		'You answer questions about one document, using the passages below.',
		'',
		'Rules:',
		'- Use only these passages. Never add facts from your own knowledge.',
		'- When the passages answer the question: answer, and cite the pages you used, like (page 4).',
		'- When they do not: reply with one short sentence saying the document does not cover it, and end there. No page numbers, since none were used.',
		'- Reply in the language of the question.',
		'- Be brief: a few sentences unless more detail is asked for.',
		'- Write plain sentences. No markdown, no asterisks, no headings.',
		'',
		'Passages:',
		passages,
	].join('\n');
}
