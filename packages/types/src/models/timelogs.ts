// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ICommon } from "./common";
import { IProject } from "./project";
import { TreeNode } from "./record";
import { ITask } from "./task";

export enum TIMELOG_STATUS {
    PENDING = "pending",
    APPROVED = "approved",
    REJECTED = "rejected",
    INREVIEW = "inreview",
}

export interface ITimeLog extends ICommon {
    project: string; // project on which the task started the log
    task: string; // the task id

    duration: number; // the time duration of the time logged in seconds
    date: Date; // date when this time log was added - used to put logs in a specific order
    person: string; // who did the time
    description?: string; // work description
    billable?: boolean; // wether this logged time is billable or not
    billed?: boolean; // wether this logged time was billed

    status: TIMELOG_STATUS;
    approvedBy: string | null;
    approvedOn: Date | null;
    rejectReason: string | null;

    documentInfo: Pick<TreeNode, "title">;
    projectInfo: Pick<IProject, "estimate">;
    taskInfo: Pick<ITask, "title" | "estimate" | "done">;
}
