'use client';

import { useState } from 'react';
import { cva } from 'class-variance-authority';
import { FileText, Upload, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

// The drop target has three looks — resting, dragged over, and disabled —
// so they live in one variant table instead of stacked conditionals.
const dropzoneVariants = cva(
	[
		'group flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed px-4 py-7 text-center',
		'transition-[border-color,background-color,box-shadow] duration-150',
		// The input itself is visually hidden, so the label wears its focus ring.
		'has-[:focus-visible]:border-ring has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50',
	],
	{
		variants: {
			state: {
				idle: 'border-input bg-muted/30 hover:border-muted-foreground/40 hover:bg-muted/60',
				dragging: 'border-brand bg-brand-subtle ring-3 ring-brand/15',
				disabled: 'pointer-events-none border-input bg-muted/30 opacity-50',
			},
		},
		defaultVariants: { state: 'idle' },
	},
);

const uploadIconVariants = cva('size-4 transition-colors duration-150', {
	variants: {
		state: {
			idle: 'text-muted-foreground group-hover:text-foreground',
			dragging: 'text-brand',
			disabled: 'text-muted-foreground',
		},
	},
	defaultVariants: { state: 'idle' },
});

/**
 * Click-or-drop area that only ever hands back a valid PDF, and shows the
 * chosen file once there is one. Rejected files are reported through onReject
 * instead of onSelect.
 */
export function PdfDropzone({
	selected,
	onSelect,
	onReject,
	onClear,
	disabled,
}: {
	selected: File | null;
	onSelect: (file: File) => void;
	onReject: (message: string) => void;
	onClear: () => void;
	disabled?: boolean;
}) {
	const [isDraggedOver, setIsDraggedOver] = useState(false);

	const state = disabled ? 'disabled' : isDraggedOver ? 'dragging' : 'idle';

	function handle(file: File | undefined) {
		if (!file) return;

		if (file.type !== 'application/pdf') {
			return onReject('Only PDF files are accepted.');
		}

		if (file.size > MAX_FILE_SIZE) {
			const size = (file.size / 1024 / 1024).toFixed(1);
			return onReject(
				`That file is ${size} MB. The limit is 4 MB — try a shorter document.`,
			);
		}

		onSelect(file);
	}

	return (
		<>
			<label
				htmlFor='pdf-upload'
				onDragOver={(e) => {
					e.preventDefault();
					if (!disabled) setIsDraggedOver(true);
				}}
				onDragLeave={() => setIsDraggedOver(false)}
				onDrop={(e) => {
					e.preventDefault();
					setIsDraggedOver(false);
					if (!disabled) handle(e.dataTransfer.files[0]);
				}}
				className={dropzoneVariants({ state })}
			>
				<Upload aria-hidden='true' className={uploadIconVariants({ state })} />

				<span className='text-sm font-medium'>
					{isDraggedOver ? 'Drop to attach' : 'Choose a PDF'}
				</span>

				<span className='text-xs text-muted-foreground'>
					or drag one into this panel
				</span>
			</label>

			<input
				id='pdf-upload'
				type='file'
				accept='application/pdf'
				className='sr-only'
				disabled={disabled}
				onChange={(e) => handle(e.target.files?.[0])}
			/>

			{selected && (
				<div className='flex items-center gap-2.5 rounded-lg border border-border bg-muted/40 py-2 pr-2 pl-3'>
					<FileText
						aria-hidden='true'
						className='size-3.5 shrink-0 text-muted-foreground'
					/>

					<span className='flex min-w-0 flex-1 flex-col'>
						<span className='truncate text-sm leading-tight' translate='no'>
							{selected.name}
						</span>
						<span className='font-mono text-[0.6875rem] leading-tight tabular-nums text-muted-foreground'>
							{(selected.size / 1024 / 1024).toFixed(1)}&nbsp;MB
						</span>
					</span>

					{!disabled && (
						<Button
							variant='ghost'
							size='icon-xs'
							aria-label={`Remove ${selected.name}`}
							onClick={onClear}
						>
							<X />
						</Button>
					)}
				</div>
			)}
		</>
	);
}
