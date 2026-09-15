import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Eye, EyeOff, RefreshCw, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { type McpStatus, getBeedlyBridge } from '@/lib/beedly/bridge';
import {
	type McpClientSnippet,
	mcpClientSnippets,
} from '@/lib/beedly/mcp/client-config';

const errorMessage = (error: unknown) =>
	error instanceof Error
		? error.message.replace(
				/^Error invoking remote method '[^']+': (Error: )?/,
				'',
			)
		: String(error);

const copy = async (text: string, what: string) => {
	try {
		await navigator.clipboard.writeText(text);
		toast.success(`${what} copied`);
	} catch {
		toast.error(`Could not copy the ${what.toLowerCase()}`);
	}
};

const timeAgo = (timestamp: number) => {
	const seconds = Math.round((Date.now() - timestamp) / 1000);
	if (seconds < 60) return 'just now';
	const minutes = Math.round(seconds / 60);
	if (minutes < 60) return `${minutes} min ago`;
	return new Date(timestamp).toLocaleTimeString([], {
		hour: '2-digit',
		minute: '2-digit',
	});
};

const StatusLine: React.FC<{ status: McpStatus }> = ({ status }) => {
	const [color, text] = status.error
		? ['bg-destructive', status.error]
		: status.running
			? ['bg-emerald-500', `Running on ${status.url}`]
			: ['bg-muted-foreground/50', 'Off'];

	return (
		<span className='flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground'>
			<span className={cn('size-1.5 shrink-0 rounded-full', color)} />
			<span className={cn('truncate', status.error && 'text-destructive')}>
				{text}
			</span>
			{status.running && status.lastClientAt && (
				<span className='shrink-0'>
					· last request {timeAgo(status.lastClientAt)}
				</span>
			)}
		</span>
	);
};

const Snippet: React.FC<{ snippet: McpClientSnippet }> = ({ snippet }) => (
	<div className='flex flex-col gap-1.5'>
		<p className='text-[11px] text-muted-foreground'>{snippet.hint}</p>
		<div className='relative'>
			<pre className='max-h-48 overflow-auto rounded-control border border-border bg-background p-2.5 pr-10 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all text-foreground/90'>
				{snippet.code}
			</pre>
			<Button
				variant='ghost'
				size='icon-xs'
				className='absolute top-1.5 right-1.5'
				aria-label={`Copy ${snippet.label} configuration`}
				onClick={() => void copy(snippet.code, 'Configuration')}
			>
				<Copy />
			</Button>
		</div>
	</div>
);

export const McpSettings: React.FC = () => {
	const bridge = getBeedlyBridge();
	const [status, setStatus] = useState<McpStatus | null>(null);
	const [portDraft, setPortDraft] = useState<string | null>(null);
	const [showToken, setShowToken] = useState(false);
	const [busy, setBusy] = useState(false);
	const [client, setClient] =
		useState<McpClientSnippet['id']>('claude-desktop');

	useEffect(() => {
		if (!bridge) return;
		let active = true;
		void bridge.mcp.getStatus().then((next) => {
			if (active) setStatus(next);
		});
		const unsubscribe = bridge.mcp.onStatus(setStatus);
		return () => {
			active = false;
			unsubscribe();
		};
	}, [bridge]);

	if (!bridge) return null;
	if (!status) {
		return (
			<div className='flex h-40 items-center justify-center'>
				<Spinner className='size-4 text-muted-foreground' />
			</div>
		);
	}

	const run = async (action: () => Promise<McpStatus>) => {
		setBusy(true);
		try {
			setStatus(await action());
		} catch (error) {
			toast.error('Could not update the MCP server', {
				description: errorMessage(error),
			});
		} finally {
			setBusy(false);
		}
	};

	const applyPort = () => {
		if (portDraft === null) return;
		const port = Number(portDraft);
		setPortDraft(null);
		if (port !== status.port) void run(() => bridge.mcp.setPort(port));
	};

	const snippets = mcpClientSnippets(status);
	const snippet = snippets.find((item) => item.id === client) ?? snippets[0];

	return (
		<div className='flex flex-col gap-4'>
			<label className='flex items-center justify-between gap-3'>
				<span className='flex min-w-0 flex-col gap-0.5'>
					<span className='text-[13px] text-foreground'>
						Allow other apps to control Karbonized
					</span>
					<StatusLine status={status} />
				</span>
				<Switch
					checked={status.enabled}
					disabled={busy}
					onCheckedChange={(checked) =>
						void run(() => bridge.mcp.setEnabled(checked))
					}
				/>
			</label>

			<p className='text-xs leading-relaxed text-muted-foreground'>
				Starts a local MCP server with the same tools Beedly uses, so Claude
				Desktop, Claude Code, Cursor and other MCP clients can read and edit the
				open project. Their changes can be undone like yours.
			</p>

			<div className='grid grid-cols-[96px_1fr] gap-3'>
				<div className='flex flex-col gap-1.5'>
					<Label
						htmlFor='mcp-port'
						className='text-xs font-normal text-muted-foreground'
					>
						Port
					</Label>
					<Input
						id='mcp-port'
						inputMode='numeric'
						className='font-mono'
						value={portDraft ?? String(status.port)}
						onChange={(event) => setPortDraft(event.target.value)}
						onBlur={applyPort}
						onKeyDown={(event) => {
							if (event.key === 'Enter') applyPort();
						}}
					/>
				</div>
				<div className='flex min-w-0 flex-col gap-1.5'>
					<Label className='text-xs font-normal text-muted-foreground'>
						Token
					</Label>
					<div className='flex gap-1'>
						<Input
							readOnly
							aria-label='Token'
							type={showToken ? 'text' : 'password'}
							value={status.token}
							className='min-w-0 flex-1 font-mono'
						/>
						<Button
							variant='ghost'
							size='icon'
							aria-label={showToken ? 'Hide token' : 'Show token'}
							onClick={() => setShowToken((current) => !current)}
						>
							{showToken ? <EyeOff /> : <Eye />}
						</Button>
						<Button
							variant='ghost'
							size='icon'
							aria-label='Copy token'
							onClick={() => void copy(status.token, 'Token')}
						>
							<Copy />
						</Button>
						<Button
							variant='ghost'
							size='icon'
							aria-label='Regenerate token'
							title='Regenerate token (connected clients need the new one)'
							disabled={busy}
							onClick={() => void run(() => bridge.mcp.regenerateToken())}
						>
							<RefreshCw />
						</Button>
					</div>
				</div>
			</div>

			<div className='flex flex-col gap-2 border-t border-border pt-4'>
				<div className='flex items-center justify-between gap-2'>
					<span className='text-xs text-muted-foreground'>
						Connect a client
					</span>
					<ToggleGroup
						type='single'
						variant='outline'
						size='sm'
						value={client}
						onValueChange={(value) =>
							value && setClient(value as McpClientSnippet['id'])
						}
					>
						{snippets.map((item) => (
							<ToggleGroupItem
								key={item.id}
								value={item.id}
								className='px-2.5 text-xs'
							>
								{item.label}
							</ToggleGroupItem>
						))}
					</ToggleGroup>
				</div>
				<Snippet snippet={snippet} />
			</div>

			<p className='flex items-start gap-1.5 text-[11px] leading-relaxed text-muted-foreground'>
				<ShieldCheck className='mt-px size-3.5 shrink-0' />
				Only apps on this computer that have the token can connect. Anyone with
				the token can edit your canvas, so keep it private and regenerate it if
				it leaks.
			</p>
		</div>
	);
};

export default McpSettings;
