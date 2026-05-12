// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { Link } from "react-router-dom";

import { Icon } from "app/components/common";
import { useDocument } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { ProjectPickerPopup } from "app/widgets";

interface ITaskDetailsProjectsProps {
    taskId: string;
    projectId: string;
}
export const TaskDetailsProjects: FunctionComponent<ITaskDetailsProjectsProps> = ({ taskId, projectId }) => {
    const project = useDocument(projectId);

    if (projectId === "inbox") {
        return (
            <ProjectPickerPopup onChange={(projectId: string) => TasksActions.setProject(taskId, projectId)}>
                <Button variant="minimal" size="small">
                    {translate("Assign project")}
                </Button>
            </ProjectPickerPopup>
        );
    }

    if (!project) return null;

    return (
        <div>
            <Link to={`/project/${project.id}`}>
                {project.archived != null ? (
                    <>
                        <Icon icon="archive" />{" "}
                    </>
                ) : null}
                {project.title}
            </Link>
        </div>
    );
};
