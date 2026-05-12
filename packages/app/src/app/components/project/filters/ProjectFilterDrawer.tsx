// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, FormGroup, InputGroup, Intent, Menu, MenuItem, Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { ToolbarDropdownButton } from "app/components/common";
import { useHasFilters } from "app/hooks";
import {
    useMyTasksFilters,
    useProjectFilters,
    useSavedFilters,
} from "app/hooks/projectFilters";
import { ProjectFiltersActions } from "app/store/actions";
import { IFilters } from "app/store/projectFilters";
import { uuidv4 } from "app/utils/uuid";
import { FiltersSidebar } from "app/widgets";
import { ProjectFilter } from "./ProjectFilter";

export const ProjectFilterDrawer = () => {
    const { filters, isVisible } = useProjectFilters();
    if (!isVisible) return null;
    return <FilterDrawer filters={filters} />;
};

export const MyTasksFilterDrawer = () => {
    const { filters, isVisible } = useMyTasksFilters();

    if (!isVisible) return null;
    return <FilterDrawer myTasks filters={filters} />;
};

interface IProjectFilterDrawerProps {
    myTasks?: boolean;
    filters: IFilters;
}

const FilterDrawer: FunctionComponent<IProjectFilterDrawerProps> = ({ myTasks, filters }) => {
    const hasFilters = useHasFilters();
    const savedFilters: IFilters[] = useSavedFilters();

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
                                    <FormGroup label="Filter name">
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
                                                small
                                                minimal
                                                intent={Intent.DANGER}
                                                onClick={ProjectFiltersActions.deleteFilter}
                                            >
                                                {translate("Delete")}
                                            </Button>
                                        )}
                                        <Button
                                            className={Classes.POPOVER_DISMISS}
                                            small
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
            <ProjectFilter filters={filters} myTasks={myTasks} />
        </FiltersSidebar>
    );
};
