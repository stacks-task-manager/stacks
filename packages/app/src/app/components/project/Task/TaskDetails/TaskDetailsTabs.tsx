// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Tab, Tabs } from "@blueprintjs/core";
import { ITask } from "@stacks/types";
import { translate } from "@stacks/translations";
import { TaskDetailsAttachments, TaskDetailsDependencies, TaskDetailsLinks } from "app/components/project";
import { usePreferences } from "app/hooks";
import React, { FunctionComponent, useMemo, useState } from "react";
import { TaskDetailsLocations } from "../TaskDetailsLocations/TaskDetailsLocations";
import { TaskDetailsTimelogsTab } from "../TaskDetailsTimeLogs/TaskDetailsTimeLogs";

interface TaskDetailsTabsProps {
    task: ITask;
    disabled?: boolean;
}
/**
 * Renders the task-details tab bar and the active tab's panel (files, subtasks,
 * locations, links, time, attachments, dependencies). Which tabs are available
 * is driven by the user's `taskDetails*` preferences.
 */
export const TaskDetailsTabs: FunctionComponent<TaskDetailsTabsProps> = ({ task, disabled }) => {
    const [activeTab, setActiveTab] = useState("files");

    const {
        taskDetailsSubtasks,
        taskDetailsLocations,
        taskDetailsLinks,
        taskDetailsTime,
        taskDetailsAttachments,
        taskDetailsDependencies,
    } = usePreferences([
        "taskDetailsSubtasks",
        "taskDetailsLocations",
        "taskDetailsLinks",
        "taskDetailsTime",
        "taskDetailsAttachments",
        "taskDetailsDependencies",
    ]);

    const showTabs = useMemo(() => {
        return (
            taskDetailsSubtasks ||
            taskDetailsLocations ||
            taskDetailsLinks ||
            taskDetailsTime ||
            taskDetailsAttachments ||
            taskDetailsDependencies
        );
    }, [
        taskDetailsSubtasks,
        taskDetailsLocations,
        taskDetailsLinks,
        taskDetailsTime,
        taskDetailsAttachments,
        taskDetailsDependencies,
    ]);

    if (!showTabs) return null;

    const handleTabChange = (tabId: string) => {
        setActiveTab(tabId);
    };

    return (
        <Tabs
            id="options"
            selectedTabId={activeTab}
            renderActiveTabPanelOnly
            onChange={handleTabChange}
            data-testid="task-details-tabs"
        >
            {task && taskDetailsAttachments ? (
                <Tab
                    id="files"
                    title={translate("Files")}
                    panel={<TaskDetailsAttachments taskId={task.id} disabled={disabled} />}
                />
            ) : null}
            {taskDetailsDependencies && (
                <Tab
                    id="dependencies"
                    title={translate("Dependencies")}
                    panel={<TaskDetailsDependencies taskId={task.id} disabled={disabled} />}
                />
            )}
            {taskDetailsTime ? (
                <Tab
                    id="timelogs"
                    title={translate("Time entries")}
                    panel={
                        <TaskDetailsTimelogsTab
                            taskId={task.id}
                            projectId={task.project}
                            disabled={disabled}
                        />
                    }
                />
            ) : null}
            {taskDetailsLinks ? (
                <Tab
                    id="links"
                    title={translate("Links")}
                    tagContent={task && task.links && task.links.length > 0 ? task.links.length : undefined}
                    panel={<TaskDetailsLinks taskId={task.id} links={task.links} disabled={disabled} />}
                />
            ) : null}
            {taskDetailsLocations ? (
                <Tab
                    id="locations"
                    title={translate("Locations")}
                    tagContent={
                        task && task.locations && task.locations.length > 0
                            ? task?.locations.length
                            : undefined
                    }
                    panel={
                        <TaskDetailsLocations
                            taskId={task.id}
                            locations={task.locations}
                            disabled={disabled}
                        />
                    }
                />
            ) : null}
        </Tabs>
    );
};
