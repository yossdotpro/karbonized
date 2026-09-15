import { create } from 'zustand';
import { getRandomNumber } from '../utils/getRandom';
import type { Project, History } from '../types';

interface ProjectState {
	// Project state is mainly derived from other stores
}

interface ProjectActions {
	saveProject: (params: {
		currentWorkspace: any;
		currentWorkspaceID: string;
		controlProperties: History[];
	}) => Project;
	loadProject: (project: Project) => {
		newWorkspace: any;
		initialProperties: History[];
		workspaceId: string;
	};
}

type ProjectStore = ProjectState & ProjectActions;

export const useProjectStore = create<ProjectStore>((set, get) => ({
	saveProject: ({
		currentWorkspace,
		currentWorkspaceID,
		controlProperties,
	}) => {
		if (currentWorkspace) {
			const controls = currentWorkspace.controls.filter(
				(item: any) => !item.isDeleted,
			);
			const project: Project = {
				properties: controlProperties.filter(
					(item: any) =>
						item.workspace === currentWorkspaceID &&
						controls.find(
							(i: any) =>
								item.id.split('-')[0] + '-' + item.id.split('-')[1] === i.id,
						),
				),
				workspace: {
					...currentWorkspace,
					controls: currentWorkspace.controls.filter(
						(item: any) => !item.isDeleted,
					),
				},
			};
			return project;
		} else {
			const emptyProject: Project = {
				properties: [],
				workspace: {} as any,
			};
			return emptyProject;
		}
	},

	loadProject: (project) => {
		// Prepare a copy of the project
		let lastProp = '';
		let newID = getRandomNumber();
		const wId = getRandomNumber();
		const props: Array<{ id: string; value: any; workspace: string }> = [];
		const controls: any[] = [];

		project.workspace.controls.forEach((item) => {
			project.properties
				.filter((items) => items.id.startsWith(item.id))
				.forEach((prop) => {
					if (
						lastProp !==
						item.id.split('-')[0] + '-' + item.id.split('-')[1]
					) {
						newID = getRandomNumber();
						props.push({
							id: prop.id.replace(
								prop.id,
								prop.id.split('-')[0] +
									'-' +
									newID +
									'-' +
									prop.id.split('-')[2],
							),
							value: prop.value,
							workspace: wId.toString(),
						});

						lastProp = prop.id.split('-')[0] + '-' + prop.id.split('-')[1];

						const newItem = project.workspace.controls.find(
							(control) =>
								control.id ===
								prop.id.split('-')[0] + '-' + prop.id.split('-')[1],
						);

						if (newItem !== undefined) {
							controls.push({
								...newItem,
								id: prop.id.split('-')[0] + '-' + newID,
							});
						}
					} else {
						props.push({
							id: prop.id.replace(
								prop.id,
								prop.id.split('-')[0] +
									'-' +
									newID +
									'-' +
									prop.id.split('-')[2],
							),
							value: prop.value,
							workspace: wId.toString(),
						});

						lastProp = prop.id.split('-')[0] + '-' + prop.id.split('-')[1];
					}
				});
		});

		const copy: Project = {
			properties: props,
			workspace: {
				...project.workspace,
				id: wId.toString(),
				controls,
			},
		};

		// Return data to be handled by caller
		return {
			newWorkspace: {
				...copy.workspace,
				id: wId.toString(),
			},
			initialProperties: copy.properties,
			workspaceId: wId.toString(),
		};
	},
}));
