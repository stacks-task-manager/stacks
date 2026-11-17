// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, FormGroup, InputGroup, Intent, Menu, MenuItem, Popover } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { ToolbarDropdownButton } from "app/components/common/ToolbarButtons/ToolbarButtons";
import { useHasFilters } from "app/hooks";
import { useMyTasksFilters, useProjectFilters, useSavedFilters } from "app/hooks/projectFilters";
import { ProjectFiltersActions } from "app/store/actions";
import type { IFilters } from "app/store/projectFilters";
import { uuidv4 } from "app/utils/uuid";
import { FiltersSidebar } from "app/widgets/common/FiltersSidebar/FiltersSidebar";
import React, { FunctionComponent } from "react";

import { TaskFilter } from "./TaskFilter";
import type { ProjectFilterActions } from "./TaskFilterActions";

const projectFilterActions: ProjectFilterActions = {
    set: (key, value) => ProjectFiltersActions.set(key, value),
    setMultiple: values => ProjectFiltersActions.setMultiple(values),
    setQuery: query => ProjectFiltersActions.setQuery(query),
    hide: () => ProjectFiltersActions.hide(),
};

interface ITaskFilterDrawerProps {
    myTasks?: boolean;
}

export const TaskFilterDrawer: FunctionComponent<ITaskFilterDrawerProps> = ({ myTasks = false }) =>
    myTasks ? <MyTasksTaskFilterDrawer /> : <ProjectTaskFilterDrawer />;

const ProjectTaskFilterDrawer = () => {
    const { filters, isVisible } = useProjectFilters();
    if (!isVisible) return null;
    return <FilterDrawer mode="project" filters={filters} />;
};

const MyTasksTaskFilterDrawer = () => {
    const { filters, isVisible } = useMyTasksFilters();
    if (!isVisible) return null;
    return <FilterDrawer mode="myTasks" filters={filters} />;
};

interface IFilterDrawerProps {
    mode: "project" | "myTasks";
    filters: IFilters;
}

const FilterDrawer: FunctionComponent<IFilterDrawerProps> = ({ mode, filters }) => {
    const hasFilters = useHasFilters();
    const savedFilters: IFilters[] = useSavedFilters();
    const myTasks = mode === "myTasks";

    const handleSaveOrUpdateFilter = () => {
        if (filters.id != null) {
            ProjectFiltersActions.updateFilter(filters);
        } else {
            ProjectFiltersActions.addFilter({
                ...filters,
                id: uuidv4(),
            });
        }
    };

    return (
        <FiltersSidebar
            data-testid={myTasks ? "my-tasks-filters-sidebar" : "project-filters-sidebar"}
            header={
                <>
                    <div>
                        <strong>{translate("Filter project")}</strong>
                        {filters.id && <span>:&nbsp; {filters.title}</span>}
                    </div>

                    {savedFilters.length > 0 && (
                        <ToolbarDropdownButton
                            icon="filter-lines"
                            tooltip="Load previously saved filters"
                            placement="bottom-end"
                        >
                            <Menu>
                                {savedFilters.map((filter: IFilters) => (
                                    <MenuItem
                                        text={filter.title || "Untitled filter"}
                                        key={filter.id}
                                        onClick={() => ProjectFiltersActions.restoreFilter(filter)}
                                    />
                                ))}
                            </Menu>
                        </ToolbarDropdownButton>
                    )}
                </>
            }
            footer={
                hasFilters ? (
                    <>
                        <Button
                            variant="minimal"
                            size="small"
                            intent={Intent.WARNING}
                            onClick={ProjectFiltersActions.reset}
                        >
                            {translate("Clear all")}
                        </Button>

                        <Popover
                            content={
                                <>
                                    <FormGroup label={translate("Filter name")}>
                                        <InputGroup
                                            defaultValue={filters.title}
                                            onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                                                ProjectFiltersActions.setTitle(event.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                                        {!filters.id && <span />}
                                        {filters.id && (
                                            <Button
                                                size="small"
                                                variant="minimal"
                                                intent={Intent.DANGER}
                                                onClick={ProjectFiltersActions.deleteFilter}
                                            >
                                                {translate("Delete")}
                                            </Button>
                                        )}
                                        <Button
                                            className={Classes.POPOVER_DISMISS}
                                            size="small"
                                            intent={Intent.PRIMARY}
                                            onClick={handleSaveOrUpdateFilter}
                                        >
                                            {filters.id ? "Update filter" : "Save filter"}
                                        </Button>
                                    </div>
                                </>
                            }
                            placement="top-end"
                            popoverClassName="popover-padded-medium"
                        >
                            <Button size="small" intent={filters.id ? Intent.SUCCESS : Intent.PRIMARY}>
                                {filters.id ? translate("Update") : translate("Save")}
                            </Button>
                        </Popover>
                    </>
                ) : null
            }
        >
            <TaskFilter mode={mode} filters={filters} actions={projectFilterActions} />
        </FiltersSidebar>
    );
};
