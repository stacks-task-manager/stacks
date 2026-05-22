// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Sequelize join shapes for projects loaded with related rows.
 */
import { IProject } from "@stacks/types";
import { Model } from "sequelize";



export interface IProjectWithDocument extends IProject {
    DocumentEntity: Model;
}

export interface IProjectWithTitle extends IProject {
    title: string;
}