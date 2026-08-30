'use client';

import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { PdfDropzone } from '@/components/pdf-dropzone';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Alert, Stat, StepList } from '@/components/ui/feedback';

// The stages the upload endpoint reports, in the order it reports them.
const STAGES = [
	{ id: 'parsing', label: 'Reading the PDF' },
	{ id: 'chunking', label: 'Splitting into passages' },
	{ id: 'embedding', label: 'Computing embeddings' },
] as const;

type Stage = (typeof STAGES)[number]['id'];

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
	const [stage, setStage] = useState<Stage | null>(null);
	const [result, setResult] = useState<Result | null>(null);
	const [error, setError] = useState<string | null>(null);

	const isProcessing = stage !== null;

	function reset() {
		setResult(null);
		setError(null);
	}

	async function processDocument() {
		if (!file) return;

		setStage('parsing');
		reset();

		try {
			const body = new FormData();
			body.append('file', file);

			const response = await fetch('/api/upload', { method: 'POST', body });

			if (!response.ok) {
				const data = await response.json();
				setError(data.error ?? 'Upload failed.');
				return;
			}

			// The server responds with one JSON object per line, reporting the
			// current stage and finally the result.
			await readStream(response, (data) => {
				if ('stage' in data) setStage(data.stage as Stage);
				else if ('error' in data) setError(String(data.error));
				else {
					const uploaded = data as Result;
					setResult(uploaded);
					onUploaded(uploaded.documentId);
				}
			});
		} catch {
			setError('Could not reach the server. Check your connection.');
		} finally {
			setStage(null);
		}
	}

	return (
		<Card className='gap-4 lg:sticky lg:top-19'>
			<CardHeader>
				<CardTitle>Document</CardTitle>
				<CardDescription className='text-xs'>
					PDF with selectable text, up to 4&nbsp;MB and 50 pages
				</CardDescription>
			</CardHeader>

			<CardContent className='flex flex-col gap-3'>
				<PdfDropzone
					selected={file}
					disabled={isProcessing}
					onSelect={(selected) => {
						reset();
						setFile(selected);
					}}
					onReject={(message) => {
						setFile(null);
						setResult(null);
						setError(message);
					}}
					onClear={() => {
						setFile(null);
						reset();
					}}
				/>

				<Button
					disabled={!file || isProcessing}
					className='w-full'
					onClick={processDocument}
				>
					{isProcessing ? (
						<>
							<Loader2 className='animate-spin' aria-hidden='true' />
							Processing…
						</>
					) : (
						'Process document'
					)}
				</Button>

				{stage && (
					<StepList
						steps={STAGES}
						currentIndex={STAGES.findIndex((s) => s.id === stage)}
					/>
				)}

				{error && <Alert className='text-xs'>{error}</Alert>}

				{/* What the document became once indexed. These are the same
				    passages the citations under each answer point back into. */}
				{result && !isProcessing && (
					<div className='flex flex-col gap-2.5' aria-live='polite'>
						<p className='flex items-center gap-1.5 text-xs font-medium text-brand'>
							<Check aria-hidden='true' className='size-3.5' />
							Indexed and ready
						</p>

						<dl className='grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border'>
							<Stat label='Pages' value={result.pageCount} />
							<Stat label='Passages' value={result.chunkCount} />
						</dl>
					</div>
				)}
			</CardContent>
		</Card>
	);
}


// Reads a newline-delimited JSON response, calling onLine for each object.
async function readStream(
	response: Response,
	onLine: (data: Record<string, unknown>) => void,
) {
	const reader = response.body?.getReader();
	if (!reader) return;

	const decoder = new TextDecoder();
	let buffer = '';

	for (;;) {
		const { done, value } = await reader.read();
		if (done) break;

		buffer += decoder.decode(value, { stream: true });

		// The last piece may be an incomplete line, so it waits for more data.
		const lines = buffer.split('\n');
		buffer = lines.pop() ?? '';

		for (const line of lines) {
			if (line.trim()) onLine(JSON.parse(line));
		}
	}
}
