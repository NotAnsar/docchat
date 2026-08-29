'use client';

import { useState } from 'react';
import { FileText, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

type Result = {
	documentId: string;
	filename: string;
	pageCount: number;
	chunkCount: number;
};

export function UploadPanel({
	onUploaded,
}: {
	onUploaded: (documentId: string) => void;
}) {
	const [file, setFile] = useState<File | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [result, setResult] = useState<Result | null>(null);
	const [error, setError] = useState<string | null>(null);

	async function processDocument() {
		if (!file) return;

		setIsProcessing(true);
		setError(null);
		setResult(null);

		try {
			const body = new FormData();
			body.append('file', file);

			const response = await fetch('/api/upload', { method: 'POST', body });
			const data = await response.json();

			if (!response.ok) {
				setError(data.error ?? 'Upload failed.');
				return;
			}

			setResult(data);
			onUploaded(data.documentId);
		} catch {
			setError('Could not reach the server. Check your connection.');
		} finally {
			setIsProcessing(false);
		}
	}

	return (
		<Card className='h-fit'>
			<CardHeader>
				<CardTitle>Document</CardTitle>
				<CardDescription>PDF with selectable text, up to 4 MB</CardDescription>
			</CardHeader>
			<CardContent className='flex flex-col gap-3'>
				<label
					htmlFor='pdf-upload'
					className='flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed p-8 text-center transition-colors hover:bg-muted'
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
					onChange={(e) => {
						setFile(e.target.files?.[0] ?? null);
						setResult(null);
						setError(null);
					}}
				/>

				{file && (
					<div className='flex items-center gap-2 rounded-lg border bg-background p-3 text-sm'>
						<FileText className='size-4 shrink-0 text-primary' />
						<span className='truncate'>{file.name}</span>
					</div>
				)}

				<Button
					disabled={!file || isProcessing}
					className='w-full'
					onClick={processDocument}
				>
					{isProcessing && <Loader2 className='animate-spin' />}
					{isProcessing ? 'Processing...' : 'Process document'}
				</Button>

				{error && (
					<p className='rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
						{error}
					</p>
				)}

				{result && (
					<p className='rounded-lg bg-muted p-3 text-sm'>
						{result.pageCount} pages split into{' '}
						<span className='font-medium'>{result.chunkCount} passages</span>.
					</p>
				)}
			</CardContent>
		</Card>
	);
}
