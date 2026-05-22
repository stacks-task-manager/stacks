// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    ButtonGroup,
    H4,
    InputGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    ResizeSensor,
    SegmentedControl,
    Tooltip,
} from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { shallowEqual } from "app/hooks/store";
import classNames from "classnames";
import mousetrap from "mousetrap";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
    APPICONS,
    IPerson,
    PEOPLE_GROUPING_TYPE,
    PEOPLE_GROUPING_TYPE_ICONS,
    ROLE_SECTIONS,
    TAGSECTION,
    TIMELOG_STATUS,
} from "@stacks/types";
import { Icon, PopupNewGeneric, ReloadButton, ToolbarButton } from "app/components/common";
import { useCanAccess, usePeopleHasFilters, useViewType } from "app/hooks";
import { PeopleActions, PersonTimesheetActions, TimesheetApprovalActions } from "app/store/actions";
import { PeopleStore, PeopleViewType } from "app/store/people";
import { PersonTimesheetStore } from "app/store/personTimesheet";
import { ApprovalGroupBy, TimesheetApprovalStore } from "app/store/timesheetApprovals";
import dialog from "app/utils/dialog";
import { BetaButton, ImportDialog, ImportSelectedFields, TagsStatusesManager } from "app/widgets/common";
import { NewPersonPopover, TIMELOG_STATUS_MAP } from "app/widgets/people";
import { format, isThisMonth, isThisWeek } from "date-fns";
import { PEOPLE_VIEW_TYPE_LABELS } from "app/locale/dynamic-messages";

interface IPeopleView {
    id: PeopleViewType;
    icon: string;
}

const PEOPLE_VIEWS: IPeopleView[] = [
    { id: "contacts", icon: "users" },
    { id: "companies", icon: "building-07" },
    { id: "roles", icon: "user-square" },
    { id: "timesheet", icon: "clock-stopwatch" },
    { id: "approvals", icon: "clock-check" },
];

const PEOPLE_IMPORT_COLUMNS = [
    {
        id: "firstName",
        title: translate("First name"),
        required: true,
    },
    {
        id: "lastName",
        title: translate("Last name"),
        required: true,
    },
    {
        id: "email",
        title: translate("Email"),
        required: true,
    },
    {
        id: "nickname",
        title: translate("Nickname"),
    },
    {
        id: "jobTitle",
        title: translate("Job title"),
    },
    {
        id: "officePhone",
        title: translate("Office phone"),
    },
    {
        id: "cellPhone",
        title: translate("Cell phone"),
    },
    {
        id: "homePhone",
        title: translate("Home phone"),
    },
    {
        id: "fax",
        title: translate("Fax"),
    },
    {
        id: "address",
        title: translate("Address"),
    },

    {
        id: "county",
        title: translate("County State"),
    },
    {
        id: "zip",
        title: translate("Zip Postal Code"),
    },
    {
        id: "city",
        title: translate("City"),
    },
    {
        id: "country",
        title: translate("Country"),
    },

    {
        id: "website",
        title: translate("Website"),
    },
    {
        id: "notes",
        title: translate("Notes"),
    },
    {
        id: "personalId",
        title: translate("ID"),
    },
];

const NARROW_WIDTH = 990;

export const ToolbarPeople = () => {
    const toolbarRef = useRef<HTMLDivElement | null>(null);
    const viewType = useViewType();
    const [showTagsMgr, setShowTagsMgr] = useState(false);
    const [visibleImport, setVisibleImport] = useState(false);
    const [narrow, setNarrow] = useState(false);

    useEffect(() => {
        // PEOPLE_VIEWS.filter((view: IPeopleView) => {
        //     if (!canViewCompanies && view.id === "companies") return false;
        //     return true;
        // }).forEach((view: IPeopleView, index: number) =>
        //     mousetrap.bind([`ctrl+${index + 1}`], () => PeopleActions.changeViewType(view.id))
        // );

        mousetrap.bind(["ctrl+f"], () => {
            PeopleActions.toggleFilters();
        });
        mousetrap.bind(["ctrl+n", "command+n"], () => {
            const btn = document.getElementById("add-new-people");
            if (btn) btn.click();
        });

        mousetrap.bind("left", () => {
            if (viewType === "timesheet") {
                PersonTimesheetActions.prevInterval();
            } else if (viewType === "approvals") {
                TimesheetApprovalActions.prevInterval();
            }
        });

        mousetrap.bind("right", () => {
            if (viewType === "timesheet") {
                PersonTimesheetActions.nextInterval();
            } else if (viewType === "approvals") {
                TimesheetApprovalActions.nextInterval();
            }
        });

        mousetrap.bind("down", () => {
            if (viewType === "timesheet") {
                PersonTimesheetActions.currentInterval();
            } else if (viewType === "approvals") {
                TimesheetApprovalActions.currentInterval();
            }
        });

        return () => {
            // PEOPLE_VIEWS.filter((view: IPeopleView) => {
            //     if (!canViewCompanies && view.id === "companies") return false;
            //     return true;
            // }).forEach((view: IPeopleView, index: number) =>
            //     mousetrap.unbind([`meta+${index + 1}`])
            // );

            mousetrap.unbind(["meta+f"]);
            mousetrap.unbind(["ctrl+n", "command+n"]);
            mousetrap.unbind("left");
            mousetrap.unbind("right");
            mousetrap.unbind("down");
        };
    }, []);

    const handleResize = useCallback(
        (entries: ResizeObserverEntry[]) => {
            if (entries[0]?.contentRect.width <= NARROW_WIDTH) {
                if (narrow) return;
                setNarrow(true);
            } else if (entries[0]?.contentRect.width > NARROW_WIDTH) {
                if (!narrow) return;
                setNarrow(false);
            }
        },
        [narrow]
    );

    const handleToggleTagMgr = () => {
        setShowTagsMgr(!showTagsMgr);
    };

    const handleExport = (format: "json" | "excel") => {
        if (viewType === "contacts") {
            PeopleActions.exportPeople(format);
        } else if (viewType === "companies") {
            PeopleActions.exportCompanies(format);
        }
    };

    const handleImport = () => {
        setVisibleImport(true);
    };

    return (
        <ResizeSensor targetRef={toolbarRef} onResize={handleResize}>
            <div className="main-toolbar" ref={toolbarRef}>
                <div className="section-toolbar">
                    <div className="section-toolbar-side side">
                        <div className="section-toolbar-title">
                            <h1>{translate("People")}</h1>
                        </div>
                        <div className="section-toolbar-options">
                            <Popover
                                content={
                                    <Menu>
                                        <MenuItem
                                            text={translate("Tags Statuses")}
                                            icon={<Icon icon="tag" />}
                                            onClick={handleToggleTagMgr}
                                        />
                                        <MenuDivider />
                                        <MenuItem
                                            text={translate("Export")}
                                            icon={<Icon icon="download-04" />}
                                        >
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
                                        </MenuItem>
                                        <MenuItem text={translate("Import")} icon={<Icon icon="upload-04" />}>
                                            <MenuItem
                                                text={translate("Import from", { type: ".xlsx" })}
                                                icon={<Icon icon="upload-04" />}
                                                onClick={handleImport}
                                            />
                                        </MenuItem>
                                    </Menu>
                                }
                                placement="bottom"
                            >
                                <Button size="small" variant="minimal" icon={<Icon icon="chevron-down" />} />
                            </Popover>
                        </div>
                    </div>
                    <div className="section-toolbar-side fixed">
                        {viewType === "contacts" || viewType === "workload" || viewType === "companies" ? (
                            <PeopleSearch />
                        ) : null}

                        {viewType === "contacts" || viewType === "workload" || viewType === "companies" ? (
                            <span className="section-toolbar-divider" />
                        ) : null}

                        {viewType === "timesheet" ? <TimesheetNavigation /> : null}
                        {viewType === "approvals" ? <ApprovalNavigation /> : null}

                        {viewType === "contacts" ? <PeopleButtons /> : null}
                        {viewType === "companies" ? <AddCompanyButton /> : null}
                    </div>
                </div>
                <div className="section-toolbar">
                    <div className="section-toolbar-side">
                        <Tabs narrow={narrow} />
                    </div>
                    <div className="section-toolbar-side">
                        {viewType === "contacts" ? (
                            <>
                                <PeopleGroupingToggle />
                                <span className="section-toolbar-divider" />
                                <FilterButton />
                                <DeletePeopleButton />
                            </>
                        ) : null}

                        {viewType === "timesheet" ? <ShowWeekendsButton /> : null}
                        {viewType === "approvals" ? <ApprovalFilters /> : null}
                    </div>
                </div>

                {showTagsMgr ? (
                    <TagsStatusesManager
                        section={TAGSECTION.PEOPLE}
                        canUpdateTag
                        canRemoveTag
                        canUpdateStatus
                        canRemoveStatus
                        onClose={handleToggleTagMgr}
                    />
                ) : null}

                {visibleImport ? <PeopleImport onClose={() => setVisibleImport(false)} /> : null}
            </div>
        </ResizeSensor>
    );
};

const PeopleButtons = () => {
    const { read, write } = useCanAccess(ROLE_SECTIONS.PEOPLE);
    return (
        <>
            {read && (
                <ReloadButton
                    tooltip={translate("Reload people companies")}
                    placement="bottom-end"
                    onClick={PeopleActions.load}
                />
            )}

            {write && (
                <NewPersonPopover>
                    <ToolbarButton
                        id="add-new-people"
                        icon="user-add"
                        title={translate("Add person")}
                        placement="bottom-end"
                        minimal={false}
                        active
                    />
                </NewPersonPopover>
            )}
        </>
    );
};

const Tabs = ({ narrow }: { narrow: boolean }) => {
    const viewType = PeopleStore.use(state => state.viewType, shallowEqual);
    const { read: canViewPeople } = useCanAccess(ROLE_SECTIONS.PEOPLE);
    const { read: canViewCompanies } = useCanAccess(ROLE_SECTIONS.COMPANIES);
    const { read: canViewRoles } = useCanAccess(ROLE_SECTIONS.ROLES);
    const { read: canViewTimelogs } = useCanAccess(ROLE_SECTIONS.TIMELOGS);

    const tabsToRender = useMemo(() => {
        return PEOPLE_VIEWS.filter((view: IPeopleView) => {
            if (!canViewPeople && ["contacts", "workload"].includes(view.id)) return false;
            if (!canViewRoles && view.id === "roles") return false;
            if (!canViewCompanies && view.id === "companies") return false;
            if (["timesheet", "approvals"].includes(view.id) && !canViewTimelogs) return false;
            return true;
        });
    }, [PEOPLE_VIEWS, canViewCompanies, canViewRoles]);

    return useMemo(
        () => (
            <>
                {tabsToRender.map((view: IPeopleView) => (
                    <button
                        key={view.id}
                        className={classNames("view-type-button", { active: viewType === view.id })}
                        onClick={() => PeopleActions.changeViewType(view.id)}
                    >
                        <Icon icon={view.icon} size={14} />
                        {!narrow && PEOPLE_VIEW_TYPE_LABELS[view.id]}

                        {["timesheet", "approvals"].includes(view.id) && !narrow ? <BetaButton ml /> : null}
                    </button>
                ))}
            </>
        ),
        [tabsToRender, narrow, viewType]
    );
};

const TimesheetNavigation = () => {
    const { interval } = PersonTimesheetStore.use();
    const isCurrentWeek = isThisWeek(interval[0]);
    return (
        <>
            <H4 style={{ margin: 0 }}>
                {format(interval.at(0) ?? new Date(), "d")}-{format(interval.at(-1) ?? new Date(), "d")}{" "}
                {format(interval.at(0) ?? new Date(), "MMM y")}
            </H4>

            <span className="section-toolbar-divider" />

            <Button
                icon={<Icon icon="calendar-date" />}
                intent={isCurrentWeek ? Intent.NONE : Intent.PRIMARY}
                onClick={PersonTimesheetActions.currentInterval}
            >
                {translate("Jump to this week")}
            </Button>

            <ButtonGroup>
                <Button icon="chevron-left" onClick={PersonTimesheetActions.prevInterval} />
                <Button icon="chevron-right" onClick={PersonTimesheetActions.nextInterval} />
            </ButtonGroup>
        </>
    );
};

const ApprovalNavigation = () => {
    const { interval } = TimesheetApprovalStore.use();
    const isCurrentMonth = isThisMonth(interval[0]);
    return (
        <>
            <H4 style={{ margin: 0 }}>{format(interval.at(0) ?? new Date(), "MMM y")}</H4>

            <span className="section-toolbar-divider" />

            <Button
                icon={<Icon icon="calendar-date" />}
                intent={isCurrentMonth ? Intent.NONE : Intent.PRIMARY}
                onClick={TimesheetApprovalActions.currentInterval}
            >
                This month
            </Button>

            <ButtonGroup>
                <Button icon="chevron-left" onClick={TimesheetApprovalActions.prevInterval} />
                <Button icon="chevron-right" onClick={TimesheetApprovalActions.nextInterval} />
            </ButtonGroup>
        </>
    );
};

const ShowWeekendsButton = () => {
    const { showWeekends } = PersonTimesheetStore.use();

    const handleSubmit = async () => {
        const confirmed = await dialog.confirm(
            "Submit for review",
            "Are you sure you want to submit the weekly timesheet for review?"
        );

        if (!confirmed) return;

        await PersonTimesheetActions.submitReview();
    };

    return (
        <>
            <Button
                icon={<Icon icon={showWeekends ? "eye-off" : "eye"} />}
                variant="minimal"
                onClick={PersonTimesheetActions.toggleWeekendVisibility}
            >
                {showWeekends ? "Hide weekends" : "Show weekends"}
            </Button>
            <span className="section-toolbar-divider" />
            <Button intent={Intent.SUCCESS} onClick={handleSubmit}>
                Submit for review
            </Button>
        </>
    );
};

const ApprovalFilters = () => {
    const { status, groupBy } = TimesheetApprovalStore.use(
        state => ({
            status: state.status,
            groupBy: state.groupBy,
        }),
        shallowEqual
    );

    return (
        <>
            <SegmentedControl
                options={[
                    {
                        label: "Person",
                        value: "person",
                        icon: <Icon icon={APPICONS.PERSON} />,
                    },
                    {
                        label: "Project",
                        value: "project",
                        icon: <Icon icon={APPICONS.PROJECT} />,
                    },
                ]}
                value={groupBy}
                onValueChange={group => TimesheetApprovalActions.setGroupBy(group as ApprovalGroupBy)}
            />

            <span className="section-toolbar-divider" />

            <Popover
                content={
                    <Menu>
                        <MenuItem
                            icon={
                                <Icon
                                    color={TIMELOG_STATUS_MAP["all"].color}
                                    icon={TIMELOG_STATUS_MAP["all"].icon}
                                />
                            }
                            labelElement={status == null ? <Icon icon="check" /> : undefined}
                            onClick={() => TimesheetApprovalActions.setStatus("all")}
                            text={translate("All")}
                        />
                        <MenuDivider />
                        <MenuItem
                            icon={
                                <Icon
                                    color={TIMELOG_STATUS_MAP[TIMELOG_STATUS.INREVIEW].color}
                                    icon={TIMELOG_STATUS_MAP[TIMELOG_STATUS.INREVIEW].icon}
                                />
                            }
                            labelElement={
                                status === TIMELOG_STATUS.INREVIEW ? <Icon icon="check" /> : undefined
                            }
                            onClick={() => TimesheetApprovalActions.setStatus(TIMELOG_STATUS.INREVIEW)}
                            text={translate("In review")}
                        />
                        <MenuItem
                            icon={
                                <Icon
                                    color={TIMELOG_STATUS_MAP[TIMELOG_STATUS.APPROVED].color}
                                    icon={TIMELOG_STATUS_MAP[TIMELOG_STATUS.APPROVED].icon}
                                />
                            }
                            labelElement={
                                status === TIMELOG_STATUS.APPROVED ? <Icon icon="check" /> : undefined
                            }
                            onClick={() => TimesheetApprovalActions.setStatus(TIMELOG_STATUS.APPROVED)}
                            text={translate("Approved")}
                        />
                        <MenuItem
                            icon={
                                <Icon
                                    color={TIMELOG_STATUS_MAP[TIMELOG_STATUS.REJECTED].color}
                                    icon={TIMELOG_STATUS_MAP[TIMELOG_STATUS.REJECTED].icon}
                                />
                            }
                            labelElement={
                                status === TIMELOG_STATUS.REJECTED ? <Icon icon="check" /> : undefined
                            }
                            onClick={() => TimesheetApprovalActions.setStatus(TIMELOG_STATUS.REJECTED)}
                            text={translate("Rejected")}
                        />
                    </Menu>
                }
                minimal
                placement="bottom-end"
            >
                <Tooltip content={translate("Filter by timelogs status")} placement="bottom-end">
                    <Button
                        icon={
                            <Icon
                                color={TIMELOG_STATUS_MAP[status].color}
                                icon={TIMELOG_STATUS_MAP[status].icon}
                            />
                        }
                        endIcon={<Icon icon="chevron-down" />}
                    >
                        {TIMELOG_STATUS_MAP[status].label}
                    </Button>
                </Tooltip>
            </Popover>
        </>
    );
};

const PeopleSearch = () => {
    const { viewType, term } = PeopleStore.use(
        state => ({
            viewType: state.viewType,
            term: state.query,
        }),
        shallowEqual
    );
    const [query, setQuery] = useState("");

    useEffect(() => {
        if (term !== query) {
            setQuery(term);
        }
    }, [term]);

    const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.currentTarget.value);
        PeopleActions.setQuery(event.currentTarget.value);
    };

    return (
        <InputGroup
            value={query}
            leftIcon={<Icon icon="search" />}
            placeholder={
                viewType === "contacts" || viewType === "workload"
                    ? translate("Search person")
                    : translate("Search company")
            }
            round
            type="search"
            onChange={handleChangeQuery}
        />
    );
};

const PeopleGroupingToggle = () => {
    const grouping = PeopleStore.use(state => state.grouping, shallowEqual);

    return (
        <Popover
            content={
                <Menu>
                    <MenuItem
                        text={translate("Ungrouped")}
                        icon={<Icon icon={PEOPLE_GROUPING_TYPE_ICONS.UNGROUPED} />}
                        onClick={() => PeopleActions.setGrouping(PEOPLE_GROUPING_TYPE.UNGROUPED)}
                        labelElement={
                            grouping === PEOPLE_GROUPING_TYPE.UNGROUPED ? <Icon icon="check" /> : null
                        }
                    />
                    <MenuItem
                        text={translate("Company")}
                        icon={<Icon icon={PEOPLE_GROUPING_TYPE_ICONS.COMPANY} />}
                        onClick={() => PeopleActions.setGrouping(PEOPLE_GROUPING_TYPE.COMPANY)}
                        labelElement={
                            grouping === PEOPLE_GROUPING_TYPE.COMPANY ? <Icon icon="check" /> : null
                        }
                    />
                </Menu>
            }
            placement="bottom-end"
        >
            <Button
                size="small"
                variant="minimal"
                icon={
                    <Icon
                        icon={
                            PEOPLE_GROUPING_TYPE_ICONS[
                            grouping.toUpperCase() as unknown as keyof typeof PEOPLE_GROUPING_TYPE_ICONS
                            ]
                        }
                    />
                }
                endIcon={<Icon icon="chevron-down" />}
            >
                {translate("Group by")}
                &nbsp;
                <strong>{translate(grouping === "company" ? "Company" : "Ungrouped")}</strong>
            </Button>
        </Popover>
    );
};

const FilterButton = () => {
    const hasFilters = usePeopleHasFilters();
    const filtersVisible = PeopleStore.use(state => state.filtersVisible, shallowEqual);

    return (
        <>
            {hasFilters ? (
                <Button
                    variant="minimal"
                    size="small"
                    icon={<Icon icon="trash" />}
                    intent={Intent.WARNING}
                    onClick={PeopleActions.resetFilters}
                >
                    {translate("Clear filter")}
                </Button>
            ) : null}

            <ToolbarButton
                icon={Boolean(hasFilters) ? "filter-filled" : "filter"}
                title={translate("Filters")}
                tooltip={translate("Filter people")}
                badge={Boolean(hasFilters)}
                keys={["meta", "F"]}
                placement="bottom-end"
                onClick={PeopleActions.toggleFilters}
                active={filtersVisible}
            />
        </>
    );
};

const AddCompanyButton = () => {
    return (
        <PopupNewGeneric
            placeholder={translate("Untitled company")}
            placement="bottom-end"
            buttonText="Add"
            onAdd={PeopleActions.addCompany}
        >
            <ToolbarButton
                id="add-new-people"
                icon="users-plus"
                title={translate("Add a company")}
                placement="bottom-end"
                minimal={false}
                active
            />
        </PopupNewGeneric>
    );
};

interface PeopleImportProps {
    onClose: () => void;
}
const PeopleImport: FunctionComponent<PeopleImportProps> = ({ onClose }) => {
    const [data, setData] = useState<Array<string[]>>([]);
    const [total, setTotal] = useState<number>(0);
    const [loading, setLoading] = useState(true);

    const handleLoadFile = async () => {
        console.log("Import people handleLoadFile not implemented");

        // const info: IElectronDialog = await dialog.showOpenDialog({
        //     title: "Select CSV file",
        //     buttonLabel: "Open",
        //     filters: [
        //         {
        //             name: "CSV",
        //             extensions: ["csv"],
        //         },
        //     ],
        //     properties: ["openFile"],
        // });

        // if (!info.canceled && info.filePaths.length) {
        //     const records = await api("import/readCSV", { csvPath: info.filePaths.at(0) });

        //     setData(records);
        //     setTotal(records.length);
        //     setLoading(false);
        // } else {
        //     onClose();
        // }
    };

    useEffect(() => {
        handleLoadFile();
    }, []);

    return (
        <ImportDialog
            columns={PEOPLE_IMPORT_COLUMNS}
            data={data.slice(0, 5)}
            total={total}
            loading={loading}
            onSave={handleSave}
            onClose={onClose}
        />
    );

    async function handleSave(fields: ImportSelectedFields) {
        for (const csv of data) {
            const person: { [key: string]: string } = {
                gender: "other",
                created: new Date().toJSON(),
            };

            for (const field of Object.keys(fields)) {
                const index: number = fields[field];

                person[field] = csv[index];
            }

            await PeopleActions.addPerson(person as Partial<IPerson>, false);
        }
    }
};

const DeletePeopleButton = () => {
    const selected = PeopleStore.use(state => state.selectedPeople, shallowEqual);

    if (!selected.length) return null;

    return (
        <>
            <span className="section-toolbar-divider" />
            <ToolbarButton
                icon="trash"
                intent={Intent.DANGER}
                title="Delete selected"
                onClick={PeopleActions.removeAlertBatch}
            />
        </>
    );
};
