// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Alignment,
    AnchorButton,
    Button,
    ButtonGroup,
    Colors,
    FormGroup,
    Intent,
    Popover,
    Switch,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { ITag, PRIORITY, PRIORITYICON, TAGSECTION } from "@stacks/types";
import { Icon } from "app/components/common";
import { getCurrentProjectId, useMe, useProjectStatuses, useProjectTags } from "app/hooks";
import { produce } from "immer";
import { FunctionComponent, useMemo } from "react";

import { TASK_PRIORITY } from "app/locale/dynamic-messages";
import { ProjectFiltersActions } from "app/store/actions";
import { IFilters } from "app/store/projectFilters";
import { StatusChip, Tags } from "app/widgets";
import { TagsWrapper } from "../../../widgets/common/TagsWrapper/TagsWrapper";
import { PriorityMenu } from "../PriorityMenu/PriorityMenu";
import { StatusesMenu } from "../StatusesMenu/StatusesMenu";
import { TagsMenu } from "../TagsMenu/TagsMenu";
import { AssigneesFilter } from "./AssigneesFilter";
import { DateFilter } from "./DateFilter";
import { QueryFilter } from "./QueryFilter";

interface IProjectFilterProps {
    filters: IFilters;
    myTasks?: boolean;
}
export const ProjectFilter: FunctionComponent<IProjectFilterProps> = ({ filters, myTasks }) => {
    const projectId = getCurrentProjectId();
    return (
        <>
            <QueryFilter
                term={filters.query}
                onChange={query => ProjectFiltersActions.setQuery(query)}
                onHide={() => ProjectFiltersActions.hide()}
                label={translate("Search task")}
                helperText={translate("Search in task title or description")}
            />
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
                    onChange={people => ProjectFiltersActions.set("assignees", people)}
                />
            )}
            <PriorityFilter priority={filters.priority} />
            <TagsFilter tags={filters.tags} projectId={projectId} />
            <StatusesFilter status={filters.status} projectId={projectId} />
            <DateFilter
                date={filters.startDate}
                emptyLabel={translate("Start date")}
                onChange={date => ProjectFiltersActions.set("startDate", date)}
                data-testid="start-date-filter"
            />
            <DateFilter
                date={filters.doDate}
                emptyLabel={translate("Do date")}
                onChange={date => ProjectFiltersActions.set("doDate", date)}
                data-testid="do-date-filter"
            />
            <DateFilter
                date={filters.dueDate}
                emptyLabel={translate("Due Date")}
                onChange={date => ProjectFiltersActions.set("dueDate", date)}
                data-testid="due-date-filter"
            />
            {/* {hasProjects && <ProjectsFilter project={filters.project} />} */}
            <FormGroup label={translate("Quick filters")}>
                <Switch
                    label={translate("Only overdue tasks")}
                    checked={filters.overdue}
                    onChange={() => ProjectFiltersActions.set("overdue", !filters.overdue)}
                />
                <Switch
                    label={translate("Only tasks in progress")}
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

interface IStateFilterProps {
    state: "all" | "done" | "todo";
}
const StateFilter: FunctionComponent<IStateFilterProps> = ({ state }) => {
    return (
        <FormGroup label={translate("Task state")}>
            <ButtonGroup fill>
                <Tooltip
                    content={translate("Incomplete tasks")}
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
                    content={translate("Completed tasks")}
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
                    content={translate("All tasks")}
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
        if (tags.length === 0) return translate("All tags");
        if (tags.length === 1) return systemTags.find((t: ITag) => t.id === tags.at(0))?.title;
        return translate("Multiple tags");
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
        <FormGroup label={translate("Tags")}>
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
                    endIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.END}
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
        <FormGroup label={translate("Status")}>
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
                    endIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.END}
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
            return translate("Any priority");
        }

        return TASK_PRIORITY[priority];
    }, [priority]);

    return (
        <FormGroup label={translate("Priority")}>
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
                    endIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.END}
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
        <FormGroup label={translate("Tasks assigned to")}>
            <ButtonGroup fill>
                <Tooltip
                    disabled={!Boolean(currentUser)}
                    content={
                        currentUser ? translate("Just me") : translate("The current user is not yet selected")
                    }
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
                    content={translate("Anyone")}
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
                    content={translate("Nobody")}
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
                label={translate("Skip tasks assigned to me")}
                checked={Boolean(skipMe)}
                disabled={disabled}
                onChange={() => ProjectFiltersActions.set("skipMe", !skipMe)}
            />
            <Switch
                label={translate("Only show assigned tasks")}
                checked={Boolean(onlyAssigned)}
                disabled={disabled}
                onChange={() => ProjectFiltersActions.set("onlyAssigned", !onlyAssigned)}
            />
        </>
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
            <FormGroup label={translate("Project")}>
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
                        alignText={Alignment.END}
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
