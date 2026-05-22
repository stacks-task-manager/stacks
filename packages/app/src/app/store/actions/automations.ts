// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Project automation editor actions.
 */
import { addDays, subDays } from "date-fns";

import { AUTOMATIOD_DO, AUTOMATION_EVENT, IAutomation, IAutomationAction } from "@stacks/types";
import { ProjectsActions, TasksActions } from "app/store/actions";

const executeAction = async (taskId: string, action: IAutomationAction, projectId: string) => {
    // Assign a person to a task
    if (action.do === AUTOMATIOD_DO.ASSIGN) {
        return await TasksActions.assignPerson(taskId, action.value as string);
    }

    // Unassign a person from a task
    if (action.do === AUTOMATIOD_DO.UNASSIGN) {
        return await TasksActions.unassignPerson(taskId, action.value as string);
    }

    // Set task start date or due date
    if (
        action.do === AUTOMATIOD_DO.STARTDATE ||
        action.do === AUTOMATIOD_DO.DUEDATE ||
        action.do === AUTOMATIOD_DO.DODATE
    ) {
        let date = new Date();

        if ((action.value as number) > 0) {
            date = addDays(new Date(), action.value as number);
        } else {
            date = subDays(new Date(), Math.abs(action.value as number));
        }

        // set the START date
        if (action.do === AUTOMATIOD_DO.STARTDATE) {
            return TasksActions.setStartDate(taskId, date);
        }

        // set the DO date
        if (action.do === AUTOMATIOD_DO.DODATE) {
            return TasksActions.setDoDate(taskId, date);
        }

        // set the DUE date
        return await TasksActions.setDueDate(taskId, date);
    }

    // Add a tag to a task
    if (action.do === AUTOMATIOD_DO.ADDTAG) {
        return await TasksActions.addTags(taskId, action.value as string[]);
    }

    // Remove a tag from a task
    if (action.do === AUTOMATIOD_DO.REMOVETAG) {
        return await TasksActions.removeTags(taskId, action.value as string[]);
    }

    // Remove all tags from a task
    if (action.do === AUTOMATIOD_DO.REMOVEALLTAGS) {
        return await TasksActions.clearTags(taskId);
    }

    // Add a status to a task
    if (action.do === AUTOMATIOD_DO.ADDSTATUS) {
        return await TasksActions.setStatus(taskId, action.value as string);
    }

    // Remove the current status from a task
    if (action.do === AUTOMATIOD_DO.REMOVESTATUS) {
        return await TasksActions.setStatus(taskId, undefined);
    }

    // Mark a task as done
    if (action.do === AUTOMATIOD_DO.DONE) {
        return await TasksActions.setDone(taskId, true);
    }

    // Mark a task as to do
    if (action.do === AUTOMATIOD_DO.TODO) {
        return await TasksActions.setTodo(taskId, true);
    }

    // Move a task to a desired stack
    if (action.do === AUTOMATIOD_DO.MOVE) {
        TasksActions.moveToStack(taskId, action.value as string, 0);
        return;

    }

    // Set a tasks progress
    if (action.do === AUTOMATIOD_DO.PROGRESS) {
        return await TasksActions.setProgress(taskId, action.value as number);
    }

    // Archive a task
    if (action.do === AUTOMATIOD_DO.ARCHIVE) {
        return await TasksActions.archive(taskId, true);
    }
};

/**
 *
 * @param taskId
 * @param event
 * @param eventValue
 * @param single wether if the automation is run from TaskActions
 * @returns
 */
const run = async (taskId: string, event: AUTOMATION_EVENT, projectId: string, eventValue?: string) => {
    const project = await ProjectsActions.getProject(projectId);

    if (!project) return;
    const automations = project.automations.filter((automation: IAutomation) => {
        // not enabled
        if (!automation.enabled) return false;
        // not the right event to handle
        if (automation.event !== event) return false;
        // the event value does not match
        // e.g. move to a stack and the current stack is different from the one in the automation
        if (automation.value && automation.value !== eventValue) return false;
        return true;
    });

    const actions: IAutomationAction[] = automations.reduce(
        (acc: IAutomationAction[], automation: IAutomation) => {
            return acc.concat(automation.actions);
        },
        []
    );

    for (const action of actions) {
        await executeAction(taskId, action, projectId);
    }
};

export const AutomationsActions = {
    run,
};
