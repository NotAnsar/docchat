'use client';

import { useState } from 'react';
import { FileText, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';

export function UploadPanel() {
	const [file, setFile] = useState<File | null>(null);

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
					onChange={(e) => setFile(e.target.files?.[0] ?? null)}
				/>

				{file && (
					<div className='flex items-center gap-2 rounded-lg border bg-background p-3 text-sm'>
						<FileText className='size-4 shrink-0 text-primary' />
						<span className='truncate'>{file.name}</span>
					</div>
				)}

				<Button disabled={!file} className='w-full'>
					Process document
				</Button>
			</CardContent>
		</Card>
	);
}
