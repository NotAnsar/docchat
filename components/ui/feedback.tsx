import { Check, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';

// Waiting on the server before the first token arrives.
function TypingDots() {
	return (
		<span className='flex gap-1' aria-hidden='true'>
			{['0ms', '150ms', '300ms'].map((delay) => (
				<span
					key={delay}
					className='size-1 animate-bounce rounded-full bg-muted-foreground/60'
					style={{ animationDelay: delay }}
				/>
			))}
		</span>
	);
}

// Placeholder lines shown in an answer that has started but has no text yet.
function TextSkeleton() {
	return (
		<span className='flex animate-pulse flex-col gap-2 py-1' aria-hidden='true'>
			<span className='h-2.5 w-full max-w-80 rounded-full bg-muted-foreground/20' />
			<span className='h-2.5 w-full max-w-64 rounded-full bg-muted-foreground/20' />
			<span className='h-2.5 w-32 rounded-full bg-muted-foreground/20' />
		</span>
	);
}

// A single figure with its caption, e.g. the page and passage counts.
function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className='flex flex-col gap-1.5 bg-card px-3 py-2.5'>
			<dt className='label-xs text-muted-foreground'>{label}</dt>
			<dd className='font-mono text-lg leading-none tabular-nums'>{value}</dd>
		</div>
	);
}

function Alert({ className, ...props }: React.ComponentProps<'p'>) {
	return (
		<p
			role='alert'
			className={cn(
				'rounded-lg border border-destructive/25 bg-destructive/5 px-3 py-2.5 text-sm leading-relaxed text-destructive',
				className,
			)}
			{...props}
		/>
	);
}

/**
 * An ordered list of steps with one of them in progress.
 *
 * Steps before `currentIndex` are done, the one at it is running, the rest are
 * still to come. Caller owns the labels and the ordering.
 */
function StepList({
	steps,
	currentIndex,
	className,
}: {
	steps: readonly { id: string; label: string }[];
	currentIndex: number;
	className?: string;
}) {
	return (
		<ol
			aria-live='polite'
			className={cn(
				'flex flex-col gap-2.5 rounded-lg border border-border bg-muted/40 px-3 py-2.5',
				className,
			)}
		>
			{steps.map((step, i) => {
				const isDone = i < currentIndex;
				const isActive = i === currentIndex;

				return (
					<li key={step.id} className='flex items-center gap-2.5 text-xs'>
						<span
							aria-hidden='true'
							className='flex size-3.5 shrink-0 items-center justify-center'
						>
							{isDone ? (
								<Check className='size-3.5 text-brand' />
							) : isActive ? (
								<Loader2 className='size-3.5 animate-spin text-brand' />
							) : (
								<span className='size-1 rounded-full bg-muted-foreground/40' />
							)}
						</span>

						<span
							className={cn(
								'transition-colors duration-200',
								isDone && 'text-muted-foreground',
								isActive && 'font-medium text-foreground',
								!isDone && !isActive && 'text-muted-foreground/60',
							)}
						>
							{step.label}
						</span>
					</li>
				);
			})}
		</ol>
	);
}

export { TypingDots, TextSkeleton, Stat, Alert, StepList };
