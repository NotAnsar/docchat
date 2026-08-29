import { describe, expect, it } from 'vitest';
import { buildSystemPrompt } from '@/lib/prompt';
import type { Match } from '@/lib/retrieval';

const matches: Match[] = [
	{ text: 'Jenkins orchestrates the pipeline.', pageNumber: 5, score: 0.89 },
	{ text: 'SonarQube enforces code quality.', pageNumber: 11, score: 0.84 },
];

describe('buildSystemPrompt', () => {
	it('includes every passage', () => {
		const prompt = buildSystemPrompt(matches);

		for (const match of matches) {
			expect(prompt).toContain(match.text);
		}
	});

	it('labels each passage with its page', () => {
		const prompt = buildSystemPrompt(matches);

		expect(prompt).toContain('page 5');
		expect(prompt).toContain('page 11');
	});

	it('tells the model to use only the passages', () => {
		const prompt = buildSystemPrompt(matches);

		expect(prompt).toContain('only these passages');
	});

	it('asks for the language of the question', () => {
		expect(buildSystemPrompt(matches)).toContain('language of the question');
	});

	it('forbids outside knowledge when nothing matched', () => {
		const prompt = buildSystemPrompt([]);

		expect(prompt).toContain('own knowledge');
		expect(prompt).not.toContain('Passages:');
	});
});
