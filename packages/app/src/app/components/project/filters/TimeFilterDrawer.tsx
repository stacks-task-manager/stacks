// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    ButtonGroup,
    Classes,
    Colors,
    FormGroup,
    InputGroup,
    Intent,
    Menu,
    MenuItem,
    Popover,
    Switch,
} from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useMemo } from "react";
import { Icon, ToolbarDropdownButton } from "app/components/common";
import { ProjectsActions, TimelogsActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { ITimelogsFilters, TimelogsStore } from "app/store/timelogs";
import { uuidv4 } from "app/utils/uuid";
import { FiltersSidebar } from "app/widgets";
import { AssigneesFilter } from "./AssigneesFilter";
import { DateFilter } from "./DateFilter";
import { QueryFilter } from "./QueryFilter";
import { shallowEqual } from "app/hooks/store";
import { useProjectLastView } from "app/hooks";

export const TimeFilterDrawer = () => {
    const { filtersVisible, filters, savedFilters } = TimelogsStore.use();
    const viewType = useProjectLastView();

    useEffect(() => {
        if (!filtersVisible) return;

        const project = ProjectsActions.getCurrentProject();
        if (project) TimelogsActions.load({ project: project.id });
    }, [
        filtersVisible,
        filters.assignees,
        filters.date,
        filters.me,
        filters.query,
        filters.billable,
        filters.billed,
    ]);

    useEffect(() => {
        TimelogsActions.loadSaved();
    }, []);

    const hasFilters = useMemo(() => {
        return Boolean(filters.assignees.length || filters.date != null || filters.me != null);
    }, [filters]);

    if (!filtersVisible || viewType !== "time") return null;

    const handleSaveOrUpdateFilter = () => {
        if (filters.id != null) {
            TimelogsActions.updateFilter(filters);
        } else {
            TimelogsActions.addFilter({
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
                        <strong>Filter time</strong>
                        {filters.id && <span>:&nbsp; {filters.title}</span>}
                    </div>

                    {savedFilters.length > 0 && (
                        <ToolbarDropdownButton
                            icon="filter-lines"
                            tooltip="Load previously saved filters"
                            placement="bottom-end"
                        >
                            <Menu>
                                {savedFilters.map((filter: ITimelogsFilters) => (
                                    <MenuItem
                                        text={filter.title || "Untitled filter"}
                                        key={filter.id}
                                        onClick={() => TimelogsActions.restoreFilter(filter)}
                                    />
                                ))}
                            </Menu>
                        </ToolbarDropdownButton>
                    )}
                </>
            }
            footer={
                hasFilters ? (
                    <div className="project-filters-footer">
                        <Button
                            variant="minimal"
                            size="small"
                            intent={Intent.WARNING}
                            onClick={TimelogsActions.resetFilters}
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
                                                TimelogsActions.setFilterTitle(event.currentTarget.value)
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
                                                onClick={TimelogsActions.deleteFilter}
                                            >
                                                Delete
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
                    </div>
                ) : null
            }
        >
            <QueryFilter
                term={filters.query}
                onChange={query => TimelogsActions.setQuery(query)}
                onHide={() => TimelogsActions.toggleFilters()}
                label={translate("Search task")}
                helperText={translate("Search for time log description")}
            />
            <MevsAnyoneFilter />
            <AssigneesFilter
                assignees={filters.assignees}
                disabled={Boolean(filters.me)}
                onChange={people => TimelogsActions.setFilter("assignees", people)}
                vertical
            />
            <DateFilter
                date={filters.date}
                emptyLabel={translate("Date")}
                label={translate("Time logged date")}
                onChange={date => TimelogsActions.setFilter("date", date)}
                minimal={false}
                matchTargetWidth={false}
                placement={undefined}
                highlightWhenSet={false}
                data-testid="timelogs-date-filter"
            />
            <FormGroup label={translate("Quick filters")}>
                <Switch
                    label={translate("Show billable time logs")}
                    checked={filters.billable}
                    onChange={() => TimelogsActions.setFilter("billable", !filters.billable)}
                />
                <Switch
                    label={translate("Show billed time logs")}
                    checked={filters.billed}
                    onChange={() => TimelogsActions.setFilter("billed", !filters.billed)}
                />
            </FormGroup>
        </FiltersSidebar>
    );
};

interface IMevsAnyoneFilterProps {
    me?: string;
}
const MevsAnyoneFilter: FunctionComponent<IMevsAnyoneFilterProps> = ({ me }) => {
    const currentUser = PeopleStore.use(state => state.me, shallowEqual);

    const handleSetMe = () => {
        TimelogsActions.setMultipleFilters({
            me: currentUser,
            assignees: [],
        });
    };

    const handleSetAnyone = () => {
        TimelogsActions.setFilter("me", undefined);
    };

    return (
        <FormGroup label={translate("Time logged by")}>
            <ButtonGroup fill>
                <Button
                    fill
                    icon={<Icon icon="user" color={me ? Colors.BLUE3 : undefined} />}
                    active={Boolean(me)}
                    onClick={handleSetMe}
                >
                    Just me
                </Button>
                <Button
                    fill
                    icon={<Icon icon="users" color={!me ? Colors.BLUE3 : undefined} />}
                    active={!me}
                    onClick={handleSetAnyone}
                >
                    Anyone
                </Button>
            </ButtonGroup>
        </FormGroup>
    );
};
