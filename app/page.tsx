'use client';

import { useState } from 'react';
import { FileText } from 'lucide-react';
import { ChatPanel } from '@/components/chat-panel';
import { UploadPanel } from '@/components/upload-panel';

export default function Home() {
	const [documentId, setDocumentId] = useState<string | null>(null);

	return (
		<div className='flex flex-1 flex-col bg-muted/40'>
			<header className='border-b bg-background px-6 py-4'>
				<div className='mx-auto flex w-full max-w-5xl items-center gap-2'>
					<FileText className='size-5 text-primary' />
					<h1 className='text-lg font-semibold tracking-tight'>DocChat</h1>
					<p className='ml-2 hidden text-sm text-muted-foreground sm:block'>
						Ask questions about your PDF
					</p>
				</div>
			</header>

			<main className='mx-auto grid w-full max-w-5xl flex-1 gap-6 p-6 md:grid-cols-[320px_1fr]'>
				<UploadPanel onUploaded={setDocumentId} />
				<ChatPanel key={documentId ?? 'empty'} documentId={documentId} />
			</main>
		</div>
	);
}
