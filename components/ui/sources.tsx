'use client';

import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

export type Source = { pageNumber: number; score: number; preview: string };

/**
 * The passages retrieved for a question, ranked by similarity.
 *
 * They are what the model was given, which is not always what it ended up
 * using — so they sit under the answer as evidence to check it against,
 * folded away until asked for.
 */
function Sources({ sources }: { sources: Source[] }) {
	return (
		<details className='group rounded-lg border border-border bg-muted/30'>
			<summary
				className={cn(
					'flex cursor-pointer list-none items-center gap-2 rounded-lg px-3 py-2 text-xs text-muted-foreground',
					'transition-colors duration-150 hover:text-foreground',
					'focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none',
				)}
			>
				<ChevronRight
					aria-hidden='true'
					className='size-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90'
				/>
				<span className='label-xs'>Sources</span>
				<span className='font-mono text-[0.6875rem] tabular-nums'>
					{sources.length} passages
				</span>
			</summary>

			<ol className='flex flex-col gap-3 border-t border-border px-3 py-3'>
				{sources.map((source, i) => (
					<li key={i} className='flex gap-2.5'>
						<span className='mt-px w-3 shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted-foreground/70'>
							{i + 1}
						</span>

						<div className='flex min-w-0 flex-1 flex-col gap-1.5'>
							<div className='flex items-center gap-2.5'>
								<span className='label-xs shrink-0 text-foreground'>
									Page {source.pageNumber}
								</span>

								<Meter score={source.score} />

								<span className='shrink-0 font-mono text-[0.6875rem] tabular-nums text-muted-foreground'>
									{Math.round(source.score * 100)}%
								</span>
							</div>

							<p className='text-xs leading-relaxed text-muted-foreground'>
								&ldquo;{source.preview}&rdquo;
							</p>
						</div>
					</li>
				))}
			</ol>
		</details>
	);
}

// Cosine similarity, drawn to scale. The number beside it is the exact value;
// the bar is only there to make the ranking scannable.
function Meter({ score }: { score: number }) {
	return (
		<span
			aria-hidden='true'
			className='h-1 w-full max-w-24 overflow-hidden rounded-full bg-border'
		>
			<span
				className='block h-full origin-left rounded-full bg-brand'
				style={{ transform: `scaleX(${Math.min(Math.max(score, 0), 1)})` }}
			/>
		</span>
	);
}

export { Sources, Meter };
