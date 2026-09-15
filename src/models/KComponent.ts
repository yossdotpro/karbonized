export interface KComponentManifest {
	name: string;
	author?: string;
	description?: string;
	version?: string;
	thumbnail?: string;
	category?: string;
	tags?: string[];
}

export interface KComponent {
	manifest: KComponentManifest;
	html: string;
	css: string;
	js: string;
}

export interface ImportedComponent {
	id: string;
	component: KComponent;
	preview?: string;
	importedAt: Date;
}
