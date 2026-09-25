import React from 'react';
import ReactMarkdown, { type Components } from 'react-markdown';

const components: Components = {
	p: ({ children }) => (
		<p className='my-1.5 first:mt-0 last:mb-0'>{children}</p>
	),
	ul: ({ children }) => (
		<ul className='my-1.5 list-disc space-y-0.5 pl-4'>{children}</ul>
	),
	ol: ({ children }) => (
		<ol className='my-1.5 list-decimal space-y-0.5 pl-4'>{children}</ol>
	),
	a: ({ children, href }) => (
		<a
			href={href}
			target='_blank'
			rel='noreferrer'
			className='text-foreground underline underline-offset-2'
		>
			{children}
		</a>
	),
	strong: ({ children }) => (
		<strong className='font-semibold text-foreground'>{children}</strong>
	),
	h1: ({ children }) => (
		<p className='mt-3 mb-1 font-semibold text-foreground'>{children}</p>
	),
	h2: ({ children }) => (
		<p className='mt-3 mb-1 font-semibold text-foreground'>{children}</p>
	),
	h3: ({ children }) => (
		<p className='mt-2 mb-1 font-semibold text-foreground'>{children}</p>
	),
	code: ({ children, className }) =>
		className ? (
			<code className={className}>{children}</code>
		) : (
			<code className='rounded-[4px] bg-muted px-1 py-px font-mono text-[12px] text-foreground'>
				{children}
			</code>
		),
	pre: ({ children }) => (
		<pre className='my-2 overflow-x-auto rounded-control border border-border bg-background p-2 font-mono text-[12px] leading-relaxed'>
			{children}
		</pre>
	),
};

/** Markdown of assistant messages, styled for the narrow panel. */
export const Markdown: React.FC<{ children: string }> = ({ children }) => (
	<div className='text-[13px] leading-relaxed break-words text-foreground/90'>
		<ReactMarkdown components={components}>{children}</ReactMarkdown>
	</div>
);
