// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent, Menu, MenuItem, Popover, Tag } from "@blueprintjs/core";
import { APPICONS } from "@stacks/types";
import { Icon } from "app/components/common";
import React from "react";
import { useNavigate } from "react-router-dom";

interface ProjectsListProject {
    id: string;
    title: string;
}

interface ProjectsListProps {
    projects: ProjectsListProject[];
}

export const ProjectsList = ({ projects }: ProjectsListProps) => {
    const navigate = useNavigate();

    const openProject = (projectId: string) => {
        navigate(`/project/${projectId}`);
    };

    return (
        <Popover
            placement="right-start"
            content={
                <Menu>
                    {projects.length > 0 ? (
                        projects.map(({ id, title }) => {

                            return (
                                <MenuItem
                                    text={title}
                                    key={id}
                                    icon={<Icon icon={APPICONS.PROJECT} />}
                                    onClick={() => openProject(id)}
                                />
                            );
                        })
                    ) : (
                        <MenuItem
                            text="This person is not assigned to any project yet"
                            disabled
                        />
                    )}
                </Menu>
            }
        >
            <Tag minimal interactive intent={Intent.PRIMARY}>
                {projects.length} projects
            </Tag>
        </Popover>
    );
}