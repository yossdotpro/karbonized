/**
 * File Handler for Blocks API
 * Provides utilities for file uploads, image processing, and file management
 */

export interface FileInfo {
	id: string;
	name: string;
	type: string;
	size: number;
	url: string;
	dataUrl?: string; // For images and small files
	lastModified: number;
}

export interface FileUploadOptions {
	accept?: string[];
	multiple?: boolean;
	maxSize?: number;
	maxFiles?: number;
	convertToDataUrl?: boolean; // Convert images to data URLs
}

export interface FileHandlerAPI {
	uploadFile: (options?: FileUploadOptions) => Promise<FileInfo | FileInfo[]>;
	removeFile: (fileId: string) => void;
	getFile: (fileId: string) => FileInfo | null;
	getAllFiles: () => FileInfo[];
	clearFiles: () => void;
	validateFile: (file: File, options?: FileUploadOptions) => boolean;
	convertToDataUrl: (file: File) => Promise<string>;
	optimizeImage: (
		dataUrl: string,
		options?: ImageOptimizationOptions,
	) => Promise<string>;
}

export interface ImageOptimizationOptions {
	maxWidth?: number;
	maxHeight?: number;
	quality?: number; // 0-1
	format?: 'jpeg' | 'png' | 'webp';
}

// In-memory file storage (in a real app, this would be persisted)
const fileStorage = new Map<string, FileInfo>();

/**
 * Create a file handler API instance
 */
export const createFileHandler = (): FileHandlerAPI => {
	const uploadFile = async (
		options: FileUploadOptions = {},
	): Promise<FileInfo | FileInfo[]> => {
		return new Promise((resolve, reject) => {
			const input = document.createElement('input');
			input.type = 'file';
			input.style.position = 'fixed';
			input.style.left = '-9999px';
			input.style.top = '-9999px';
			input.style.opacity = '0';

			if (options.accept) {
				input.accept = options.accept.join(',');
			}

			if (options.multiple) {
				input.multiple = true;
			}

			const cleanup = (): void => {
				input.onchange = null;
				if (input.parentNode) {
					input.parentNode.removeChild(input);
				}
			};

			input.onchange = async (event) => {
				const files = Array.from(
					(event.target as HTMLInputElement).files || [],
				);

				if (files.length === 0) {
					cleanup();
					reject(new Error('No files selected'));
					return;
				}

				if (options.maxFiles && files.length > options.maxFiles) {
					cleanup();
					reject(new Error(`Maximum ${options.maxFiles} files allowed`));
					return;
				}

				try {
					const processedFiles: FileInfo[] = [];

					for (const file of files) {
						if (!validateFile(file, options)) {
							continue;
						}

						const fileInfo: FileInfo = {
							id: `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
							name: file.name,
							type: file.type,
							size: file.size,
							url: URL.createObjectURL(file),
							lastModified: file.lastModified,
						};

						// Convert to data URL for images if requested
						if (
							(options.convertToDataUrl || file.type.startsWith('image/')) &&
							file.size <= 5 * 1024 * 1024
						) {
							// 5MB limit
							try {
								fileInfo.dataUrl = await convertToDataUrl(file);
							} catch (error) {
								console.warn('Failed to convert file to data URL:', error);
							}
						}

						fileStorage.set(fileInfo.id, fileInfo);
						processedFiles.push(fileInfo);
					}

					if (processedFiles.length === 0) {
						cleanup();
						reject(new Error('No valid files selected'));
						return;
					}

					cleanup();
					resolve(options.multiple ? processedFiles : processedFiles[0]);
				} catch (error) {
					cleanup();
					reject(error);
				}
			};

			document.body.appendChild(input);
			input.click();
		});
	};

	const removeFile = (fileId: string): void => {
		const file = fileStorage.get(fileId);
		if (file) {
			// Clean up object URL
			if (file.url.startsWith('blob:')) {
				URL.revokeObjectURL(file.url);
			}
			fileStorage.delete(fileId);
		}
	};

	const getFile = (fileId: string): FileInfo | null => {
		return fileStorage.get(fileId) || null;
	};

	const getAllFiles = (): FileInfo[] => {
		return Array.from(fileStorage.values());
	};

	const clearFiles = (): void => {
		// Clean up all object URLs
		fileStorage.forEach((file) => {
			if (file.url.startsWith('blob:')) {
				URL.revokeObjectURL(file.url);
			}
		});
		fileStorage.clear();
	};

	const validateFile = (
		file: File,
		options: FileUploadOptions = {},
	): boolean => {
		// Check file size
		if (options.maxSize && file.size > options.maxSize) {
			console.warn(
				`File ${file.name} exceeds maximum size of ${options.maxSize} bytes`,
			);
			return false;
		}

		// Check file type
		if (options.accept && options.accept.length > 0) {
			const isAccepted = options.accept.some((acceptType) => {
				if (acceptType.startsWith('.')) {
					// File extension
					return file.name.toLowerCase().endsWith(acceptType.toLowerCase());
				} else if (acceptType.includes('*')) {
					// MIME type wildcard
					const mimePattern = acceptType.replace('*', '.*');
					return new RegExp(mimePattern).test(file.type);
				} else {
					// Exact MIME type
					return file.type === acceptType;
				}
			});

			if (!isAccepted) {
				console.warn(
					`File ${file.name} (${file.type}) is not an accepted type`,
				);
				return false;
			}
		}

		return true;
	};

	const convertToDataUrl = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = () => resolve(reader.result as string);
			reader.onerror = () => reject(new Error('Failed to read file'));
			reader.readAsDataURL(file);
		});
	};

	const optimizeImage = async (
		dataUrl: string,
		options: ImageOptimizationOptions = {},
	): Promise<string> => {
		return new Promise((resolve, reject) => {
			const img = new Image();
			img.onload = () => {
				const canvas = document.createElement('canvas');
				const ctx = canvas.getContext('2d');

				if (!ctx) {
					reject(new Error('Failed to get canvas context'));
					return;
				}

				// Calculate new dimensions
				let { width, height } = img;
				const {
					maxWidth = width,
					maxHeight = height,
					quality = 0.8,
					format = 'jpeg',
				} = options;

				if (width > maxWidth) {
					height = (height * maxWidth) / width;
					width = maxWidth;
				}

				if (height > maxHeight) {
					width = (width * maxHeight) / height;
					height = maxHeight;
				}

				canvas.width = width;
				canvas.height = height;

				// Draw and optimize image
				ctx.drawImage(img, 0, 0, width, height);

				const mimeType = `image/${format}`;
				canvas.toBlob(
					(blob) => {
						if (blob) {
							const reader = new FileReader();
							reader.onload = () => resolve(reader.result as string);
							reader.onerror = () =>
								reject(new Error('Failed to convert optimized image'));
							reader.readAsDataURL(blob);
						} else {
							reject(new Error('Failed to create blob from canvas'));
						}
					},
					mimeType,
					quality,
				);
			};

			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = dataUrl;
		});
	};

	return {
		uploadFile,
		removeFile,
		getFile,
		getAllFiles,
		clearFiles,
		validateFile,
		convertToDataUrl,
		optimizeImage,
	};
};

/**
 * Default file handler instance
 */
export const fileHandler = createFileHandler();

/**
 * Utility functions for common file operations
 */
export const fileUtils = {
	/**
	 * Get file extension from filename
	 */
	getExtension: (filename: string): string => {
		return filename
			.slice(((filename.lastIndexOf('.') - 1) >>> 0) + 2)
			.toLowerCase();
	},

	/**
	 * Format file size in human readable format
	 */
	formatFileSize: (bytes: number): string => {
		if (bytes === 0) return '0 Bytes';
		const k = 1024;
		const sizes = ['Bytes', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
	},

	/**
	 * Check if file is an image
	 */
	isImage: (file: File | FileInfo): boolean => {
		const mimeType = file.type || (file as File).type;
		return mimeType.startsWith('image/');
	},

	/**
	 * Check if file is a video
	 */
	isVideo: (file: File | FileInfo): boolean => {
		const mimeType = file.type || (file as File).type;
		return mimeType.startsWith('video/');
	},

	/**
	 * Check if file is an audio file
	 */
	isAudio: (file: File | FileInfo): boolean => {
		const mimeType = file.type || (file as File).type;
		return mimeType.startsWith('audio/');
	},

	/**
	 * Get MIME type from file extension
	 */
	getMimeType: (extension: string): string => {
		const mimeTypes: Record<string, string> = {
			jpg: 'image/jpeg',
			jpeg: 'image/jpeg',
			png: 'image/png',
			gif: 'image/gif',
			webp: 'image/webp',
			svg: 'image/svg+xml',
			pdf: 'application/pdf',
			txt: 'text/plain',
			json: 'application/json',
			mp4: 'video/mp4',
			webm: 'video/webm',
			mp3: 'audio/mpeg',
			wav: 'audio/wav',
			zip: 'application/zip',
		};
		return mimeTypes[extension.toLowerCase()] || 'application/octet-stream';
	},
};
