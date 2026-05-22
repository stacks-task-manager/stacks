// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Loaded projects map and current id.
 */
import { entity } from "app/hooks/store";
import { IProject } from "@stacks/types";

export interface IProjectsStore {
    projects: IProject[];
}

export const ProjectsStore = entity<IProjectsStore>({
    projects: [],
});
