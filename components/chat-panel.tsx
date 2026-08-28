'use client';

import { useState } from 'react';
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
import type { Message } from '@/lib/types';

// Fake conversation so we can build the screen before the backend exists.
const PLACEHOLDER_MESSAGES: Message[] = [
	{ role: 'user', text: 'What is the notice period in this contract?' },
	{
		role: 'assistant',
		text: 'The notice period is 30 days for both parties, starting from the date of the written notification.',
		sources: [
			{
				page: 4,
				score: 0.89,
				preview:
					'Either party may terminate this agreement with a written notice of thirty (30) days...',
			},
			{
				page: 7,
				score: 0.81,
				preview:
					'The notification must be sent by registered mail and takes effect upon receipt...',
			},
		],
	},
];

export function ChatPanel() {
	const [question, setQuestion] = useState('');

	return (
		<Card className='flex min-h-[70vh] flex-col'>
			<CardHeader className='border-b'>
				<CardTitle>Chat</CardTitle>
				<CardDescription>
					Answers come only from the uploaded document
				</CardDescription>
			</CardHeader>
			<CardContent className='flex flex-1 flex-col gap-4 pt-4'>
				<ScrollArea className='flex-1 pr-2'>
					<div className='flex flex-col gap-4'>
						{PLACEHOLDER_MESSAGES.map((message, i) => (
							<MessageBubble key={i} message={message} />
						))}
					</div>
				</ScrollArea>

				<form
					className='flex gap-2'
					onSubmit={(e) => {
						e.preventDefault();
						setQuestion('');
					}}
				>
					<Input
						value={question}
						onChange={(e) => setQuestion(e.target.value)}
						placeholder='Ask a question about the document...'
					/>
					<Button type='submit' size='icon' disabled={!question.trim()}>
						<Send />
					</Button>
				</form>
			</CardContent>
		</Card>
	);
}

function MessageBubble({ message }: { message: Message }) {
	return (
		<div
			className={
				message.role === 'user'
					? 'ml-auto max-w-[85%] rounded-xl bg-primary px-4 py-2.5 text-sm text-primary-foreground'
					: 'mr-auto max-w-[85%] rounded-xl bg-muted px-4 py-2.5 text-sm'
			}
		>
			<p className='leading-relaxed'>{message.text}</p>

			{message.sources && (
				<div className='mt-3 flex flex-col gap-2 border-t pt-2'>
					{message.sources.map((source, i) => (
						<div key={i} className='flex flex-col gap-1'>
							<div className='flex items-center gap-2'>
								<Badge variant='outline'>page {source.page}</Badge>
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
		</div>
	);
}
