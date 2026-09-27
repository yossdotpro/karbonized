import { CircleDashed, RotateCw, Search } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FixedSizeList } from 'react-window';
import { type Extension } from '../../models/Extension';
import { useWorkspaceStore, useControlsStore } from '../../stores';
import { getRandomNumber } from '../../utils/getRandom';
import { CustomCollapse } from '../CustomControls/CustomCollapse';

export const ExtensionPanel: React.FC = () => {
	/* Component State */
	const [extensions, setExtensions] = useState<Extension[]>([]);
	const [query, setQuery] = useState('');
	const [loading, setLoading] = useState(false);

	const controls = useMemo(() => {
		if (query === '') return [];

		return extensions
			.flatMap((ext) => ext.components as any[])
			.filter((item) =>
				(item.properties.name as string)
					.toUpperCase()
					.includes(query.toUpperCase()),
			);
	}, [extensions, query]);

	useEffect(() => {
		(window as any).electron.ipcRenderer.on(
			'extension_loaded',
			(event: any, extension: any) => {
				console.log(extension);
				setExtensions([...extensions, extension]);
			},
		);

		(window as any).electron.ipcRenderer.on(
			'loading_extensions',
			(event: any, state: any) => {
				setLoading(state);
			},
		);
	}, [extensions]);

	useEffect(() => {
		(window as any).electron.ipcRenderer.on(
			'extensions_loaded',
			(event: any, extensions: any) => {
				setExtensions(extensions);
			},
		);
	}, []);

	return (
		<div className='mt-1 flex flex-auto flex-col overflow-hidden'>
			{/* Header */}
			<div className='flex'>
				<div className='mb-2 flex'>
					<label className='my-auto ml-3 h-full select-none  text-xl font-bold'>
						Extensions
					</label>
					<label className='my-auto ml-2 rounded bg-primary px-2 py-0.5 text-xs text-white'>
						Beta
					</label>
				</div>

				<div
					className='hover:bg-accent mb-1 ml-auto rounded-control p-2 hover:cursor-pointer'
					onClick={() => {
						setExtensions([]);

						/* Reload Extension and App Data */
						(window as any).electron.ipcRenderer.sendMessage(
							'reloadExtensions',
							'',
						);
					}}
				>
					<RotateCw className='my-auto h-full' size={16}></RotateCw>
				</div>
			</div>

			<div className='flex gap-1 p-2'>
				<label className='my-auto text-xs'>Need extensions?</label>
				<a
					className='text-xs hover:text-blue-400'
					href='https://github.com/yossTheDev/karbonized'
				>
					See the docs
				</a>
			</div>

			{/* Search */}
			<div className='flex h-12 shrink-0 flex-row gap-2'>
				<Search className='my-auto ml-2 h-full' size={18}></Search>
				<Input
					placeholder='Search extensions…'
					className='my-auto w-full'
					onChange={(ev) => {
						setQuery(ev.target.value);
					}}
					value={query}
				></Input>
			</div>

			{loading && extensions.length === 0 ? (
				<div className=' my-auto  dark:text-neutral-300'>
					<CircleDashed
						size={56}
						className='mx-auto my-auto animate-spin text-muted-foreground'
					></CircleDashed>
				</div>
			) : (
				<>
					{extensions.length > 0 ? (
						<>
							{query === '' ? (
								<div className='mt-2 flex flex-col gap-1 overflow-y-auto'>
									{extensions.map((item) => (
										<CustomCollapse
											key={item.info.name}
											menu={
												<>
													<img
														className='my-auto ml-1 h-8 rounded-xl'
														src={item.logo}
													></img>
													<label className='my-auto p-2 hover:cursor-pointer'>
														{item.info.name}
													</label>
												</>
											}
										>
											<div className='flex h-96 max-h-full flex-wrap overflow-y-auto overflow-x-hidden'>
												<ItemsList data={item.components}></ItemsList>
											</div>
										</CustomCollapse>
									))}
								</div>
							) : (
								<div className='mt-2 flex h-full flex-wrap gap-2 overflow-y-auto overflow-x-hidden'>
									<div className='flex h-full w-full flex-col flex-wrap gap-2 overflow-y-auto overflow-x-hidden'>
										<ItemsList data={controls}></ItemsList>
									</div>
								</div>
							)}
						</>
					) : (
						<div className='flex flex-auto'>
							<p className='mx-auto my-auto select-none text-center text-xs text-muted-foreground'>
								No extensions installed
							</p>
						</div>
					)}
				</>
			)}

			{loading && extensions.length > 0 && (
				<div className='mt-2 dark:text-neutral-300'>
					<CircleDashed
						size={26}
						className='mx-auto my-auto animate-spin text-muted-foreground'
					></CircleDashed>
				</div>
			)}
		</div>
	);
};

const ItemsList = ({ data }: { data: any }) => {
	const currentWorkspace = useWorkspaceStore((state) => state.currentWorkspace);
	const addControl = useControlsStore((state) => state.addControl);
	const addInitialProperty = useControlsStore(
		(state) => state.addInitialProperty,
	);
	const getElementsByType = (type: string) => {
		return (
			currentWorkspace?.controls?.filter((item) => item.type === type).length ??
			0 + 1
		);
	};

	const handleAddItem = (code: string, name: string) => {
		const num = getRandomNumber();

		addInitialProperty(
			{ id: `${name}-${num}-code`, value: code },
			currentWorkspace?.id || '',
		);

		addControl(
			{
				type: 'custom',
				id: `${name}-${num}`,
				isSelectable: true,
				isDeleted: false,
				name: `${name} ${getElementsByType(name)}`,
				isVisible: true,
			},
			currentWorkspace?.id || '',
		);
	};
	const Row = ({ index, style }: { index: number; style: any }) => {
		return (
			<div
				onClick={() => {
					handleAddItem(data[index].code, data[index].properties.name);
				}}
				style={{ ...style, height: style.height - 5, top: style.top + 5 }}
				className='flex-r hover:bg-accent my-2 flex flex-auto select-none rounded-control bg-muted/50 hover:cursor-pointer'
			>
				{data[index].image.startsWith('data:image/') ? (
					<img
						className='my-auto ml-2 mr-auto h-6 w-6 select-none'
						src={data[index].image}
					></img>
				) : (
					<div
						className='my-auto ml-2 mr-auto h-6 w-6 select-none'
						dangerouslySetInnerHTML={{ __html: data[index].image }}
					></div>
				)}

				<label className='pointer-events-none my-auto ml-auto mr-2  text-xs'>
					{data[index].properties?.name}
				</label>
			</div>
		);
	};

	return (
		<AutoSizer>
			{({ height, width }: { height: number; width: number }) => (
				// @ts-ignore
				<FixedSizeList
					height={height}
					width={width}
					className='flex gap-2'
					itemCount={data.length}
					itemSize={55}
				>
					{Row}
				</FixedSizeList>
			)}
		</AutoSizer>
	);
};
