'use client';

import { useEffect, useRef, useState } from 'react';
import { useChat } from '@ai-sdk/react';
import { DefaultChatTransport, type UIMessage } from 'ai';
import { Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';

// The server attaches the passages it used to the answer message.
type Source = { pageNumber: number; score: number; preview: string };
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
	const canSend = documentId !== null && question.trim() !== '' && !isBusy;

	return (
		<Card className='flex h-[80vh] flex-col'>
			<CardHeader className='border-b'>
				<CardTitle>Chat</CardTitle>
				<CardDescription>
					Answers come only from the uploaded document
				</CardDescription>
			</CardHeader>
			<CardContent className='flex min-h-0 flex-1 flex-col gap-4 pt-4'>
				<ScrollArea className='min-h-0 flex-1 pr-2'>
					<div className='flex flex-col gap-4'>
						{messages.length === 0 && (
							<p className='py-8 text-center text-sm text-muted-foreground'>
								{documentId
									? 'Ask a question about the document.'
									: 'Upload a PDF to start.'}
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
							<p className='text-sm text-muted-foreground'>Searching the document...</p>
						)}

						{error && (
							<p className='rounded-lg bg-destructive/10 p-3 text-sm text-destructive'>
								Something went wrong. Please try again.
							</p>
						)}

						<div ref={bottomRef} />
					</div>
				</ScrollArea>

				<form
					className='flex gap-2'
					onSubmit={(e) => {
						e.preventDefault();
						if (!canSend) return;

						sendMessage({ text: question });
						setQuestion('');
					}}
				>
					<Input
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder={
							documentId
								? 'Ask a question about the document...'
								: 'Upload a document first'
						}
						disabled={documentId === null}
					/>
					<Button type='submit' size='icon' disabled={!canSend}>
						<Send />
					</Button>
				</form>
			</CardContent>
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

	return (
		<div
			className={
				message.role === 'user'
					? 'ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground'
					: 'mr-auto max-w-[85%] rounded-xl bg-muted px-4 py-2.5 text-sm'
			}
		>
			{/* The passages retrieved for this question. They are what the model
			    was given, which is not always what it ended up using. */}
			{sources && sources.length > 0 && (
				<div className='mt-3 mb-2 flex flex-col gap-2 border-b pb-2'>
					<p className='text-xs font-medium tracking-wide text-muted-foreground uppercase'>
						Passages searched
					</p>
					{sources.map((source, i) => (
						<div key={i} className='flex flex-col gap-1'>
							<div className='flex items-center gap-2'>
								<Badge variant='outline'>page {source.pageNumber}</Badge>
								<span className='text-xs text-muted-foreground'>
									{Math.round(source.score * 100)}% match
								</span>
							</div>
							<p className='text-xs text-muted-foreground italic'>
								&ldquo;{source.preview}&rdquo;
							</p>
						</div>
					))}
				</div>
			)}

			{text && (
				<p className='leading-relaxed whitespace-pre-wrap text-sm'>{text}</p>
			)}

			{!text && isLoading && (
				<span className='flex animate-pulse flex-col gap-2 py-1'>
					<span className='h-2.5 w-48 rounded bg-current opacity-20' />
					<span className='h-2.5 w-40 rounded bg-current opacity-20' />
					<span className='h-2.5 w-24 rounded bg-current opacity-20' />
				</span>
			)}

			{/* Finished with nothing to show: the request failed mid-stream. */}
			{!text && !isLoading && (
				<p className='text-sm text-destructive'>
					No answer came back. Please ask again.
				</p>
			)}
		</div>
	);
}
