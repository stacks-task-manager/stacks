// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Classes,
    Colors,
    FormGroup,
    InputGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    ResizeSensor,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { PROJECT_VIEWS_LABELS, TABLE_GROUPING_LABEL_LABELS } from "app/locale/dynamic-messages";
import classNames from "classnames";
import { differenceInDays, format } from "date-fns";
import mousetrap from "mousetrap";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import {
    APPICONS,
    GROUPING_TYPE,
    GROUPING_TYPE_ICONS,
    IProjectView,
    PROJECTHEALTH,
    PROJECT_DEFAULT_VIEWS,
    PROJECT_VIEWS,
    ROLE_SECTIONS,
    TAGSECTION,
} from "@stacks/types";
import { Avatar, Col, Icon, ReloadButton, Row, ToolbarButton } from "app/components/common";
import { AutomationsDialog, ProjectHealth, QuickTimeLogPopover } from "app/components/project";
import {
    getCurrentProjectId,
    getDocument,
    getMe,
    getProject,
    useCanAccess,
    useCurrentProject,
    useHasFilters,
    useMe,
    useNav,
    useProject,
    useProjectActiveViews,
    useProjectLastView,
} from "app/hooks";
import { useProjectFilters } from "app/hooks/projectFilters";
import { shallowEqual } from "app/hooks/store";
import {
    OverviewActions,
    PeopleActions,
    ProjectFiltersActions,
    ProjectsActions,
    ProjectsStatusActions,
    RecordActions,
    TimelogsActions,
} from "app/store/actions";
import { showPermissions, toggleNewBookmark, toggleNewTask } from "app/store/global";
import { OverviewStore } from "app/store/overview";
import { TimelogsStore } from "app/store/timelogs";
import { formatDuration } from "app/utils/date";
import Storage from "app/utils/storage";
import toast from "app/utils/toast";
import { share } from "app/utils/url";
import { TableStore, setGrouping } from "app/views/Project/Table/store";
import { ArchivedTasksDialog, ProjectTemplateDialog, ToolbarTitle } from "app/widgets";
import { DocumentPrivacyButton, DocumentTintMenuItem, TagsStatusesManager } from "app/widgets/common";

const NARROW_WIDTH = 1050;
const SUPER_NARROW_WIDTH = 680;

export const ProjectToolbar = () => {
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const lastViewType = useProjectLastView();
    const { id: projectId } = useParams();
    const [narrow, setNarrow] = useState(false);
    const [superNarrow, setSuperNarrow] = useState(false);
    const [manageAutomations, setManageAutomations] = useState(false);
    const [showTagsMgr, setShowTagsMgr] = useState(false);
    const [showArchives, setShowArchives] = useState(false);
    const [showTemplate, setShowTemplate] = useState(false);

    const handleToggleAutomations = () => {
        setManageAutomations(!manageAutomations);
    };

    const handleToggleTagsMgr = useCallback(() => {
        setShowTagsMgr(!showTagsMgr);
    }, []);

    const handleToggleVisibility = useCallback(() => {
        const record = getDocument(projectId);
        if (!record) return;

        showPermissions(record.permissions, updatedPermissions => {
            RecordActions.updatePermissions(record.id, updatedPermissions);
        });
    }, [projectId]);

    const handleToggleArchives = useCallback(() => {
        setShowArchives(true);
    }, []);

    const handleResize = useCallback(
        (entries: ResizeObserverEntry[]) => {
            if (entries[0]?.contentRect.width <= NARROW_WIDTH) {
                if (!narrow) {
                    setNarrow(true);
                }
            } else if (entries[0]?.contentRect.width > NARROW_WIDTH) {
                if (narrow) {
                    setNarrow(false);
                }
            }

            if (entries[0]?.contentRect.width <= SUPER_NARROW_WIDTH) {
                if (superNarrow) return;
                setSuperNarrow(true);
            } else if (entries[0]?.contentRect.width > SUPER_NARROW_WIDTH) {
                if (!superNarrow) return;
                setSuperNarrow(false);
            }
        },
        [narrow, superNarrow]
    );

    if (!projectId) {
        return <ProjectToolbarLoading />;
    }

    return (
        <ResizeSensor targetRef={toolbarRef} onResize={handleResize}>
            <div className="main-toolbar" ref={toolbarRef} data-testid="project-toolbar">
                <div className="section-toolbar">
                    <div className="section-toolbar-side side">
                        <div className="section-toolbar-title">
                            <ToolbarTitle documentId={projectId} />
                        </div>
                        <div className="section-toolbar-options">
                            <ProjectMenuButton
                                projectId={projectId}
                                viewType={lastViewType}
                                onToggleAutomations={handleToggleAutomations}
                                onToggleTagsMgr={handleToggleTagsMgr}
                                onTogglePrivacy={handleToggleVisibility}
                                onToggleArchives={handleToggleArchives}
                            />

                            <ProjectInfoButton />

                            <FavoriteProject />

                            <ProjectExpirationIcon />

                            <DocumentPrivacyButton documentId={projectId} onClick={handleToggleVisibility} />
                        </div>
                    </div>
                    <div className="section-toolbar-side fixed">
                        <ProjectSecondaryToolbar small={superNarrow} />
                    </div>
                </div>
                <div className="section-toolbar">
                    <div className="section-toolbar-side">
                        <ProjectViewTabs narrow={narrow} />
                    </div>

                    <div className="section-toolbar-side">
                        {!superNarrow && (
                            <>
                                {["list"].includes(lastViewType) ? <TableGroupingToggle /> : null}

                                {["list"].includes(lastViewType) ? (
                                    <span className="section-toolbar-divider" />
                                ) : null}

                                {["board", "list", "time", "gantt"].includes(lastViewType) ? (
                                    <FilterButton />
                                ) : null}
                            </>
                        )}
                    </div>
                </div>
                {/* {memoizedSecondaryToolbar} */}

                {manageAutomations && <AutomationsDialog onClose={handleToggleAutomations} />}

                {showTagsMgr ? (
                    <TagsStatusesManager
                        section={TAGSECTION.PROJECTS}
                        canUpdateTag
                        canRemoveTag
                        canUpdateStatus
                        canRemoveStatus
                        parentId={projectId}
                        onClose={handleToggleTagsMgr}
                    />
                ) : null}

                {showTemplate && <ProjectTemplateDialog onClose={() => setShowTemplate(false)} />}
                {showArchives && <ArchivedTasksDialog onClose={() => setShowArchives(false)} />}
            </div>
        </ResizeSensor>
    );
};

interface ProjectMenuProps {
    projectId: string;
    viewType: string;
    onToggleAutomations: () => void;
    onToggleTagsMgr: () => void;
    onTogglePrivacy: () => void;
    onToggleArchives: () => void;
}

const ProjectMenuButton: FunctionComponent<ProjectMenuProps> = props => {
    return (
        <Popover content={<ProjectMenu {...props} />} lazy placement="bottom">
            <Button
                size="small"
                variant="minimal"
                icon={<Icon icon="chevron-down" />}
                data-testid="project-menu-button"
            />
        </Popover>
    );
};

const ProjectMenu = ({
    projectId,
    viewType,
    onToggleAutomations,
    onToggleTagsMgr,
    onTogglePrivacy,
    onToggleArchives,
}: ProjectMenuProps) => {
    const nav = useNav();
    const { read: canViewSettings } = useCanAccess(ROLE_SECTIONS.PROJECT_SETTINGS);

    const handleDeleteProject = async () => {
        const me = getMe();
        const project = getProject(projectId);
        if (project?.projectOwner !== me.id) {
            toast.warn(
                "You do not have permission to delete this project! Only the project owner can delete the project."
            );
            return;
        }

        const deleted = await RecordActions.removeDocumentAlert(projectId);

        if (deleted) {
            ProjectsActions.removeById(projectId);
            toast.success("Project deleted successfully");
            nav("/");
        }
    };

    const handleExport = (type: "pdf" | "excel" | "json") => {
        const projectId = getCurrentProjectId();
        ProjectsActions.exportProject(projectId, type);
    };

    const handleDuplicate = () => {
        const projectId = getCurrentProjectId();
        ProjectsActions.duplicateAlert(projectId);
    };

    const handleShareLink = () => {
        const projectId = getCurrentProjectId();
        share(`p/${projectId}`);
    };
    return (
        <Menu>
            {canViewSettings && (
                <>
                    <MenuItem
                        text={translate("Project settings")}
                        icon={<Icon icon="settings-04" />}
                        onClick={ProjectsStatusActions.toggleSettingsVisibility}
                    />
                    <MenuDivider />
                    <MenuItem
                        text={translate("Automations")}
                        icon={<Icon icon="cpu-chip-01" />}
                        onClick={onToggleAutomations}
                    />
                </>
            )}

            <MenuItem
                text={translate("Tags Statuses")}
                icon={<Icon icon="tag" />}
                onClick={onToggleTagsMgr}
            />
            <DocumentTintMenuItem documentId={projectId} />
            <MenuDivider />
            <MenuItem
                text={translate("Duplicate project")}
                icon={<Icon icon="copy" />}
                onClick={handleDuplicate}
            />
            <MenuItem
                text={translate("Bookmark")}
                icon={<Icon icon="bookmark" />}
                onClick={toggleNewBookmark}
            />
            {/* <MenuItem
                        text="Make template"
                        icon={<Icon icon="certificate-02" />}
                        onClick={() => setShowTemplate(true)}
                    /> */}
            <MenuItem text={translate("Export")} icon={<Icon icon="download-04" />}>
                <MenuItem
                    text={translate("Export as", { type: ".xlsx" })}
                    icon={<Icon icon="download-04" />}
                    onClick={() => handleExport("excel")}
                />
                <MenuItem
                    text={translate("Export as", { type: ".json" })}
                    icon={<Icon icon="download-04" />}
                    onClick={() => handleExport("json")}
                />
                {viewType === "overview" ? (
                    <MenuItem
                        text={translate("Export as", { type: ".pdf" })}
                        icon={<Icon icon="download-04" />}
                        onClick={() => handleExport("pdf")}
                    />
                ) : null}
            </MenuItem>
            <MenuItem
                text={translate("Share link")}
                icon={<Icon icon="link-01" />}
                onClick={handleShareLink}
            />

            <MenuDivider />
            <MenuItem
                text={`${translate("Privacy")}...`}
                icon={<Icon icon="lock-01" />}
                onClick={onTogglePrivacy}
            />
            <MenuDivider />

            <ArchiveOptions projectId={projectId} onToggleArchives={onToggleArchives} />

            <MenuItem
                text={`${translate("Delete project")}...`}
                intent={Intent.DANGER}
                icon={<Icon icon="trash" />}
                onClick={handleDeleteProject}
                data-testid="delete-project-button"
            />
        </Menu>
    );
};

const ArchiveOptions = ({
    projectId,
    onToggleArchives,
}: {
    projectId: string;
    onToggleArchives: () => void;
}) => {
    const me = useMe();
    const { project } = useProject(projectId);

    if (!me) return null;
    if (!project) return null;
    if (project.projectOwner !== me.id && !me.admin) return null;

    return (
        <>
            <MenuItem text={translate("Archives")} icon={<Icon icon={APPICONS.ARCHIVED} />}>
                <MenuItem
                    text={translate("Show archived tasks")}
                    icon={<Icon icon={APPICONS.ARCHIVED} />}
                    onClick={onToggleArchives}
                />
                <MenuDivider />
                <MenuItem
                    text={translate("Archive completed tasks")}
                    intent={Intent.WARNING}
                    icon={<Icon icon={APPICONS.ARCHIVED} />}
                    onClick={() => ProjectsActions.archiveCompletedAlert(projectId)}
                />
            </MenuItem>
            <MenuDivider />
        </>
    );
};

const ProjectViewTabs = ({ narrow }: { narrow: boolean }) => {
    const lastViewType = useProjectLastView();
    const activeViews = useProjectActiveViews();

    useEffect(() => {
        PROJECT_VIEWS.filter((view: IProjectView) =>
            (activeViews || PROJECT_DEFAULT_VIEWS).includes(view.id)
        ).forEach((view: IProjectView, index: number) =>
            mousetrap.bind([`meta+${index + 1}`, `ctrl+${index + 1}`], () =>
                ProjectsStatusActions.setCurrentView(view.id)
            )
        );

        return () => {
            PROJECT_VIEWS.filter((view: IProjectView) =>
                (activeViews || PROJECT_DEFAULT_VIEWS).includes(view.id)
            ).forEach((view: IProjectView, index: number) =>
                mousetrap.unbind([`meta+${index + 1}`, `ctrl+${index + 1}`])
            );
        };
    }, []);

    const memoizedViews = useMemo(() => {
        const enabledView = PROJECT_VIEWS.filter((view: IProjectView) =>
            (activeViews || PROJECT_DEFAULT_VIEWS).includes(view.id)
        );

        return enabledView.map((view: IProjectView) => (
            <Tooltip
                key={view.id}
                disabled={!narrow}
                content={PROJECT_VIEWS_LABELS[view.id]}
                placement="bottom"
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...props }) => (
                    <button
                        {...props}
                        className={classNames("view-type-button", { active: lastViewType === view.id })}
                        onClick={() => ProjectsStatusActions.setCurrentView(view.id)}
                    >
                        <Icon icon={view.icon} />
                        {!narrow ? PROJECT_VIEWS_LABELS[view.id] : null}
                    </button>
                )}
            />
        ));
    }, [lastViewType, activeViews, narrow]);

    const memoizedHiddenViews = useMemo(() => {
        return (
            <Popover
                content={
                    <Menu>
                        {PROJECT_VIEWS.map((view: IProjectView) => (
                            <MenuItem
                                key={view.id}
                                icon={<Icon icon={view.icon} />}
                                text={PROJECT_VIEWS_LABELS[view.id]}
                                labelElement={
                                    (activeViews || PROJECT_DEFAULT_VIEWS).includes(view.id) ? (
                                        <Icon icon="check" />
                                    ) : null
                                }
                                shouldDismissPopover={false}
                                onClick={() => ProjectsStatusActions.setToggleViewVisibility(view.id)}
                            />
                        ))}
                    </Menu>
                }
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...props }) => (
                    <button {...props} className="view-type-button views">
                        <Icon icon="plus" />
                        {translate("Views")}
                    </button>
                )}
            />
        );
    }, [lastViewType, activeViews]);

    return (
        <>
            {memoizedViews}
            {memoizedHiddenViews}
        </>
    );
};

const ProjectSecondaryToolbar = ({ small }: { small: boolean }) => {
    const lastViewType = useProjectLastView();
    const projectId = getCurrentProjectId();

    const handleReloadProject = async () => {
        await ProjectsActions.loadOne(projectId, { force: true });
    };

    const handleReloadTime = () => {
        TimelogsActions.load({ project: projectId });
    };

    const memoizedSecondaryToolbar = useMemo(() => {
        if (lastViewType === "attachments") return <AttachmentsSearch />;
        if (lastViewType === "links") return <LinksSearch />;

        if (lastViewType === "time")
            return (
                <>
                    <ToolbarButton
                        icon="refresh"
                        tooltip="Reload time"
                        placement="bottom-end"
                        onClick={handleReloadTime}
                    />

                    <span className="section-toolbar-divider" />

                    <QuickTimeLogPopover projectId={projectId} placement="bottom-end" changeTask>
                        <ToolbarButton
                            icon="plus"
                            title={translate("Log time")}
                            placement="bottom-end"
                            minimal={false}
                            active
                        />
                    </QuickTimeLogPopover>
                </>
            );

        if (!["board", "list", "gantt"].includes(lastViewType)) return null;

        return (
            <>
                {!small && (
                    <>
                        <ProjectSearch />
                        <span className="section-toolbar-divider" />

                        <ReloadButton
                            tooltip={translate("Reload project")}
                            placement="bottom-end"
                            onClick={handleReloadProject}
                        />
                    </>
                )}

                <ToolbarButton
                    id="global-new-task-button"
                    icon="plus"
                    title={translate("Add task")}
                    tooltip={translate("Add a new task")}
                    keys={["meta", "N"]}
                    placement="bottom-end"
                    intent={Intent.PRIMARY}
                    minimal={false}
                    onClick={toggleNewTask}
                />
            </>
        );
    }, [lastViewType, small]);

    return <>{memoizedSecondaryToolbar}</>;
};

export const ProjectSearch = () => {
    const { filters } = useProjectFilters();
    const [query, setQuery] = useState("");
    const editing = useRef(false);

    useEffect(() => {
        if (filters && filters.query !== query && !editing.current) {
            setQuery(filters.query);
        }
    }, [filters]);

    const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        const value = event.currentTarget.value;
        setQuery(value);
        ProjectFiltersActions.setQuery(value);
    };

    return (
        <InputGroup
            value={query}
            leftIcon={<Icon icon="search" />}
            placeholder={`${translate("Quick search")}...`}
            round
            type="search"
            onFocus={() => (editing.current = true)}
            onBlur={() => (editing.current = false)}
            onChange={handleChangeQuery}
        />
    );
};

const AttachmentsSearch = () => {
    const debounce = useRef<NodeJS.Timeout | null>(null);

    const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.currentTarget.value;
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }

        debounce.current = setTimeout(() => {
            ProjectFiltersActions.setAttachmentsQuery(query);
        }, 500);
    };

    return (
        <InputGroup
            leftIcon={<Icon icon="search" />}
            placeholder={translate("Search attachments...")}
            round
            type="search"
            onChange={handleChangeQuery}
        />
    );
};

const LinksSearch = () => {
    const debounce = useRef<NodeJS.Timeout | null>(null);

    const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query = event.currentTarget.value;
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }

        debounce.current = setTimeout(() => {
            ProjectFiltersActions.setLinksQuery(query);
        }, 500);
    };

    return (
        <InputGroup
            leftIcon={<Icon icon="search" />}
            placeholder={translate("Search links...")}
            round
            type="search"
            onChange={handleChangeQuery}
        />
    );
};

const FavoriteProject = () => {
    const [isFavorite, setIsFavorite] = useState(false);
    const params = useParams();

    useEffect(() => {
        const favoriteProjects = Storage.get("favoriteProjects", true, []);

        if (favoriteProjects.includes(params.id)) {
            setIsFavorite(true);
        }
    }, []);

    const handleToggleFavorite = () => {
        ProjectsActions.toggleFavorite();
        setIsFavorite(!isFavorite);
    };

    return (
        <ToolbarButton
            icon={isFavorite ? "star-filled" : "star"}
            tooltip={isFavorite ? translate("Remove from favorites") : translate("Add to favorites")}
            placement="bottom"
            iconColor={isFavorite ? Colors.GOLD5 : undefined}
            onClick={handleToggleFavorite}
        />
    );
};

export const FilterButton = () => {
    const hasFilters = useHasFilters();
    const { isVisible: projectFiltersVisible } = useProjectFilters();
    const view = useProjectLastView();
    const timelogFiltersVisible = TimelogsStore.use(state => state.filtersVisible, shallowEqual);

    useEffect(() => {
        // open filter
        mousetrap.bind(["ctrl+f", "command+f"], handleToggleFilter);

        return () => {
            mousetrap.unbind(["ctrl+f", "command+f"]);
        };
    }, []);

    const isActive = useMemo(() => {
        return (view === "time" && timelogFiltersVisible) || (view !== "time" && projectFiltersVisible);
    }, [view, projectFiltersVisible, timelogFiltersVisible]);

    const handleToggleFilter = () => {
        if (view === "time") {
            TimelogsActions.toggleFilters();
        } else {
            const projectId = getCurrentProjectId();
            ProjectFiltersActions.toggleShow(projectId);
        }
    };

    return (
        <>
            {hasFilters ? (
                <Button
                    minimal
                    small
                    icon={<Icon icon="trash" />}
                    intent={Intent.WARNING}
                    onClick={ProjectFiltersActions.reset}
                >
                    {translate("Clear filters")}
                </Button>
            ) : null}

            <ToolbarButton
                icon={Boolean(hasFilters) ? "filter-filled" : "filter"}
                title={translate("Filters")}
                tooltip={view === "time" ? translate("Filter logged time") : translate("Filter project")}
                badge={Boolean(hasFilters)}
                keys={["meta", "F"]}
                placement="bottom-end"
                onClick={handleToggleFilter}
                active={isActive}
            />
        </>
    );
};

const TableGroupingToggle = () => {
    const { grouping } = TableStore.use();

    return (
        <Popover
            content={
                <Menu>
                    <MenuItem
                        text={translate("Stack")}
                        icon={<Icon icon={GROUPING_TYPE_ICONS.STACK} />}
                        onClick={() => setGrouping(GROUPING_TYPE.STACK)}
                        labelElement={grouping === GROUPING_TYPE.STACK ? <Icon icon="check" /> : null}
                    />
                    <MenuItem
                        text={translate("Ungrouped")}
                        icon={<Icon icon={GROUPING_TYPE_ICONS.UNGROUPED} />}
                        onClick={() => setGrouping(GROUPING_TYPE.UNGROUPED)}
                        labelElement={grouping === GROUPING_TYPE.UNGROUPED ? <Icon icon="check" /> : null}
                    />
                    <MenuItem
                        text={translate("Start date")}
                        icon={<Icon icon={GROUPING_TYPE_ICONS.STARTDATE} />}
                        onClick={() => setGrouping(GROUPING_TYPE.STARTDATE)}
                        labelElement={grouping === GROUPING_TYPE.STARTDATE ? <Icon icon="check" /> : null}
                    />
                    <MenuItem
                        text={translate("Due date")}
                        icon={<Icon icon={GROUPING_TYPE_ICONS.DUEDATE} />}
                        onClick={() => setGrouping(GROUPING_TYPE.DUEDATE)}
                        labelElement={grouping === GROUPING_TYPE.DUEDATE ? <Icon icon="check" /> : null}
                    />
                    <MenuItem
                        text={translate("Priority")}
                        icon={<Icon icon={GROUPING_TYPE_ICONS.PRIORITY} />}
                        onClick={() => setGrouping(GROUPING_TYPE.PRIORITY)}
                        labelElement={grouping === GROUPING_TYPE.PRIORITY ? <Icon icon="check" /> : null}
                    />
                    <MenuItem
                        text={translate("People")}
                        icon={<Icon icon={GROUPING_TYPE_ICONS.PEOPLE} />}
                        onClick={() => setGrouping(GROUPING_TYPE.PEOPLE)}
                        labelElement={grouping === GROUPING_TYPE.PEOPLE ? <Icon icon="check" /> : null}
                    />
                </Menu>
            }
            placement="bottom-end"
        >
            <Button
                small
                minimal
                icon={
                    <Icon
                        icon={
                            GROUPING_TYPE_ICONS[
                                grouping.toUpperCase() as unknown as keyof typeof GROUPING_TYPE_ICONS
                            ]
                        }
                    />
                }
                rightIcon={<Icon icon="chevron-down" />}
            >
                {translate("Group by")}
                &nbsp;
                <strong>{TABLE_GROUPING_LABEL_LABELS[grouping]}</strong>
            </Button>
        </Popover>
    );
};

const ProjectExpirationIcon = () => {
    const { project } = useCurrentProject();

    const diff = useMemo(() => {
        if (!project || (project && !project.endDate)) return null;
        return differenceInDays(new Date(project.endDate || new Date()), new Date());
    }, [project?.endDate]);

    if (!diff || diff > 10) return null;

    return (
        <ToolbarButton
            icon={diff <= 0 ? "bell-ringing-01" : "bell"}
            tooltip={
                diff <= 0 ? (
                    <>
                        {translate("This project ended")}:{" "}
                        {format(new Date(project?.endDate || new Date()), "PP")}
                    </>
                ) : (
                    translate("This project ends in days", { days: diff })
                )
            }
            placement="bottom"
            iconColor={diff <= 0 ? "#d90429" : "#ffb703"}
        />
    );
};

const ProjectInfoButton = () => {
    return (
        <Popover content={<ProjectInfoContent />} lazy popoverClassName="popover-padded">
            <ToolbarButton icon="info-circle" tooltip={translate("View project info")} placement="bottom" />
        </Popover>
    );
};

const ProjectInfoContent = () => {
    const { overview, isLoading: isLoadinOverview } = OverviewStore.use();
    const { project, isLoading: isLoadinProject } = useCurrentProject();
    const { write: canSaveSettings } = useCanAccess(ROLE_SECTIONS.PROJECT_SETTINGS);
    const view = useProjectLastView();

    const isLoading = isLoadinOverview || isLoadinProject;

    useEffect(() => {
        if (!project || view === "overview") return;
        OverviewActions.load(project.id);
    }, [project]);

    if (!project || !overview || isLoading) return <div>Loading...</div>;

    const { projectOwner, health } = project;

    const owner = projectOwner ? PeopleActions.getPerson(projectOwner) : null;

    const handleSetHealth = (health?: PROJECTHEALTH) => {
        ProjectsActions.setHealth(project.id, health);
    };

    return (
        <div>
            <FormGroup>
                <h6 className={Classes.HEADING}>
                    {translate("Tasks summary")} ({overview.tasksTotal})
                </h6>
                <div className="bp4-progress-bar continuous bp4-no-stripes" style={{ width: 200 }}>
                    <Tooltip
                        placement="top"
                        content={`Idle tasks (${overview.tasksIdle})`}
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ...tooltipProps }) => (
                            <div
                                {...tooltipProps}
                                className={classNames(Classes.PROGRESS_METER, "bg-alert")}
                                style={{
                                    width: `${Number(
                                        Math.round(overview.tasksIdle * 100) / overview.tasksTotal
                                    ).toFixed()}%`,
                                }}
                            />
                        )}
                    />
                    <Tooltip
                        placement="top"
                        content={`Tasks in progress (${overview.tasksInProgress})`}
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ...tooltipProps }) => (
                            <div
                                {...tooltipProps}
                                className={classNames(Classes.PROGRESS_METER, "bg-primary")}
                                style={{
                                    width: `${Number(
                                        Math.round(overview.tasksInProgress * 100) / overview.tasksTotal
                                    ).toFixed()}%`,
                                }}
                            />
                        )}
                    />
                    <Tooltip
                        placement="top"
                        content={`Completed tasks (${overview.tasksCompleted})`}
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ...tooltipProps }) => (
                            <div
                                {...tooltipProps}
                                className={classNames(Classes.PROGRESS_METER, "bg-success")}
                                style={{
                                    width: `${Number(
                                        Math.round(overview.tasksCompleted * 100) / overview.tasksTotal
                                    ).toFixed()}%`,
                                }}
                            />
                        )}
                    />
                </div>
            </FormGroup>

            <FormGroup>
                <h6 className={Classes.HEADING}>Estimated vs. Logged</h6>
                <div className="overview-legend">
                    <div className="overview-legend-row">
                        <div>
                            <i className="bg-primary" />
                            {translate("Total Estimates")}
                        </div>
                        <strong>{formatDuration(overview.timeEstimatedTotal)}</strong>
                    </div>
                    <div className="overview-legend-row">
                        <div>
                            <i className="bg-warning" />
                            {translate("Total Spent")}
                        </div>
                        <strong>{formatDuration(overview.timeLoggedTotal)}</strong>
                    </div>
                    <div className="overview-legend-row">
                        <div>
                            <i className="bg-success" />
                            {translate("Total Remaining")}
                        </div>
                        <strong>{formatDuration(overview.timeRemaining)}</strong>
                    </div>
                </div>
            </FormGroup>

            {owner && (
                <FormGroup>
                    <h6 className={Classes.HEADING}>Owner</h6>
                    <Row>
                        <Col align="center" gap={5}>
                            <Avatar person={owner} small />
                            <span>
                                {owner.firstName} {owner.lastName}
                            </span>
                        </Col>
                    </Row>
                </FormGroup>
            )}

            <FormGroup className="last">
                <h6 className={Classes.HEADING}>{translate("Project health")}</h6>
                <ProjectHealth value={health} onChange={handleSetHealth} disabled={!canSaveSettings} />
            </FormGroup>
        </div>
    );
};

export const ProjectToolbarLoading = () => {
    return (
        <div className="main-toolbar">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <InputGroup className={Classes.SKELETON} />
                    </div>
                    <div className="section-toolbar-options">
                        <Button className={Classes.SKELETON} />
                    </div>
                </div>
                <div className="section-toolbar-side fixed">
                    <InputGroup className={Classes.SKELETON} />
                    <Button className={Classes.SKELETON} />
                    <Button className={Classes.SKELETON} />
                    <Button className={Classes.SKELETON} />
                </div>
            </div>
            <div className="section-toolbar">
                <div className="section-toolbar-side">
                    {Array.from(Array(5).keys()).map(key => (
                        <button key={key} className={classNames("view-type-button", Classes.SKELETON)}>
                            Lorem
                        </button>
                    ))}
                </div>
                <div className="section-toolbar-side">
                    <Button className={Classes.SKELETON} />
                    <Button className={Classes.SKELETON}>Lorem ipsum</Button>
                </div>
            </div>
        </div>
    );
};
