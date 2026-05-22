// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Dialog, Intent, Menu, MenuItem, Popover, Tag } from "@blueprintjs/core";
import {
    BlankSlate,
    Col,
    DateLabel,
    DatePicker,
    Grid,
    Icon,
    RoundButton,
    Row,
    Scroller,
    Textarea,
    TextareaHandle,
} from "app/components/common";
import classNames from "classnames";
import xor from "lodash/xor";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import {
    APPICONS,
    IPerson,
    ITag,
    ITask,
    PRIORITY,
    TAGSECTION,
    TAGTYPE,
    TaskTemplate,
    TreeNode,
} from "@stacks/types";
import { getCurrentProject, getDefaultStackForProject, getProjectStacks } from "app/hooks";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { IAutocompelteDate, IAutocompleteSelectedItem, useAutocomplete } from "app/hooks/autocomplete";
import { strictEqual } from "app/hooks/store";
import { RecordActions, TasksActions } from "app/store/actions";
import { GlobalStore, toggleNewTask } from "app/store/global";
import { PeopleStore } from "app/store/people";
import dialog from "app/utils/dialog";
import { StackSelect, Tags, TagsPickerPopupSync, TaskAssignees, TaskDate, TaskStatus } from "app/widgets";
import { PriorityPicker } from "../../../components/project/PriorityPicker/PriorityPicker";
import { TagsWrapper } from "../../common/TagsWrapper/TagsWrapper";

interface INewTaskPopupProps {
    canMinimize?: boolean;
    canChangeProject?: boolean;
    top?: boolean;
    defaultStack?: string;
    parent?: string;
    defaultPriority?: PRIORITY;
    onClose: (tasks?: ITask[]) => void;
}

export const NewTaskPopup: FunctionComponent<INewTaskPopupProps> = ({
    defaultStack,
    parent,
    canMinimize,
    canChangeProject,
    top,
    defaultPriority,
    onClose,
}) => {
    const currentProject = getCurrentProject();
    const projectId = currentProject?.id;
    const projectStacks = projectId ? getProjectStacks(projectId) : [];
    const [open, setOpen] = useState(true);
    const [minimized, setMinimized] = useState(false);
    const [saving, setSaving] = useState(false);
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [assignees, setAssignees] = useState<string[]>([]);
    const [tags, setTags] = useState<string[]>([]);
    const [status, setStatus] = useState<string | null>(null);
    const [priority, setPriority] = useState<PRIORITY | null>(defaultPriority ?? null);
    const [startDate, setStartDate] = useState<Date | null>(null);
    const [dueDate, setDueDate] = useState<Date | null>(null);
    const [doDate, setDoDate] = useState<Date | null>(null);
    const [project, setProject] = useState<string | null>(projectId ?? null);
    const [stack, setStack] = useState<string | undefined>(
        defaultStack ?? projectStacks.at(0)?.id ?? undefined
    );
    const [count, setCount] = useState<number>(1);
    const closing = useRef(false);
    const titleRef = useRef<HTMLTextAreaElement | null>(null);
    const tasksRefs = useRef<ITask[]>([]);
    const navigate = useNavigate();

    const { show, hide, onSelect } = useAutocomplete({
        tags: true,
        statuses: true,
        emojis: true,
        priority: true,
        assignees: true,
        dates: true,
    });

    // useEffect(() => {
    //     if (defaultStack != null && defaultStack !== stack) {
    //         setStack(defaultStack);
    //     }
    // }, [defaultStack]);

    useEffect(() => {
        if (projectId === "mytasks") {
            const { me } = PeopleStore.get();
            if (me) {
                setAssignees([me]);
            }
        }

        return () => {
            if (titleRef.current) hide(titleRef.current);
        };
    }, []);

    onSelect(
        (selectedItem: IAutocompleteSelectedItem<ITag | string | PRIORITY | IPerson | IAutocompelteDate>) => {
            if (selectedItem.type === "priority") {
                setPriority(selectedItem.item as unknown as PRIORITY);
            } else if (selectedItem.type === "tag") {
                handleToggleTag((selectedItem.item as ITag).id);
            } else if (selectedItem.type === "status") {
                setStatus((selectedItem.item as ITag).id);
            } else if (selectedItem.type === "assignee") {
                handleToggleAssignee((selectedItem.item as IPerson).id);
            } else if (selectedItem.type === "dates") {
                if ((selectedItem.item as IAutocompelteDate).type === "start") {
                    setStartDate((selectedItem.item as IAutocompelteDate).date);
                } else if ((selectedItem.item as IAutocompelteDate).type === "due") {
                    setDueDate((selectedItem.item as IAutocompelteDate).date);
                } else if ((selectedItem.item as IAutocompelteDate).type === "do") {
                    setDoDate((selectedItem.item as IAutocompelteDate).date);
                }
            }

            if (titleRef.current) {
                const regex = new RegExp(
                    "(^|\\s)" + selectedItem.key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "($|\\s)",
                    "g"
                );
                const newTitle = titleRef.current.value.replace(regex, "");
                setTitle(newTitle);
            }
        }
    );

    const handleToggleTag = (tagId: string) => {
        setTags(xor(tags, [tagId]));
    };

    const setTitleRef = useCallback((node: TextareaHandle | null) => {
        if (node && node.input) {
            if (!titleRef.current) {
                show(node.input);
            }

            titleRef.current = node.input;
        } else {
            if (titleRef.current) {
                hide(titleRef.current);
            }
            titleRef.current = null;
        }
    }, []);

    const handleToggleAssignee = (personId: string) => {
        setAssignees(xor(assignees, [personId]));
    };

    const handleDatesChange = (startdate: Date | null, duedate: Date | null) => {
        setStartDate(startdate);
        setDueDate(duedate);
    };

    const handleClose = async (ignoreEmpty?: boolean) => {
        if (closing.current) return;
        closing.current = true;
        if (titleRef.current && titleRef.current.value.length > 0 && !ignoreEmpty) {
            const confirm = await dialog.confirm(
                "Close unsaved task",
                "Are you sure you want to close and cancel saving this new task?"
            );
            closing.current = false;
            if (!confirm) return;
        }

        setOpen(false);
    };

    const handleClosed = () => {
        onClose(tasksRefs.current);
        tasksRefs.current = [];
    };

    const handleSetProject = async (projectId: string) => {
        setProject(projectId);

        const defaultStack = getDefaultStackForProject(projectId);
        setStack(defaultStack ?? undefined);
    };

    const handleSaveTask = async (openTask?: boolean) => {
        if (!titleRef.current || !project || !stack) {
            window.toaster.show({
                message: "Please select a stack and project",
                intent: Intent.WARNING,
            });
            return;
        }

        const title = titleRef.current.value;
        if (title.trim().length === 0) {
            window.toaster.show({
                message: "Make sure you enter a task title",
                intent: Intent.WARNING,
            });
            return;
        }

        const taskTitles = title.split(/\r?\n/).filter((task: string) => task.length > 0);
        const newTasks: Partial<ITask>[] = taskTitles.map(taskTitle => {
            const task = {
                ...TaskTemplate,
                title: taskTitle,
                description: taskTitles.length > 1 ? "" : description,
                tags,
                status,
                assignees,
                priority,
                project,
                stack,
                startdate: startDate,
                duedate: dueDate,
                dodate: doDate,
            };

            if (parent != null) {
                task.parent = parent;
            }

            return task;
        });

        setSaving(true);

        tasksRefs.current = await TasksActions.addMultiple(newTasks, top);

        if (parent != null) {
            TasksActions.upsertTasks(tasksRefs.current);
            // TasksActions.appendSubtasks(
            //     parent,
            //     tasksRefs.current.map(task => task.id)
            // );
        }

        setSaving(false);
        handleClose(true);

        if (openTask === true) {
            const task = tasksRefs.current.at(0);
            if (task) {
                navigate(`/task/${task.id}`, {
                    state: {
                        backgroundLocation: snapshotTaskModalBackground(),
                    },
                });
            }
        }
    };

    const handleKeyDownTitle = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && !event.shiftKey) {
            handleSaveTask(event.ctrlKey || event.metaKey);
            event.preventDefault();
        }
    };

    const handleKeyUp = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        const lines = event.currentTarget.value
            .split(/\r?\n/)
            .filter((task: string) => task.length > 0).length;
        if (count !== lines) {
            setCount(lines);
            if (lines === 2) {
                window.toaster.show({
                    message: "The description will be omited while adding multiple tasks at once",
                });
            }
        }
    };

    const handleKeyDownDescription = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
            handleSaveTask();
            event.preventDefault();
        }
    };

    const handleToggleMimimize = () => {
        setMinimized(!minimized);
    };

    return (
        <Dialog
            isOpen={open}
            portalClassName={classNames("new-task-popup-dialog-portal", { minimized })}
            className={classNames("new-task-popup-dialog", { minimized })}
            backdropClassName="new-task-popup-dialog-backdrop"
            canOutsideClickClose={!canMinimize}
            // hasBackdrop={!canMinimize}
            onClose={() => handleClose()}
            onClosed={handleClosed}
            aria-labelledby="new-task-dialog"
        >
            {canMinimize && (
                <div className={Classes.DIALOG_HEADER}>
                    <h6 className={Classes.HEADING}>New task</h6>
                    <div>
                        {!minimized && <InfoPopup />}
                        <Button
                            icon={<Icon icon={minimized ? "maximize-01" : "minus"} size={14} />}
                            size="small"
                            variant="minimal"
                            onClick={handleToggleMimimize}
                            data-testid="new-task-dialog-minimize-button"
                        />
                        <Button
                            icon={<Icon icon="close" />}
                            size="small"
                            variant="minimal"
                            onClick={() => handleClose()}
                            data-testid="new-task-dialog-close-button"
                        />
                    </div>
                </div>
            )}
            <Grid padding={[15, 15]} gap={20} className="new-task-popup-dialog-body">
                <div className="new-task-popup__header">
                    {!canMinimize && (
                        <div className="new-task-popup__info">
                            <InfoPopup small />
                        </div>
                    )}
                    <Grid gap={5}>
                        <Textarea
                            className="new-task-popup__title"
                            autoFocus
                            value={title}
                            placeholder={translate(parent ? "Subtask title" : "Task title")}
                            ref={setTitleRef}
                            onKeyDown={handleKeyDownTitle}
                            onKeyUp={handleKeyUp}
                            onValueChange={setTitle}
                            data-testid="new-task-title-input"
                        />
                        {count <= 1 && (
                            <Textarea
                                value={description}
                                placeholder={translate("Description")}
                                onKeyDown={handleKeyDownDescription}
                                onValueChange={setDescription}
                                data-testid="new-task-description-input"
                            />
                        )}
                    </Grid>
                </div>

                <Grid gap={10}>
                    <div>
                        <Row>
                            <Col align="center" gap="5px 10px" wrap>
                                <TaskAssignees
                                    assignees={assignees}
                                    showEmpty
                                    minimal
                                    max={3}
                                    onToggle={handleToggleAssignee}
                                    onClear={() => setAssignees([])}
                                />
                                <PriorityPicker
                                    value={priority}
                                    showEmpty
                                    minimal
                                    tooltip={translate("Add priority")}
                                    onChange={setPriority}
                                />
                                <TaskStatus value={status} minimal onToggle={setStatus} />

                                <TaskDate
                                    duedate={dueDate}
                                    startdate={startDate}
                                    onChange={handleDatesChange}
                                />

                                {doDate && (
                                    <DatePicker value={doDate} onChange={setDoDate}>
                                        <RoundButton
                                            tooltip={
                                                <>
                                                    To do on: <DateLabel date={doDate} />
                                                </>
                                            }
                                            intent={Intent.PRIMARY}
                                            icon="calendar-check-02"
                                        />
                                    </DatePicker>
                                )}

                                {tags.length === 0 ? (
                                    <TagsPickerPopupSync
                                        type={TAGTYPE.TAG}
                                        value={tags}
                                        section={TAGSECTION.PROJECTS}
                                        onToggle={setTags}
                                    >
                                        <RoundButton dashed icon="tag" tooltip={translate("Add tags")} />
                                    </TagsPickerPopupSync>
                                ) : (
                                    <TagsWrapper>
                                        <TagsPickerPopupSync
                                            type={TAGTYPE.TAG}
                                            value={tags}
                                            section={TAGSECTION.PROJECTS}
                                            onToggle={setTags}
                                        >
                                            <RoundButton dashed small tooltip={translate("Add more tags")} />
                                        </TagsPickerPopupSync>
                                        <Tags
                                            value={tags}
                                            section={TAGSECTION.PROJECTS}
                                            max={3}
                                            onRemove={handleToggleTag}
                                        />
                                    </TagsWrapper>
                                )}
                            </Col>
                        </Row>
                    </div>

                    <div>
                        <Row gutter={15}>
                            <Col align="center" gap={5} fill>
                                {canChangeProject ? (
                                    <>
                                        <small className={Classes.TEXT_DISABLED}>Project</small>
                                        <ProjectSelect projectId={project} onChage={handleSetProject} />
                                    </>
                                ) : null}
                                {project ? (
                                    <>
                                        <small className={Classes.TEXT_DISABLED}>in</small>
                                        <StackSelect
                                            projectId={project}
                                            stackId={stack}
                                            onChange={setStack}
                                        />
                                        {stack && (
                                            <small
                                                className={Classes.TEXT_DISABLED}
                                                style={{ flexShrink: 0 }}
                                            >
                                                {top ? "on top" : "at the bottom"}
                                            </small>
                                        )}
                                    </>
                                ) : null}
                            </Col>
                            <Col justify="right" gap={10} collapse>
                                <Button
                                    variant="minimal"
                                    onClick={() => handleClose()}
                                    data-testid="new-task-dialog-cancel-button"
                                >
                                    {translate("Cancel")}
                                </Button>
                                <Button
                                    intent={Intent.PRIMARY}
                                    onClick={() => handleSaveTask()}
                                    loading={saving}
                                    data-testid="new-task-dialog-save-button"
                                >
                                    {count > 1 ? translate("Add tasks", { count }) : translate("Add task")}
                                </Button>
                            </Col>
                        </Row>
                    </div>
                </Grid>
            </Grid>
        </Dialog>
    );
};

interface IProjectSelectProps {
    projectId: string | null;
    onChage: (projectId: string) => void;
}
const ProjectSelect: FunctionComponent<IProjectSelectProps> = ({ projectId, onChage }) => {
    const projects: TreeNode[] = RecordActions.getProjects();

    const selectedProject: TreeNode | undefined = useMemo(() => {
        return projects.find(proj => proj.id === projectId);
    }, [projectId]);

    const handleSelectProject = (project: string) => {
        if (project === projectId) return;
        onChage(project);
    };

    return (
        <Popover
            content={
                projects.length > 0 ? (
                    <Scroller maxHeight={400} vertical thin>
                        <Menu data-testid="project-select-menu">
                            {projects.map(project => (
                                <MenuItem
                                    key={project.id}
                                    text={project.title}
                                    icon={<Icon icon={APPICONS.PROJECT} />}
                                    labelElement={
                                        projectId === project.id ? <Icon icon="check" /> : undefined
                                    }
                                    onClick={() => handleSelectProject(project.id)}
                                />
                            ))}
                        </Menu>
                    </Scroller>
                ) : (
                    <BlankSlate
                        icon={APPICONS.PROJECT}
                        title="No projects"
                        description="You don't have any projects yet. Please create a project before adding a task"
                        maxWidth={200}
                        small
                    />
                )
            }
            placement="right-start"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...rest }) => (
                <Tag
                    minimal
                    interactive
                    icon={
                        selectedProject ? (
                            <Icon
                                icon={selectedProject.title === "Inbox" ? APPICONS.INBOX : APPICONS.PROJECT}
                                size={10}
                            />
                        ) : null
                    }
                    data-testid="project-select-button"
                    {...rest}
                >
                    {selectedProject ? selectedProject.title : "Select project"}
                </Tag>
            )}
        />
    );
};

interface IInfoPopupProps {
    small?: boolean;
}
const InfoPopup: FunctionComponent<IInfoPopupProps> = ({ small }) => {
    const helpText = useMemo(() => {
        return (
            <div style={{ maxWidth: 300 }}>
                <p className={Classes.TEXT_MUTED}>
                    The task title field allows the use of special characters, which will assist with
                    autocompleting task options as you type.
                </p>

                <table
                    className={classNames([
                        Classes.HTML_TABLE,
                        Classes.HTML_TABLE_BORDERED,
                        Classes.HTML_TABLE_STRIPED,
                    ])}
                    style={{ width: "100%" }}
                >
                    <thead>
                        <tr>
                            <th>Char</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <strong>@</strong>
                            </td>
                            <td>Assign a person</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>#</strong>
                            </td>
                            <td>Toggle a tag</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>%</strong>
                            </td>
                            <td>Toggle a status</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>!</strong>
                            </td>
                            <td>Assign a priority</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>^</strong>
                            </td>
                            <td>Set dates</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>:</strong>
                            </td>
                            <td>Emoji</td>
                        </tr>
                        <tr>
                            <td>
                                <strong>Ctrl+Enter</strong>
                            </td>
                            <td>Saves and opens the task (when focusing the title)</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        );
    }, []);

    return (
        <Popover
            content={helpText}
            placement="bottom-end"
            interactionKind="hover"
            popoverClassName="popover-padded-medium"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ref, ...popoverProps }) =>
                small ? (
                    <Icon icon="info-circle" size={14} ref={ref} {...popoverProps} />
                ) : (
                    <Button
                        size="small"
                        variant="minimal"
                        icon={<Icon icon="info-circle" size={14} />}
                        ref={ref}
                        {...popoverProps}
                    />
                )
            }
        />
    );
};

export const NewTaskWrapper = () => {
    const isNewTaskVisible = GlobalStore.use(state => state.isNewTaskVisible, strictEqual);

    const handleClose = () => {
        toggleNewTask();
    };

    if (!isNewTaskVisible) return null;

    return <NewTaskPopup onClose={handleClose} canMinimize canChangeProject />;
};
