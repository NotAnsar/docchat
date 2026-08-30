'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { ArrowUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Alert, TextSkeleton, TypingDots } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sources, type Source } from '@/components/ui/sources';
import { cn } from '@/lib/utils';

// The server attaches the passages it used to the answer message.
type Metadata = { sources?: Source[] };
type ChatMessage = UIMessage<Metadata>;

export function ChatPanel({ documentId }: { documentId: string | null }) {
	const [question, setQuestion] = useState('');

	const { messages, sendMessage, status, error } = useChat<ChatMessage>({
		transport: new DefaultChatTransport({
			api: '/api/chat',
			body: { documentId },
		}),
	});

	const bottomRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
	}, [messages]);

	const isBusy = status === 'submitted' || status === 'streaming';
	const isReady = documentId !== null;
	const canSend = isReady && question.trim() !== '' && !isBusy;

	return (
		<Card className='flex h-[calc(100dvh-6.5rem)] min-h-125 flex-col gap-0 py-0'>
			<div className='flex items-center gap-2.5 border-b border-border px-4 py-3'>
				<h2 className='text-sm font-medium'>Chat</h2>

				<span
					className={cn(
						'label-xs rounded-full px-2 py-1',
						isReady
							? 'bg-brand-subtle text-brand'
							: 'bg-muted text-muted-foreground',
					)}
				>
					{isReady ? 'Document Loaded' : 'No document'}
				</span>
			</div>

			<ScrollArea className='min-h-0 flex-1'>
				<div className='flex flex-col gap-6 px-4 py-5'>
					{messages.length === 0 && (
						<p className='px-6 py-14 text-center text-sm leading-relaxed text-balance text-muted-foreground'>
							{isReady
								? 'Ask a question about the document. Every answer lists the pages it drew on.'
								: 'Upload a PDF to start. Once it is indexed, you can question it here.'}
						</p>
					)}

					{messages.map((message, i) => (
						<MessageBubble
							key={message.id}
							message={message}
							isLoading={isBusy && i === messages.length - 1}
						/>
					))}

					{status === 'submitted' && (
						<p
							aria-live='polite'
							className='flex items-center gap-2 text-sm text-muted-foreground'
						>
							<TypingDots />
							Searching the document…
						</p>
					)}

					{error && <Alert>Something went wrong. Please try again.</Alert>}

					<div ref={bottomRef} />
				</div>
			</ScrollArea>

			<div className='border-t border-border p-3'>
				<form
					className={cn(
						'flex items-end gap-2 rounded-lg border border-input bg-background p-1.5 pl-3',
						'transition-[border-color,box-shadow] duration-150',
						'focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/50',
						!isReady && 'opacity-60',
					)}
					onSubmit={(e) => {
						e.preventDefault();
						if (!canSend) return;

						sendMessage({ text: question });
						setQuestion('');
					}}
				>
					<label htmlFor='question' className='sr-only'>
						Your question about the document
					</label>

					<Input
						id='question'
						name='question'
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						autoComplete='off'
						placeholder={
							isReady
								? 'Ask about this document…'
								: 'Process a document to start asking…'
						}
						disabled={!isReady}
						className='h-8 rounded-none border-0 bg-transparent px-0 focus-visible:border-0 focus-visible:ring-0 disabled:bg-transparent'
					/>

					<Button
						type='submit'
						size='icon-sm'
						aria-label='Send question'
						disabled={!canSend}
					>
						<ArrowUp />
					</Button>
				</form>
			</div>
		</Card>
	);
}

function MessageBubble({
	message,
	isLoading,
}: {
	message: ChatMessage;
	isLoading: boolean;
}) {
	// A message is a list of parts (text, files, tool calls). We only show text.
	const text = message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('');

	const sources = message.metadata?.sources;

	// Questions are compact and right-aligned; answers run the full width of
	// the surface, so the passages underneath line up with the text they back.
	if (message.role === 'user') {
		return (
			<p className='ml-auto max-w-[85%] animate-enter rounded-lg rounded-br-sm bg-primary px-3.5 py-2 text-sm leading-relaxed break-words text-primary-foreground'>
				{text}
			</p>
		);
	}

	return (
		<div className='flex animate-enter flex-col gap-3'>
			{text && (
				<p className='text-sm leading-relaxed whitespace-pre-wrap'>{text}</p>
			)}

			{!text && isLoading && <TextSkeleton />}

			{/* Finished with nothing to show: the request failed mid-stream. */}
			{!text && !isLoading && (
				<p className='text-sm text-destructive'>
					No answer came back. Please ask again.
				</p>
			)}

			{sources && sources.length > 0 && <Sources sources={sources} />}
		</div>
	);
}
