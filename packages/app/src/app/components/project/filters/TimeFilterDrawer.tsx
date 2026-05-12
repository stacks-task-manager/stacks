// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Alignment,
    Button,
    ButtonGroup,
    Classes,
    Colors,
    FormGroup,
    InputGroup,
    Intent,
    Keys,
    Menu,
    MenuItem,
    Popover,
    Switch,
} from "@blueprintjs/core";
import { produce } from "immer";
import React, { createRef, FunctionComponent, useEffect, useMemo, useState } from "react";
import { AvatarChip, Icon, ToolbarDropdownButton } from "app/components/common";
import { ProjectsActions, TimelogsActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { ITimelogsFilters, TimelogsStore } from "app/store/timelogs";
import { uuidv4 } from "app/utils/uuid";
import { FiltersSidebar, PeopleDialog } from "app/widgets";
import { TagsWrapper } from "../../../widgets/common/TagsWrapper/TagsWrapper";
import { DateMenu, formatDates } from "./DateMenu";
import { shallowEqual } from "app/hooks/store";
import { useProjectLastView } from "app/hooks";

export const TimeFilterDrawer = () => {
    const { filtersVisible, filters, savedFilters } = TimelogsStore.use();
    const viewType = useProjectLastView();

    useEffect(() => {
        if (!filtersVisible) return;

        const project = ProjectsActions.getCurrentProject();
        if (project) TimelogsActions.load({ project: project.id });
    }, [filters.assignees, filters.date, filters.me, filters.query, filters.billable, filters.billed]);

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
                                    <FormGroup label="Filter name">
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
            <QueryFilter term={filters.query} />
            <MevsAnyoneFilter />
            <AssigneesFilter assignees={filters.assignees} disabled={Boolean(filters.me)} />
            <DateFilter date={filters.date} />
            <FormGroup label="Quick filters">
                <Switch
                    label="Show billable time logs"
                    checked={filters.billable}
                    onChange={() => TimelogsActions.setFilter("billable", !filters.billable)}
                />
                <Switch
                    label="Show billed time logs"
                    checked={filters.billed}
                    onChange={() => TimelogsActions.setFilter("billed", !filters.billed)}
                />
            </FormGroup>
        </FiltersSidebar>
    );
};

interface IQueryFilterProps {
    term?: string;
}
const QueryFilter: FunctionComponent<IQueryFilterProps> = ({ term }) => {
    const [query, setQuery] = useState(term);
    const queryInputRef = createRef<HTMLInputElement>();

    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

    useEffect(() => {
        if (term !== query) {
            setQuery(term);
        }
    }, [term]);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.keyCode === Keys.ESCAPE || ((event.metaKey || event.ctrlKey) && event.key === "f")) {
            if (query?.length) {
                setQuery("");
                TimelogsActions.setQuery("");
            } else {
                TimelogsActions.toggleFilters();
            }
        }
    };

    const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.currentTarget.value);
        TimelogsActions.setQuery(event.currentTarget.value);
    };

    return (
        <FormGroup label="Search task" helperText="Search for time log description">
            <InputGroup
                value={query}
                placeholder="Enter a keyword"
                leftIcon={<Icon icon="search" />}
                round
                type="search"
                onChange={handleChangeQuery}
                inputRef={queryInputRef}
                onKeyDown={handleKeyDown}
            />
        </FormGroup>
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
        <FormGroup label="Time logged by">
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

interface IAssigneesFilterProps {
    assignees: string[];
    disabled?: boolean;
}
const AssigneesFilter: FunctionComponent<IAssigneesFilterProps> = ({ assignees, disabled }) => {
    const [open, setOpen] = useState(false);

    const people = useMemo(() => {
        return PeopleStore.get().people.filter(person => assignees.includes(person.id));
    }, [assignees]);

    const handleSelectAssignees = (people: string[]) => {
        TimelogsActions.setFilter("assignees", people);
    };

    const toggleAssignee = (personId: string) => {
        TimelogsActions.setFilter(
            "assignees",
            produce(assignees, (draftAssignees: string[]) => {
                const index = draftAssignees.findIndex(a => a === personId);
                if (index > -1) {
                    draftAssignees.splice(index, 1);
                } else {
                    draftAssignees.push(personId);
                }
            })
        );
    };

    const handleTogglePeopleDialog = () => {
        setOpen(!open);
    };

    return (
        <FormGroup label="Assginees">
            <Button
                fill
                icon={<Icon icon="user-add" />}
                alignText={Alignment.LEFT}
                disabled={disabled}
                onClick={handleTogglePeopleDialog}
            >
                Add assignees
            </Button>

            {people.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    <TagsWrapper gap={10} vertical>
                        {people.map(person => (
                            <AvatarChip
                                key={person.id}
                                person={person}
                                small
                                onRemove={() => toggleAssignee(person.id)}
                            />
                        ))}
                    </TagsWrapper>
                </div>
            )}

            {open && (
                <PeopleDialog
                    value={assignees}
                    onClose={handleSelectAssignees}
                    onClosed={handleTogglePeopleDialog}
                />
            )}
        </FormGroup>
    );
};

interface IDateFilterProps {
    date?: string;
}
const DateFilter: FunctionComponent<IDateFilterProps> = ({ date }) => {
    const label = useMemo(() => {
        if (!date) return "Date";
        return formatDates(date);
    }, [date]);

    const handleSetDate = (date?: string) => {
        TimelogsActions.setFilter("date", date);
    };

    return (
        <FormGroup label="Time logged date">
            <Popover content={<DateMenu date={date} onChange={handleSetDate} />}>
                <Button
                    fill
                    icon={<Icon icon="calendar-date" />}
                    alignText={Alignment.LEFT}
                    rightIcon={<Icon icon="chevron-down" />}
                >
                    {label}
                </Button>
            </Popover>
        </FormGroup>
    );
};
