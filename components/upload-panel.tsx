'use client';

import { useState } from 'react';
import { Check, FileText, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

const MAX_FILE_SIZE = 4 * 1024 * 1024;

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

	function selectFile(selected: File | null) {
		setResult(null);
		setError(null);

		if (!selected) return setFile(null);

		if (selected.type !== 'application/pdf') {
			setFile(null);
			return setError('Only PDF files are accepted.');
		}

		if (selected.size > MAX_FILE_SIZE) {
			setFile(null);
			const size = (selected.size / 1024 / 1024).toFixed(1);
			return setError(`That file is ${size} MB. The limit is 4 MB.`);
		}

		setFile(selected);
	}

	async function processDocument() {
		if (!file) return;

		setStage('parsing');
		setError(null);
		setResult(null);

		try {
			const body = new FormData();
			body.append('file', file);

			const response = await fetch('/api/upload', { method: 'POST', body });

			if (!response.ok) {
				const data = await response.json();
				setError(data.error ?? 'Upload failed.');
				return;
			}

			// The server responds with a stream of JSON lines, each reporting the current stage or the final result.
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
					onChange={(e) => selectFile(e.target.files?.[0] ?? null)}
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
					{isProcessing ? 'Processing...' : 'Process document'}
				</Button>

				{stage && <StageList current={stage} />}

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

function StageList({ current }: { current: Stage }) {
	const currentIndex = STAGES.findIndex((stage) => stage.id === current);

	return (
		<ul className='flex flex-col gap-2 rounded-lg border p-3'>
			{STAGES.map((stage, i) => (
				<li key={stage.id} className='flex items-center gap-2 text-sm'>
					{i < currentIndex ? (
						<Check className='size-4 text-primary' />
					) : i === currentIndex ? (
						<Loader2 className='size-4 animate-spin text-primary' />
					) : (
						<span className='size-4' />
					)}
					<span className={i <= currentIndex ? '' : 'text-muted-foreground'}>
						{stage.label}
					</span>
				</li>
			))}
		</ul>
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
