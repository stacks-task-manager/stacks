// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, FormGroup } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common/Icon/Icon";
import { useProjectDocuments } from "app/hooks";
import { ProjectPickerPopup } from "app/widgets/project";
import React, { FunctionComponent, memo, useMemo } from "react";

interface IProjectsFilterProps {
    projects: string[];
    onChange: (projects: string[]) => void;
}

export const ProjectsFilter: FunctionComponent<IProjectsFilterProps> = memo(function ProjectsFilter({
    projects,
    onChange,
}) {
    const projectDocuments = useProjectDocuments();
    const selectedProjects = useMemo(() => {
        const selected = new Set(projects);
        return projectDocuments.filter(project => selected.has(project.id));
    }, [projectDocuments, projects]);

    return (
        <FormGroup label={translate("Project")}>
            <ProjectPickerPopup
                multiple
                value={projects}
                onChange={onChange}
                showAnyProject
                showProjectIcon
                matchTargetWidth
                placement="bottom"
                minimal={false}
            >
                <Button
                    fill
                    icon={<Icon icon="grid-view" />}
                    endIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.START}
                    data-testid="task-filter-project-button"
                >
                    {projects.length === 0
                        ? translate("Any project")
                        : projects.length === 1
                          ? selectedProjects[0]?.title
                          : translate("Projects selected", { count: projects.length })}
                </Button>
            </ProjectPickerPopup>
        </FormGroup>
    );
});
