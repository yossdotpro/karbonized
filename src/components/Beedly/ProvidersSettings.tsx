import React, { useState } from 'react';
import { toast } from 'sonner';
import {
	Check,
	ChevronDown,
	Eye,
	EyeOff,
	KeyRound,
	Plus,
	PlugZap,
	Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { PROVIDER_PRESETS, getPreset } from '@/lib/beedly/providers/presets';
import { type ProviderProfile, listModels } from '@/lib/beedly/core/client';
import type { ModelInfo } from '@/lib/beedly/core/types';
import { getKeyStore } from '@/lib/beedly/keys';
import { getTransport, useBeedlySettings } from '@/lib/beedly/settings';

const errorMessage = (error: unknown) =>
	error instanceof Error ? error.message : String(error);

const Field: React.FC<{
	label: string;
	htmlFor?: string;
	hint?: React.ReactNode;
	children: React.ReactNode;
}> = ({ label, htmlFor, hint, children }) => (
	<div className='flex flex-col gap-1.5'>
		<Label
			htmlFor={htmlFor}
			className='text-xs font-normal text-muted-foreground'
		>
			{label}
		</Label>
		{children}
		{hint && <p className='text-[11px] text-muted-foreground'>{hint}</p>}
	</div>
);

const ApiKeyField: React.FC<{ profile: ProviderProfile }> = ({ profile }) => {
	const preset = getPreset(profile.kind);
	const hasKey = useBeedlySettings((state) =>
		state.profilesWithKey.includes(profile.id),
	);
	const saveKey = useBeedlySettings((state) => state.saveKey);
	const removeKey = useBeedlySettings((state) => state.removeKey);

	const [draft, setDraft] = useState('');
	const [visible, setVisible] = useState(false);
	const [editing, setEditing] = useState(false);
	const [saving, setSaving] = useState(false);

	const showInput = !hasKey || editing;
	const storage = getKeyStore().readable
		? 'Stored in this browser only.'
		: 'Encrypted with your system keychain. Never shown to the page.';

	const save = async () => {
		if (draft.trim() === '') return;
		setSaving(true);
		try {
			await saveKey(profile.id, draft);
			setDraft('');
			setEditing(false);
			setVisible(false);
		} catch (error) {
			toast.error('Could not save the API key', {
				description: errorMessage(error),
			});
		} finally {
			setSaving(false);
		}
	};

	return (
		<Field
			label={preset.requiresKey ? 'API key' : 'API key (optional)'}
			htmlFor={`key-${profile.id}`}
			hint={
				<>
					{storage}
					{preset.keyUrl && (
						<>
							{' '}
							<a
								href={preset.keyUrl}
								target='_blank'
								rel='noreferrer'
								className='underline underline-offset-2 hover:text-foreground'
							>
								Get a key
							</a>
						</>
					)}
				</>
			}
		>
			{showInput ? (
				<form
					className='flex gap-2'
					onSubmit={(event) => {
						event.preventDefault();
						void save();
					}}
				>
					<div className='relative flex-1'>
						<Input
							id={`key-${profile.id}`}
							type={visible ? 'text' : 'password'}
							autoComplete='off'
							spellCheck={false}
							placeholder={preset.keyPlaceholder ?? 'Key'}
							value={draft}
							onChange={(event) => setDraft(event.target.value)}
							className='pr-8 font-mono'
						/>
						<Button
							type='button'
							variant='ghost'
							size='icon-xs'
							className='absolute top-1 right-1'
							onClick={() => setVisible((current) => !current)}
							aria-label={visible ? 'Hide key' : 'Show key'}
						>
							{visible ? <EyeOff /> : <Eye />}
						</Button>
					</div>
					<Button
						type='submit'
						size='default'
						variant='outline'
						disabled={draft.trim() === '' || saving}
					>
						{saving ? <Spinner className='size-3.5' /> : <Check />}
						Save
					</Button>
					{hasKey && (
						<Button
							type='button'
							variant='ghost'
							onClick={() => {
								setEditing(false);
								setDraft('');
							}}
						>
							Cancel
						</Button>
					)}
				</form>
			) : (
				<div className='flex h-8 items-center gap-2 rounded-control border border-border bg-muted/40 px-2.5'>
					<KeyRound className='size-3.5 text-muted-foreground' />
					<span className='font-mono text-[13px] tracking-widest text-muted-foreground'>
						••••••••••••
					</span>
					<Badge variant='secondary' className='ml-1'>
						Saved
					</Badge>
					<div className='ml-auto flex gap-1'>
						<Button variant='ghost' size='xs' onClick={() => setEditing(true)}>
							Replace
						</Button>
						<Button
							variant='ghost'
							size='xs'
							onClick={() =>
								void removeKey(profile.id).catch((error) =>
									toast.error('Could not remove the API key', {
										description: errorMessage(error),
									}),
								)
							}
						>
							Remove
						</Button>
					</div>
				</div>
			)}
		</Field>
	);
};

const ModelField: React.FC<{ profile: ProviderProfile }> = ({ profile }) => {
	const updateProfile = useBeedlySettings((state) => state.updateProfile);
	const [models, setModels] = useState<ModelInfo[] | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const load = async () => {
		setLoading(true);
		setError(null);
		try {
			setModels(await listModels(profile, getTransport()));
		} catch (loadError) {
			setModels(null);
			setError(errorMessage(loadError));
		} finally {
			setLoading(false);
		}
	};

	return (
		<Field
			label='Model'
			htmlFor={`model-${profile.id}`}
			hint={error && <span className='text-destructive'>{error}</span>}
		>
			<div className='flex gap-2'>
				<Input
					id={`model-${profile.id}`}
					value={profile.model}
					spellCheck={false}
					placeholder='Model id'
					className='flex-1 font-mono'
					onChange={(event) =>
						updateProfile(profile.id, { model: event.target.value })
					}
				/>
				<DropdownMenu
					onOpenChange={(open) => {
						if (open && models === null && !loading) void load();
					}}
				>
					<DropdownMenuTrigger asChild>
						<Button variant='outline'>
							Browse
							<ChevronDown className='size-3.5' />
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent
						align='end'
						className='max-h-72 w-72 overflow-y-auto'
					>
						<DropdownMenuLabel className='flex items-center justify-between'>
							Models
							{loading && <Spinner className='size-3' />}
						</DropdownMenuLabel>
						{models?.length === 0 && (
							<p className='px-2 py-1.5 text-xs text-muted-foreground'>
								No models found.
							</p>
						)}
						{error && (
							<p className='px-2 py-1.5 text-xs text-destructive'>
								Could not load models.
							</p>
						)}
						{models?.map((model) => (
							<DropdownMenuItem
								key={model.id}
								onSelect={() => updateProfile(profile.id, { model: model.id })}
								className='flex flex-col items-start gap-0'
							>
								<span className='font-mono text-xs'>{model.id}</span>
								{model.label && model.label !== model.id && (
									<span className='text-[11px] text-muted-foreground'>
										{model.label}
									</span>
								)}
							</DropdownMenuItem>
						))}
					</DropdownMenuContent>
				</DropdownMenu>
			</div>
		</Field>
	);
};

const ProfileForm: React.FC<{ profile: ProviderProfile }> = ({ profile }) => {
	const preset = getPreset(profile.kind);
	const activeProfileId = useBeedlySettings((state) => state.activeProfileId);
	const updateProfile = useBeedlySettings((state) => state.updateProfile);
	const removeProfile = useBeedlySettings((state) => state.removeProfile);
	const setActiveProfile = useBeedlySettings((state) => state.setActiveProfile);
	const [testing, setTesting] = useState(false);

	const testConnection = async () => {
		setTesting(true);
		try {
			const models = await listModels(profile, getTransport());
			toast.success(`Connected to ${profile.name}`, {
				description: `${models.length} model${models.length === 1 ? '' : 's'} available.`,
			});
		} catch (error) {
			toast.error(`Could not connect to ${profile.name}`, {
				description: errorMessage(error),
			});
		} finally {
			setTesting(false);
		}
	};

	return (
		<div className='flex flex-col gap-4'>
			<div className='grid grid-cols-2 gap-3'>
				<Field label='Name' htmlFor={`name-${profile.id}`}>
					<Input
						id={`name-${profile.id}`}
						value={profile.name}
						onChange={(event) =>
							updateProfile(profile.id, { name: event.target.value })
						}
					/>
				</Field>
				<Field label='Provider'>
					<div className='flex h-8 items-center gap-2 px-0.5 text-[13px]'>
						{preset.label}
						{preset.local && <Badge variant='outline'>Local</Badge>}
					</div>
				</Field>
			</div>

			<Field
				label='Base URL'
				htmlFor={`url-${profile.id}`}
				hint={
					profile.baseUrl !== preset.defaultBaseUrl && (
						<button
							type='button'
							className='underline underline-offset-2 hover:text-foreground'
							onClick={() =>
								updateProfile(profile.id, { baseUrl: preset.defaultBaseUrl })
							}
						>
							Reset to {preset.defaultBaseUrl}
						</button>
					)
				}
			>
				<Input
					id={`url-${profile.id}`}
					value={profile.baseUrl}
					spellCheck={false}
					placeholder={preset.defaultBaseUrl}
					className='font-mono'
					onChange={(event) =>
						updateProfile(profile.id, { baseUrl: event.target.value })
					}
				/>
			</Field>

			<ApiKeyField profile={profile} />
			<ModelField profile={profile} />

			<label className='flex items-center justify-between gap-3'>
				<span className='flex flex-col'>
					<span className='text-[13px] text-foreground'>
						Model accepts images
					</span>
					<span className='text-[11px] text-muted-foreground'>
						Lets Beedly look at the canvas to check its work.
					</span>
				</span>
				<Switch
					checked={profile.supportsImages}
					onCheckedChange={(checked) =>
						updateProfile(profile.id, { supportsImages: checked })
					}
				/>
			</label>

			<div className='flex items-center gap-2 border-t border-border pt-4'>
				<Button
					variant='ghost'
					size='sm'
					className='text-destructive hover:text-destructive'
					onClick={() => void removeProfile(profile.id)}
				>
					<Trash2 />
					Remove
				</Button>
				<div className='ml-auto flex gap-2'>
					<Button
						variant='outline'
						size='sm'
						onClick={() => void testConnection()}
						disabled={testing}
					>
						{testing ? <Spinner className='size-3.5' /> : <PlugZap />}
						Test connection
					</Button>
					<Button
						size='sm'
						disabled={activeProfileId === profile.id}
						onClick={() => setActiveProfile(profile.id)}
					>
						{activeProfileId === profile.id ? 'In use' : 'Use for Beedly'}
					</Button>
				</div>
			</div>
		</div>
	);
};

export const ProvidersSettings: React.FC = () => {
	const profiles = useBeedlySettings((state) => state.profiles);
	const activeProfileId = useBeedlySettings((state) => state.activeProfileId);
	const addProfile = useBeedlySettings((state) => state.addProfile);
	const [selectedId, setSelectedId] = useState<string | null>(null);

	const selected =
		profiles.find((profile) => profile.id === selectedId) ??
		profiles.find((profile) => profile.id === activeProfileId) ??
		profiles[0];

	const addMenu = (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant='outline' size='sm' className='w-full'>
					<Plus />
					Add provider
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align='start' className='w-52'>
				{PROVIDER_PRESETS.map((preset) => (
					<DropdownMenuItem
						key={preset.kind}
						onSelect={() => setSelectedId(addProfile(preset.kind).id)}
					>
						{preset.label}
						{preset.local && (
							<span className='ml-auto text-[11px] text-muted-foreground'>
								Local
							</span>
						)}
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);

	if (!selected) {
		return (
			<div className='flex flex-col items-center gap-3 py-10 text-center'>
				<p className='text-[13px] text-foreground'>No providers yet</p>
				<p className='max-w-xs text-xs text-muted-foreground'>
					Connect Anthropic, OpenAI, Gemini, OpenRouter or a local model with
					Ollama or LM Studio.
				</p>
				<div className='w-44'>{addMenu}</div>
			</div>
		);
	}

	return (
		<div className='flex min-h-[380px] gap-4'>
			<div className='flex w-44 shrink-0 flex-col gap-1'>
				{profiles.map((profile) => (
					<button
						key={profile.id}
						type='button'
						onClick={() => setSelectedId(profile.id)}
						className={cn(
							'flex flex-col items-start rounded-control px-2.5 py-1.5 text-left transition-colors hover:bg-accent',
							profile.id === selected.id && 'bg-accent',
						)}
					>
						<span className='flex w-full items-center gap-1.5 text-[13px] text-foreground'>
							<span className='truncate'>{profile.name}</span>
							{profile.id === activeProfileId && (
								<span
									className='ml-auto size-1.5 shrink-0 rounded-full bg-emerald-500'
									aria-label='In use'
								/>
							)}
						</span>
						<span className='w-full truncate font-mono text-[11px] text-muted-foreground'>
							{profile.model || getPreset(profile.kind).label}
						</span>
					</button>
				))}
				<div className='mt-2'>{addMenu}</div>
			</div>

			<div className='min-w-0 flex-1 border-l border-border pl-4'>
				<ProfileForm key={selected.id} profile={selected} />
			</div>
		</div>
	);
};
