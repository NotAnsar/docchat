import type { Metadata, Viewport } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

const sans = Geist({
	variable: '--font-geist-sans',
	subsets: ['latin'],
	display: 'swap',
});

const mono = Geist_Mono({
	variable: '--font-geist-mono',
	subsets: ['latin'],
	display: 'swap',
});

export const metadata: Metadata = {
	title: 'DocChat — question your PDFs',
	description:
		'Upload a PDF and ask questions about it. Every answer is built from passages retrieved out of the document and cited by page.',
};

export const viewport: Viewport = {
	themeColor: '#fafafb',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html
			lang='en'
			className={cn(sans.variable, mono.variable, 'h-full antialiased')}
		>
			<body className='flex min-h-full flex-col'>{children}</body>
		</html>
	);
}
