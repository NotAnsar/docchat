import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';

const poppins = Poppins({
	variable: '--font-sans',
	subsets: ['latin'],
	weight: ['400', '500', '600', '700'],
});

export const metadata: Metadata = {
	title: 'DocChat',
	description: 'Ask questions about your PDF documents',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
	return (
		<html lang='en' className={cn(poppins.variable, 'h-full antialiased')}>
			<body className='min-h-full flex flex-col'>{children}</body>
		</html>
	);
}
