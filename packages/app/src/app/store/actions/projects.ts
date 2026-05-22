// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Project CRUD, export, automations, DnD.
 */
import { translate } from "@stacks/translations";
import { Intent } from "@blueprintjs/core";
import { produce } from "immer";
import { cloneDeep } from "lodash";
import xor from "lodash/xor";
import { DropResult } from "@hello-pangea/dnd";
import { IAutomation, IField, IProject, IUpdate, PROJECTHEALTH } from "@stacks/types";
import { ExportAPI, ProjectsAPI } from "app/api";
import { getCurrentProjectId, nav, publish } from "app/hooks";
import { IProjectsStore, ProjectsStore } from "app/store/projects";
import Dialog from "app/utils/dialog";
import { getStorage, setStorage } from "app/utils/storage";
import Toast from "app/utils/toast";
import { upsertById } from "../actionHelpers";
import { ProjectFiltersActions } from "./projectFilters";
import { ProjectsStatusActions } from "./projectsStatus";
import { cleanupResourceNavigationRefs } from "./resourceNavigationCleanup";
import { StacksActions } from "./stacks";
import { TasksActions } from "./tasks";

interface ProjectLoadingOptions {
    silent?: boolean;
    force?: boolean;
}

/**
 * Loads a specific set of projects from the database and add it to the store
 * @param projectIds
 * @returns
 */
const load = async (
    projectIds: string[],
    { silent, force }: ProjectLoadingOptions = {}
): Promise<IProject[]> => {
    const loadingProjects = ProjectsStatusActions.loadingProjects();
    const loadedProjects = ProjectsStatusActions.loadedProjects();
    const projectsToLoad =
        force === true
            ? projectIds
            : projectIds.filter(
                  projectId => !loadingProjects.includes(projectId) && !loadedProjects.includes(projectId)
              );

    if (projectsToLoad.length === 0) return [];

    if (silent !== true) {
        ProjectsStatusActions.setLoading(projectsToLoad, true);
    }

    const projects: IProject[] = [];

    for (const projectId of projectsToLoad) {
        const project: IProject = await ProjectsAPI.load(projectId);
        projects.push(project);

        await StacksActions.load(projectId);
    }

    if (projects.length) {
        upsertProjects(projects);
    }

    if (silent !== true) {
        ProjectsStatusActions.setLoading(projectIds, false);
    }

    return projects;
};

const loadOne = async (projectId: string, options?: ProjectLoadingOptions) => {
    try {
        const loadedProject = await load([projectId], options);
        // make sure the project still exists
        if (loadedProject.length > 0) {
            await ProjectFiltersActions.restore();
            await TasksActions.loadByProject(projectId);
        }
        // if the project is missing the we're redirecting to main
    } catch {
        // if we have this project in the store, remove it
        // we might not have access to it any more
        const project = ProjectsStore.get().projects.find(project => project.id === projectId);
        if (project) {
            await removeById(project.id);
        }

        nav("/");
    }
};

/**
 * Reloads a project triggered by the SSE event
 * @param activity
 */
const reloadProject = async (update: IUpdate, hasPermissions: boolean) => {
    if (hasPermissions) {
        await loadOne(update.record, { force: true, silent: true });
    } else {
        await removeById(update.record);
    }
};

/**
 * Updates a project in the store based on a partial project data. Then it updates it in the database as well
 * @param projectId
 * @param updatedProject
 * @returns
 */
const update = async (projectId: string, projectData: Partial<IProject>, skipAPI?: boolean) => {
    // set the updated date on the new chunk of data
    const updatedProjectData: Partial<IProject> = {
        ...projectData,
        updated: new Date(),
    };

    // check if the project is loaded in the store
    // otherwise load it
    const project = await getProject(projectId);
    if (!project) return;

    // update the local project in the store
    ProjectsStore.set(
        produce((state: IProjectsStore) => {
            state.projects = state.projects.map((project: IProject) => {
                if (project.id === projectId) return { ...project, ...updatedProjectData };
                return project;
            });
        })
    );

    // save it in the database
    if (!skipAPI) {
        await ProjectsAPI.update(projectId, updatedProjectData);
    }

    const updatedProject = await getProject(projectId);
    publish("project:updated", updatedProject);

    return updatedProject;
};

/**
 * Inserts or updates multiple projects from the store
 * @param projects
 */
const upsertProjects = (projects: IProject[]) => {
    ProjectsStore.set(
        produce((state: IProjectsStore) => {
            state.projects = upsertById(state.projects, projects);
        })
    );
};

/**
 * Retrieves a project based on the id from the store
 * @param projectId
 * @returns
 */
const getProject = async (projectId: string): Promise<IProject | undefined> => {
    // get the project directly from the store
    const localProject = ProjectsStore.get().projects.find(project => project.id === projectId);
    if (localProject) return localProject;

    // if not found try loading it from the database
    const loadedProjects = await load([projectId]);
    if (!loadedProjects.length) return;

    return loadedProjects.find(project => project.id === projectId);
};

/**
 * Returns the current project
 * @returns
 */
const getCurrentProject = (): IProject | undefined => {
    const projectId = getCurrentProjectId();
    const { projects } = ProjectsStore.get();
    return projects.find(project => project.id === projectId);
};

const removeField = async (fieldId: string) => {
    const confirm = await Dialog.confirm(
        "Delete field",
        "Are you sure you want to delete this custom field? Any saved value in task details for this field will also be lost!"
    );

    if (!confirm) return;

    const project = getCurrentProject();
    if (!project) return [];

    await update(project.id, {
        fields: project.fields.filter((f: IField) => f.id !== fieldId),
    });
};

const reorderFields = async (fieldId: string, toIndex: number) => {
    const project = cloneDeep(getCurrentProject());
    if (!project) return [];

    const movedField = project.fields.find((f: IField) => f.id === fieldId);
    const movedIndex = project.fields.findIndex((f: IField) => f.id === fieldId);

    if (movedField) {
        project.fields.splice(movedIndex, 1);
        project.fields.splice(toIndex, 0, movedField);
    }

    await update(project.id, {
        fields: project.fields,
    });
};

/**
 * Inserts or updates an automation
 * @param automation
 */
const upsertAutomation = async (automation: IAutomation) => {
    const project = cloneDeep(getCurrentProject());
    if (!project) return;

    if (project.automations == null) {
        project.automations = [];
    }

    // update
    if (project.automations.some(atm => atm.id === automation.id)) {
        project.automations = project.automations.map((a: IAutomation) => {
            if (a.id === automation.id) {
                return automation;
            }
            return a;
        });
    }

    // insert
    else {
        project.automations.push(automation);
    }

    await update(project.id, { automations: project.automations });
};

/**
 * Removes an automation from the current project
 * @param automationId
 * @returns
 */
const removeAutomation = async (automationId: string) => {
    const project = getCurrentProject();
    if (!project) return;

    await update(project.id, {
        automations: project.automations.filter((a: IAutomation) => a.id !== automationId),
    });
};

/**
 * Reorders the current project's automations
 * @param result
 * @returns
 */
const reorderAutomations = async (result: DropResult) => {
    if (!result.destination) return;
    const project = cloneDeep(getCurrentProject());
    if (!project) return;

    const movedAutomation = { ...project.automations[result.source.index] };

    project.automations.splice(result.source.index, 1);
    project.automations.splice(result.destination!.index, 0, movedAutomation);

    await update(project.id, {
        automations: project.automations,
    });
};

/**
 * Removes a specific project
 * @param projectId
 * @returns
 */
const removeById = async (projectId: string) => {
    await cleanupResourceNavigationRefs(projectId);

    ProjectsStore.set(
        produce((state: IProjectsStore) => {
            state.projects = state.projects.filter((project: IProject) => project.id !== projectId);
        })
    );

    if (window.location.hash.includes(projectId)) {
        nav("/");
    }
};

/**
 * Toggles wether the current project is favorite or not
 * @returns
 */
const toggleFavorite = () => {
    const project = getCurrentProject();
    if (!project) return false;

    const favoriteProjects = getStorage("favoriteProjects", true, []);
    const favorites = xor(favoriteProjects, [project.id]);

    setStorage("favoriteProjects", favorites);
};

/**
 * Sets the project description
 * @param projectId
 * @param description
 * @returns
 */
const setDescription = async (projectId: string, description: string) => {
    return await update(projectId, { description });
};

/**
 * Sets the project notes
 * @param projectId
 * @param notes
 * @returns
 */
const setNotes = async (projectId: string, notes: string) => {
    return await update(projectId, { notes });
};

/**
 * Sets the project health
 * @param projectId
 * @param health
 * @returns
 */
const setHealth = async (projectId: string, health?: PROJECTHEALTH) => {
    return await update(projectId, { health });
};

const setBackgroundUrl = async (backgroundUrl?: string) => {
    const project = getCurrentProject();
    if (!project) return false;
    return await update(project.id, { backgroundUrl });
};

/**
 * Sets the project hourly rate
 * @param hourlyRate
 * @param currency
 * @returns
 */
const setHourlyRate = async (hourlyRate: number | undefined, currency?: string) => {
    const project = getCurrentProject();
    if (!project) return false;
    return await update(project.id, { hourlyRate, currency });
};

const upsertField = async (field: IField) => {
    const project = cloneDeep(getCurrentProject());
    if (!project) return false;

    if (project.fields == null) {
        project.fields = [];
    }

    // update
    if (project.fields.some(f => f.id === field.id)) {
        project.fields = project.fields.map((f: IField) => {
            if (f.id === field.id) {
                return field;
            }
            return f;
        });
    }

    // insert
    else {
        project.fields.push(field);
    }

    return await update(project.id, {
        fields: project.fields,
    });
};

/**
 * Sets the project start date
 * @param startDate
 * @returns
 */
const setStartDate = async (startDate: Date | null) => {
    const project = getCurrentProject();
    if (!project) return false;
    return await update(project.id, { startDate });
};

/**
 * Sets the project end date
 * @param endDate
 * @returns
 */
const setEndDate = async (endDate: Date | null) => {
    const project = getCurrentProject();
    if (!project) return false;
    return await update(project.id, { endDate });
};

const setCompany = async (company: string) => {
    const project = getCurrentProject();
    if (!project) return false;
    return await update(project.id, { company });
};

const setOwner = async (projectOwner?: string) => {
    const project = getCurrentProject();
    if (!project) return false;
    return await update(project.id, { projectOwner });
};

const setApprovers = async (approvers: string[]) => {
    const project = getCurrentProject();
    if (!project) return false;
    return await update(project.id, { approvers });
};

const setEstimate = async (estimate: number | undefined) => {
    const project = getCurrentProject();
    if (!project) return false;
    return await update(project.id, { estimate });
};

/**
 * Exports a specific project in the selected type
 * @param projectId
 * @param type
 * @returns
 */
const exportProject = async (projectId: string, format: "pdf" | "json" | "excel") => {
    const project = await getProject(projectId);
    if (!project) return;

    // const document = getDocument(project.id);
    // if (!document) return;
    // const view = ProjectsStatusStore.get().lastViewTypes[projectId];

    // const fileTitle = kebabCase(document.title);

    // let filenameSuffix = "";
    // if (view === "overview") {
    //     filenameSuffix += "-overview";
    // } else if (view === "time") {
    //     filenameSuffix += "-timelogs";
    // }

    // const tasks = getProjectTasks(project.id);
    // let timelogs = false;
    // let overview = null;

    // if (view === "time") {
    //     timelogs = true;
    // } else if (view === "overview") {
    //     await OverviewActions.load(project.id);
    //     overview = OverviewStore.get().overview;
    // }

    // await api("export/project", {
    //     project,
    //     tasks,
    //     people: PeopleStore.get().people,
    //     companies: PeopleStore.get().companies,
    //     timelogs,
    //     overview,
    //     destination: info.filePath,
    //     type,
    // });

    await ExportAPI.export({
        title: "project",
        data: project,
        type: "project",
        format,
    });
};

const archiveCompleted = async (projectId: string): Promise<string[]> => {
    const taskIds = await ProjectsAPI.archiveCompleted(projectId);

    for (const taskId of taskIds) {
        await TasksActions.update(taskId, { archived: new Date() }, true);
    }

    if (taskIds.length) {
        Toast.success(`${taskIds.length} completed task were archived successfully!`);
    } else {
        Toast.success("No completed task to archive!");
    }

    return taskIds;
};

const archiveCompletedAlert = async (projectId: string): Promise<string[]> => {
    const result = await Dialog.confirm(
        "Archive tasks",
        "Are you sure you want to archive all completed tasks?",
        Intent.WARNING
    );

    if (!result) return [];

    return await archiveCompleted(projectId);
};

const duplicate = async (projectId: string) => {
    const project = await getProject(projectId);
    if (!project) return;

    // const newProject = await ProjectsAPI.duplicate(project.id);

    // const document = RecordActions.getDocument(project.id);
    // if (newProject)
    //     RecordActions.addDocument(
    //         newProject.id,
    //         newProject.title,
    //         RECORDTYPE.PROJECT,
    //         document?.parent || 0,
    //         document?.data?.public || true
    //     );
};

const duplicateAlert = async (projectId: string) => {
    const confirm = await Dialog.confirm(translate("Duplicate project"), translate("Are you sure you want to duplicate this project If there are many tasks this procedure may take some time"));

    if (!confirm) return;
    await duplicate(projectId);
};

export const ProjectsActions = {
    load,
    loadOne,
    reloadProject,
    update,
    getProject,
    getCurrentProject,
    removeField,
    reorderFields,
    upsertAutomation,
    removeAutomation,
    reorderAutomations,
    removeById,
    toggleFavorite,
    setDescription,
    setNotes,
    setHealth,
    setBackgroundUrl,
    setHourlyRate,
    setStartDate,
    setEndDate,
    setCompany,
    setOwner,
    setApprovers,
    setEstimate,
    upsertField,
    exportProject,
    duplicateAlert,
    archiveCompleted,
    archiveCompletedAlert,
};
