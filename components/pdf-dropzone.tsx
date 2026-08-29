'use client';

import { useState } from 'react';
import { Upload } from 'lucide-react';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

/**
 * Click-or-drop area that only ever hands back a valid PDF.
 * Rejected files are reported through onReject instead of onSelect.
 */
export function PdfDropzone({
	onSelect,
	onReject,
	disabled,
}: {
	onSelect: (file: File) => void;
	onReject: (message: string) => void;
	disabled?: boolean;
}) {
	const [isDraggedOver, setIsDraggedOver] = useState(false);

	function handle(file: File | undefined) {
		if (!file) return;

		if (file.type !== 'application/pdf') {
			return onReject('Only PDF files are accepted.');
		}

		if (file.size > MAX_FILE_SIZE) {
			const size = (file.size / 1024 / 1024).toFixed(1);
			return onReject(`That file is ${size} MB. The limit is 4 MB.`);
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
				className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors ${
					isDraggedOver ? 'border-primary bg-muted' : 'hover:bg-muted'
				}`}
			>
				<Upload className='size-6 text-muted-foreground' />
				<span className='text-sm font-medium'>Choose a PDF</span>
				<span className='text-xs text-muted-foreground'>or drag it here</span>
			</label>

			<input
				id='pdf-upload'
				type='file'
				accept='application/pdf'
				className='sr-only'
				disabled={disabled}
				onChange={(e) => handle(e.target.files?.[0])}
			/>
		</>
	);
}
