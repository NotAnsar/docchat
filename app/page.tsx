'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { ChatPanel } from '@/components/chat-panel';
import { UploadPanel } from '@/components/upload-panel';

export default function Home() {
	const [documentId, setDocumentId] = useState<string | null>(null);

	return (
		<div className='flex flex-1 flex-col'>
			<header className='sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md'>
				<div className='mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4 sm:px-6'>
					<span
						aria-hidden='true'
						className='flex size-7 items-center justify-center rounded-md bg-primary text-primary-foreground'
					>
						<FileText className='size-3.5' />
					</span>

					<h1 className='text-sm font-semibold tracking-tight' translate='no'>
						DocChat
					</h1>

					<span aria-hidden='true' className='h-4 w-px bg-border' />

					<p className='min-w-0 truncate text-sm text-muted-foreground'>
						Answers built only from your document
					</p>
				</div>
			</header>

			<main className='mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 items-start gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]'>
				<UploadPanel onUploaded={setDocumentId} />
				<ChatPanel key={documentId ?? 'empty'} documentId={documentId} />
			</main>
		</div>
	);
}
