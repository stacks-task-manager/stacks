// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Alignment,
    AnchorButton,
    Button,
    ButtonGroup,
    Colors,
    FormGroup,
    InputGroup,
    Intent,
    Keys,
    Popover,
    Switch,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { ITag, PRIORITY, PRIORITYICON, TAGSECTION } from "@stacks/types";
import { AvatarChip, Grid, Icon } from "app/components/common";
import { getCurrentProjectId, useMe, useProjectStatuses, useProjectTags } from "app/hooks";
import { TASK_PRIORITY } from "app/locale/dynamic-messages";
import { ProjectFiltersActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { IFilters } from "app/store/projectFilters";
import { PeopleDialog, StatusChip, Tags } from "app/widgets";
import { produce } from "immer";
import React, { createRef, FunctionComponent, useEffect, useMemo, useState } from "react";
import { TagsWrapper } from "../../../widgets/common/TagsWrapper/TagsWrapper";
import { PriorityMenu } from "../PriorityMenu/PriorityMenu";
import { StatusesMenu } from "../StatusesMenu/StatusesMenu";
import { TagsMenu } from "../TagsMenu/TagsMenu";
import { DateMenu, formatDates } from "./DateMenu";

interface IProjectFilterProps {
    filters: IFilters;
    myTasks?: boolean;
}
export const ProjectFilter: FunctionComponent<IProjectFilterProps> = ({ filters, myTasks }) => {
    const projectId = getCurrentProjectId();
    return (
        <>
            <QueryFilter term={filters.query} />
            <StateFilter state={filters.state} />
            {!myTasks && <MeVsAnyoneFilter me={filters.me} nobody={filters.nobody} />}
            {!myTasks ? (
                <AnyoneExtra
                    skipMe={filters.skipMe}
                    onlyAssigned={filters.onlyAssigned}
                    disabled={Boolean(filters.me) || Boolean(filters.nobody)}
                />
            ) : null}

            {!myTasks && (
                <AssigneesFilter
                    assignees={filters.assignees}
                    disabled={Boolean(filters.me) || Boolean(filters.nobody)}
                />
            )}
            <PriorityFilter priority={filters.priority} />
            <TagsFilter tags={filters.tags} projectId={projectId} />
            <StatusesFilter status={filters.status} projectId={projectId} />
            <StartDateFilter date={filters.startDate} />
            <DoDateFilter date={filters.doDate} />
            <DueDateFilter date={filters.dueDate} />
            {/* {hasProjects && <ProjectsFilter project={filters.project} />} */}
            <FormGroup label="Quick filters">
                <Switch
                    label="Only overdue tasks"
                    checked={filters.overdue}
                    onChange={() => ProjectFiltersActions.set("overdue", !filters.overdue)}
                />
                <Switch
                    label="Only tasks in progress"
                    checked={filters.inProgress}
                    onChange={() => ProjectFiltersActions.set("inProgress", !filters.inProgress)}
                />
            </FormGroup>
            {/* {hasStacks && (
                <FilterSection title="Stack" icon="alignment-top" open active={Boolean(filters.stack)}>
                    <StacksMenu
                        value={filters.stack ? [filters.stack.id] : []}
                        // onChange={(stackIds: string[]) => ProjectFiltersActions.set("stack", stack)}
                        onChange={console.log}
                    />
                </FilterSection>
            )} */}
        </>
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
                ProjectFiltersActions.setQuery("");
            } else {
                ProjectFiltersActions.hide();
            }
        }
    };

    const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.currentTarget.value);
        ProjectFiltersActions.setQuery(event.currentTarget.value);
    };

    return (
        <FormGroup label="Search task" helperText="Search in task title or description">
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

interface IStateFilterProps {
    state: "all" | "done" | "todo";
}
const StateFilter: FunctionComponent<IStateFilterProps> = ({ state }) => {
    return (
        <FormGroup label="Task state">
            <ButtonGroup fill>
                <Tooltip
                    content="Incomplete tasks"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <AnchorButton
                            fill
                            icon={<Icon icon="circle" color={Colors.ORANGE2} />}
                            ref={ref}
                            intent={state === "todo" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => ProjectFiltersActions.set("state", "todo")}
                            {...props}
                        />
                    )}
                />
                <Tooltip
                    content="Completed tasks"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <AnchorButton
                            fill
                            icon={<Icon icon="check-circle" color={Colors.FOREST2} />}
                            ref={ref}
                            intent={state === "done" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => ProjectFiltersActions.set("state", "done")}
                            {...props}
                        />
                    )}
                />
                <Tooltip
                    content="All tasks"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <AnchorButton
                            fill
                            icon={<Icon icon="minus-circle" color={Colors.BLUE3} />}
                            ref={ref}
                            intent={state === "all" ? Intent.PRIMARY : Intent.NONE}
                            onClick={() => ProjectFiltersActions.set("state", "all")}
                            {...props}
                        />
                    )}
                />
            </ButtonGroup>
        </FormGroup>
    );
};

interface ITagsFilterProps {
    tags: string[];
    projectId: string;
}
const TagsFilter: FunctionComponent<ITagsFilterProps> = ({ tags, projectId }) => {
    const systemTags = useProjectTags(projectId);

    const label = useMemo(() => {
        if (tags.length === 0) return "All tags";
        if (tags.length === 1) return systemTags.find((t: ITag) => t.id === tags.at(0))?.title;
        return "Multiple tags";
    }, [tags, systemTags]);

    const icon = useMemo(() => {
        if (tags.length === 0) return "tags";
        if (tags.length === 1) return "tag-filled";
        return "tags-filled";
    }, [tags]);

    const color = useMemo(() => {
        if (tags.length === 0) return undefined;
        if (tags.length === 1) return systemTags.find((t: ITag) => t.id === tags.at(0))?.color;
        return Colors.BLUE3;
    }, [tags, systemTags]);

    const handleToggleTag = (tag?: ITag) => {
        const filteredTags = tag
            ? produce(tags, (draftTags: string[]) => {
                  const index = tag && draftTags.length ? draftTags.findIndex(t => t === tag.id) : -1;

                  if (index > -1) {
                      draftTags.splice(index, 1);
                  } else {
                      draftTags.push(tag.id);
                  }
              })
            : [];

        ProjectFiltersActions.set("tags", filteredTags);
    };

    const handleRemoveTag = (tagId: string) => {
        ProjectFiltersActions.set(
            "tags",
            tags.filter(tag => tag !== tagId)
        );
    };

    return (
        <FormGroup label="Tags">
            <Popover
                content={
                    <TagsMenu
                        value={tags}
                        onChange={handleToggleTag}
                        shouldDismiss={false}
                        section={TAGSECTION.PROJECTS}
                    />
                }
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon={icon} color={color} />}
                    rightIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.LEFT}
                    intent={tags.length > 0 ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>

            {tags.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    <TagsWrapper>
                        <Tags value={tags} section={TAGSECTION.PROJECTS} onRemove={handleRemoveTag} />
                    </TagsWrapper>
                </div>
            )}
        </FormGroup>
    );
};

interface IStatusesFilterProps {
    status?: string;
    projectId: string;
}
const StatusesFilter: FunctionComponent<IStatusesFilterProps> = ({ status, projectId }) => {
    const statuses = useProjectStatuses(projectId);

    const selectedStatus = useMemo(() => {
        if (!status) return undefined;
        return statuses.find(s => s.id === status);
    }, [status, statuses]);

    const color = useMemo(() => {
        if (!selectedStatus) return Colors.GRAY3;
        return selectedStatus.color;
    }, [selectedStatus]);

    const label = useMemo(() => {
        if (!selectedStatus) return translate("All statuses");
        return selectedStatus.title;
    }, [selectedStatus]);

    return (
        <FormGroup label="Status">
            <Popover
                content={
                    <StatusesMenu
                        value={selectedStatus ? [selectedStatus] : []}
                        section={TAGSECTION.PROJECTS}
                        onChange={(s?: ITag) => ProjectFiltersActions.set("status", s ? s.id : undefined)}
                    />
                }
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon="circle-filled" color={color} />}
                    rightIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.LEFT}
                    intent={status != null ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>

            {selectedStatus != null && (
                <div style={{ marginTop: 10 }}>
                    <StatusChip
                        tag={selectedStatus}
                        fill
                        onRemove={() => ProjectFiltersActions.set("status", undefined)}
                    />
                </div>
            )}
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
        ProjectFiltersActions.set("assignees", people);
    };

    const toggleAssignee = (personId: string) => {
        ProjectFiltersActions.set(
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
                    <Grid gap={10}>
                        {people.map(person => (
                            <AvatarChip
                                key={person.id}
                                person={person}
                                small
                                onRemove={() => toggleAssignee(person.id)}
                            />
                        ))}
                    </Grid>
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

interface IPriorityFilterProps {
    priority?: PRIORITY;
}
const PriorityFilter: FunctionComponent<IPriorityFilterProps> = ({ priority }) => {
    const icon = useMemo(() => {
        if (!priority || priority === PRIORITY.NONE) return "flag";
        switch (priority) {
            case PRIORITY.CRITICAL:
                return PRIORITYICON.CRITICAL;
            case PRIORITY.HIGH:
                return PRIORITYICON.HIGH;
            case PRIORITY.MEDIUM:
                return PRIORITYICON.MEDIUM;
            case PRIORITY.LOW:
                return PRIORITYICON.LOW;
        }
    }, [priority]);

    const color = useMemo(() => {
        if (!priority || priority === PRIORITY.NONE) return undefined;
        switch (priority) {
            case PRIORITY.CRITICAL:
            case PRIORITY.HIGH:
                return Colors.RED3;
            case PRIORITY.MEDIUM:
                return Colors.ORANGE3;
            case PRIORITY.LOW:
                return Colors.GREEN3;
        }
    }, [priority]);

    const label = useMemo(() => {
        if (!priority || priority === PRIORITY.NONE) {
            return "Any priority";
        }

        return TASK_PRIORITY[priority];
    }, [priority]);

    return (
        <FormGroup label="Priority">
            <Popover
                content={
                    <PriorityMenu
                        value={priority || PRIORITY.NONE}
                        onChange={(priority: PRIORITY | null) =>
                            ProjectFiltersActions.set(
                                "priority",
                                priority === PRIORITY.NONE ? null : priority
                            )
                        }
                    />
                }
                placement="bottom"
                minimal
                matchTargetWidth
            >
                <Button
                    fill
                    icon={<Icon icon={icon} color={color} />}
                    rightIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.LEFT}
                    intent={priority != null ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>
        </FormGroup>
    );
};

interface IMeVsAnyoneFilterProps {
    me?: boolean;
    nobody?: boolean;
}
const MeVsAnyoneFilter: FunctionComponent<IMeVsAnyoneFilterProps> = ({ me, nobody }) => {
    const currentUser = useMe();

    const handleSetMe = () => {
        if (!currentUser) return;
        ProjectFiltersActions.setMultiple({
            me: true,
            nobody: undefined,
            assignees: [],
            skipMe: undefined,
            onlyAssigned: undefined,
        });
    };

    const handleSetAnyone = () => {
        ProjectFiltersActions.setMultiple({
            me: undefined,
            nobody: undefined,
        });
    };

    const handleSetNobody = () => {
        ProjectFiltersActions.setMultiple({
            me: undefined,
            nobody: true,
            skipMe: undefined,
            onlyAssigned: undefined,
            assignees: [],
        });
    };

    return (
        <FormGroup label="Tasks assigned to">
            <ButtonGroup fill>
                <Tooltip
                    disabled={!Boolean(currentUser)}
                    content={currentUser ? "Just me" : "The current user is not yet selected."}
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <AnchorButton
                            fill
                            icon={<Icon icon="user" color={me ? Colors.BLUE3 : undefined} />}
                            intent={Boolean(me) ? Intent.PRIMARY : Intent.NONE}
                            disabled={!currentUser}
                            ref={ref}
                            {...props}
                            onClick={handleSetMe}
                        />
                    )}
                />
                <Tooltip
                    content="Anyone"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <Button
                            fill
                            icon={
                                <Icon icon="users-check" color={!me && !nobody ? Colors.BLUE3 : undefined} />
                            }
                            intent={!me && !nobody ? Intent.PRIMARY : Intent.NONE}
                            ref={ref}
                            {...props}
                            onClick={handleSetAnyone}
                        />
                    )}
                />
                <Tooltip
                    content="Nobody"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <Button
                            fill
                            icon={<Icon icon="users-x" color={!me && nobody ? Colors.BLUE3 : undefined} />}
                            intent={!me && nobody ? Intent.PRIMARY : Intent.NONE}
                            ref={ref}
                            {...props}
                            onClick={handleSetNobody}
                        />
                    )}
                />
            </ButtonGroup>
        </FormGroup>
    );
};

interface AnyoneExtraProps {
    skipMe?: boolean;
    onlyAssigned?: boolean;
    disabled?: boolean;
}
const AnyoneExtra: FunctionComponent<AnyoneExtraProps> = ({ skipMe, onlyAssigned, disabled }) => {
    return (
        <>
            <Switch
                label="Skip tasks assigned to me"
                checked={Boolean(skipMe)}
                disabled={disabled}
                onChange={() => ProjectFiltersActions.set("skipMe", !skipMe)}
            />
            <Switch
                label="Only show assigned tasks"
                checked={Boolean(onlyAssigned)}
                disabled={disabled}
                onChange={() => ProjectFiltersActions.set("onlyAssigned", !onlyAssigned)}
            />
        </>
    );
};

interface IDateFilterProps {
    date?: string;
}
const StartDateFilter: FunctionComponent<IDateFilterProps> = ({ date }) => {
    const label = useMemo(() => {
        if (!date) return translate("Start date");
        return formatDates(date);
    }, [date]);

    const handleSetDate = (date?: string) => {
        ProjectFiltersActions.set("startDate", date);
    };

    return (
        <FormGroup label={translate("Start date")}>
            <Popover
                content={<DateMenu date={date} onChange={handleSetDate} />}
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon="calendar-date" />}
                    alignText={Alignment.LEFT}
                    rightIcon={<Icon icon="chevron-down" />}
                    intent={date != null ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>
        </FormGroup>
    );
};

const DoDateFilter: FunctionComponent<IDateFilterProps> = ({ date }) => {
    const label = useMemo(() => {
        if (!date) return translate("Do date");
        return formatDates(date);
    }, [date]);

    const handleSetDate = (date?: string) => {
        ProjectFiltersActions.set("doDate", date);
    };

    return (
        <FormGroup label={translate("Do date")}>
            <Popover
                content={<DateMenu date={date} onChange={handleSetDate} />}
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon="calendar-date" />}
                    alignText={Alignment.LEFT}
                    rightIcon={<Icon icon="chevron-down" />}
                    intent={date != null ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>
        </FormGroup>
    );
};

const DueDateFilter: FunctionComponent<IDateFilterProps> = ({ date }) => {
    const label = useMemo(() => {
        if (!date) return translate("Due Date");
        return formatDates(date);
    }, [date]);

    const handleSetDate = (date?: string) => {
        ProjectFiltersActions.set("dueDate", date);
    };

    return (
        <FormGroup label={translate("Due Date")}>
            <Popover
                content={<DateMenu date={date} onChange={handleSetDate} />}
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon="calendar-date" />}
                    alignText={Alignment.LEFT}
                    rightIcon={<Icon icon="chevron-down" />}
                    intent={date != null ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>
        </FormGroup>
    );
};

/*
interface IProjectsFilterProps {
    project?: string;
}
const ProjectsFilter: FunctionComponent<IProjectsFilterProps> = ({ project }) => {
    const documents = RecordsStore.use(state => state.documents, shallowEqual);
    const projects: TreeNode[] = useMemo(() => {
        return documents.filter(document => document.data?.type === "project");
    }, [documents]);

    return (
        <>
            <FormGroup label="Project">
                <Popover
                    content={
                        <Menu>
                            <MenuItem
                                text={translate("Clear")}
                                icon={<Icon icon="circle" />}
                                onClick={() => ProjectFiltersActions.set("project", undefined)}
                            />
                            <MenuDivider />
                            {projects.map(project => (
                                <MenuItem
                                    key={project.id}
                                    text={project.text}
                                    icon={<Icon icon="check-circle-broken" />}
                                    // labelElement={
                                    //     <Icon icon={project === `${project.id}` ? "check" : undefined} />
                                    // }
                                    onClick={() => ProjectFiltersActions.set("project", `${project.id}`)}
                                />
                            ))}
                        </Menu>
                    }
                    placement="left"
                >
                    <Button
                        fill
                        icon={<Icon icon="check-circle-broken" />}
                        alignText={Alignment.LEFT}
                        rightIcon={<Icon icon="chevron-down" />}
                    >
                        Project
                    </Button>
                </Popover>
            </FormGroup>
            {project && (
                <Callout icon={<Icon icon="alert-circle" />} intent={Intent.WARNING}>
                    Saving the current filter configuration with the project filter set may not work properly
                    on other workspaces or even specific views.
                </Callout>
            )}
        </>
    );
};
*/
