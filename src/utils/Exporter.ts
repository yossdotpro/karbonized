import { toJpeg, toPng, toSvg } from 'html-to-image';
import { isNative } from './isNative';
import { Base64Binary } from './Base64Utils';
import { save } from '@tauri-apps/api/dialog';
import { writeBinaryFile, writeTextFile } from '@tauri-apps/api/fs';

export enum export_format {
	png,
	svg,
	jpeg,
}

export const ExportImage = (
	name: string,
	ref: HTMLElement | null,
	type: export_format,
): void => {
	if (ref === null) {
		return;
	}

	// Trigger export start event for HTML blocks
	window.dispatchEvent(
		new CustomEvent('html-block-export', { detail: 'export-start' }),
	);

	console.log('render');

	// Small delay to allow HTML blocks to switch to export mode
	setTimeout(() => {
		switch (type) {
			case export_format.png:
				toPng(ref, {
					cacheBust: true,
				})
					.then(async (dataUrl) => {
						const inNativePl = await isNative();

						if (!inNativePl) {
							const link = document.createElement('a');
							link.download = name + '.png';
							link.href = dataUrl;
							link.click();
						} else {
							try {
								const img = Base64Binary.decodeArrayBuffer(
									dataUrl.replace('data:image/png;base64,', ''),
								);

								const filePath = await save({
									defaultPath: name + '.png',
									filters: [
										{
											name: 'Image',
											extensions: ['png', 'jpeg'],
										},
									],
								});

								if (filePath !== null) {
									await writeBinaryFile(filePath, img);
								}
							} catch (err) {
								console.log(err);
							}
						}
					})
					.catch((err) => {
						console.log(err);
					})
					.finally(() => {
						// Trigger export end event for HTML blocks
						window.dispatchEvent(
							new CustomEvent('html-block-export', { detail: 'export-end' }),
						);
					});
				break;

			case export_format.jpeg:
				toJpeg(ref, {
					cacheBust: true,
				})
					.then(async (dataUrl) => {
						const inNativePl = await isNative();

						if (!inNativePl) {
							const link = document.createElement('a');
							link.download = name + '.jpeg';
							link.href = dataUrl;
							link.click();
						} else {
							try {
								const img = Base64Binary.decodeArrayBuffer(
									dataUrl.replace('data:image/jpeg;base64,', ''),
								);

								const filePath = await save({
									defaultPath: name + '.jpeg',
									filters: [
										{
											name: 'Image',
											extensions: ['png', 'jpeg'],
										},
									],
								});

								if (filePath !== null) {
									await writeBinaryFile(filePath, img);
								}
							} catch (err) {
								console.log(err);
							}
						}
					})
					.catch((err) => {
						console.log(err);
					})
					.finally(() => {
						// Trigger export end event for HTML blocks
						window.dispatchEvent(
							new CustomEvent('html-block-export', { detail: 'export-end' }),
						);
					});
				break;

			case export_format.svg:
				toSvg(ref, {
					cacheBust: true,
				})
					.then(async (dataUrl) => {
						const inNativePl = await isNative();

						if (!inNativePl) {
							const link = document.createElement('a');
							link.download = name + '.svg';
							link.href = dataUrl;
							link.click();
						} else {
							try {
								Base64Binary.decodeArrayBuffer(
									dataUrl.replace('data:image/svg+xml;charset=utf-8,', ''),
								);

								const filePath = await save({
									defaultPath: name + '.svg',
									filters: [
										{
											name: 'Image',
											extensions: ['png', 'jpeg', 'svg'],
										},
									],
								});

								if (filePath !== null) {
									await writeTextFile(filePath, dataUrl);
								}
							} catch (err) {
								console.log(err);
							}
						}
					})
					.catch((err) => {
						console.log(err);
					})
					.finally(() => {
						// Trigger export end event for HTML blocks
						window.dispatchEvent(
							new CustomEvent('html-block-export', { detail: 'export-end' }),
						);
					});
				break;
		}
	}, 200); // 200ms delay for HTML blocks to switch mode
};
