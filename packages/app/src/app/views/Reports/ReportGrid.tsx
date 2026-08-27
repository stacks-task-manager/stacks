// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Colors, CompoundTag, Intent, Tag } from "@blueprintjs/core";
import { APPICONS, ITableColumns, PRIORITYICON, PROJECTHEALTH } from "@stacks/types";
import {
    BlankSlate,
    Icon,
    TablePersistent,
    TablePersistentCellProps,
    TablePersistentGroupData,
    TablePersistentSectionCellProps,
} from "app/components/common";
import { BigNumberCell, OverflowTextCell } from "app/components/common/Table/Cells";
import { ProjectHealth, TaskProgressCell, TaskSpentProgress, TaskState } from "app/components/project";
import { getPerson, useNav } from "app/hooks";
import { ProjectsActions } from "app/store/actions";
import { getBrowserLocale } from "app/utils/browser";
import { formatStringDuration, timeAgo } from "app/utils/date";
import { AssigneesSync, CompanyTableCell, ProjectsList } from "app/widgets";
import { differenceInDays, isBefore } from "date-fns";
import React, { CSSProperties, FunctionComponent } from "react";
import { useLocation } from "react-router-dom";

/** A single row in a report grid. Each report builder emits only the columns
 *  it needs, but the cell renderers assume the fields they touch are present;
 *  the index signature covers the dynamic cost/time columns accessed by name.
 *
 *  TODO(next phase): promote `ReportRow` (and the `ReportPayload` shape in
 *  ReportType.tsx) to `@stacks/types` once the server returns a typed report
 *  payload instead of `any[]` — then it becomes a genuine server↔client
 *  contract alongside `IReport`/`REPORT_TYPE`/`ITableColumns`. */
export interface ReportRow {
    id: string;
    groupId?: string;
    title?: string;
    project: { id: string; title?: string };
    company: string;
    owner: string;
    health: PROJECTHEALTH | null;
    stack: { id?: string; title?: string; tint?: string };
    task: { id: string; title?: string; done?: boolean };
    assignees: string[];
    person: string;
    projectsList: { id: string; title: string }[];
    currency: string;
    totalTasks: number;
    doneTasks: number;
    todoTasks: number;
    inProgressTasks: number;
    criticalTasks: number;
    highTasks: number;
    mediumTasks: number;
    lowTasks: number;
    dueTodayTasks: number;
    overdueTasks: number;
    openProjects: number;
    timeEstimated: number;
    timeLogged: number;
    billableTime: number;
    nonBillableTime: number;
    estimate: number;
    hourlyRate: number;
    cost: number;
    revenue: number;
    profit: number;
    updated: Date;
    completed: Date;
    duedate: Date;
    [key: string]: unknown;
}

/** Report data is either a flat list of rows or a list of grouped rows. */
export type ReportData = ReportRow[] | TablePersistentGroupData<ReportRow>[];

interface ReportGridProps {
    type: string;
    columns: ITableColumns<ReportRow>;
    data: ReportData;
}
export const ReportGrid: FunctionComponent<ReportGridProps> = ({ type, columns, data }) => {
    if (!data.length) {
        return (
            <BlankSlate
                icon={APPICONS.DATA}
                title={translate("No data")}
                description="There is not enough data to render this report"
                maxWidth={250}
            />
        );
    }

    return (
        <TablePersistent<ReportRow>
            id={type}
            sticky
            enableReorder={false}
            columns={columns}
            data={data}
            components={{
                cell: TableCell,
                groupCell: TableGroupCell,
            }}
        />
    );
};

function formatCurrency(value?: number) {
    const locale = getBrowserLocale();
    return new Intl.NumberFormat(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        value ?? 0
    );
}

/** A grouped report row (e.g. profitability) carries the group metadata plus
 *  the financial rollups rendered in the group header cells. */
interface ReportGroupRow extends TablePersistentGroupData<ReportRow> {
    currency?: string;
    estimate?: number;
    timeLogged?: number;
    hourlyRate?: number;
    cost?: number;
    revenue?: number;
    profit?: number;
}

const TableGroupCell: FunctionComponent<TablePersistentSectionCellProps<ReportRow>> = ({
    column,
    section,
}) => {
    const data = section as ReportGroupRow;

    const symbol = data.currency ? window.currencies[data.currency].symbol : "";

    if (column === "estimate") {
        return (
            <Tag
                minimal
                size="large"
                intent={(data.estimate ?? 0) < (data.timeLogged ?? 0) ? Intent.WARNING : Intent.PRIMARY}
            >
                {formatStringDuration(data.estimate ?? 0, "d")}
            </Tag>
        );
    } else if (column === "timeLogged") {
        return (
            <Tag
                minimal
                size="large"
                intent={(data.timeLogged ?? 0) > (data.estimate ?? 0) ? Intent.DANGER : Intent.NONE}
            >
                {formatStringDuration(data.timeLogged ?? 0, "d")}
            </Tag>
        );
    } else if (column === "hourlyRate") {
        return (
            <CompoundTag
                leftContent={symbol}
                round
                minimal
                size="large"
                intent={data.hourlyRate ?? 0 > 0 ? Intent.PRIMARY : Intent.NONE}
            >
                {formatCurrency(data.hourlyRate)}
            </CompoundTag>
        );
    } else if (column === "cost") {
        let intent: Intent = Intent.NONE;
        if (data.cost && data.cost !== 0) {
            intent = (data.cost ?? 0) > (data.revenue ?? 0) ? Intent.DANGER : Intent.SUCCESS;
        }

        return (
            <CompoundTag leftContent={symbol} round minimal size="large" intent={intent}>
                {formatCurrency(data.cost)}
            </CompoundTag>
        );
    } else if (column === "revenue") {
        let intent: Intent = Intent.NONE;
        if (data.revenue && data.revenue !== 0) {
            intent = (data.revenue ?? 0) < (data.cost ?? 0) ? Intent.WARNING : Intent.SUCCESS;
        }

        return (
            <CompoundTag leftContent={symbol} round minimal size="large" intent={intent}>
                {formatCurrency(data.revenue)}
            </CompoundTag>
        );
    } else if (column === "profit") {
        let intent: Intent = Intent.NONE;
        if (data.profit && data.profit !== 0) {
            intent = data.profit < 0 ? Intent.DANGER : Intent.SUCCESS;
        }

        return (
            <CompoundTag leftContent={symbol} round minimal size="large" intent={intent}>
                {formatCurrency(data.profit)}
            </CompoundTag>
        );
    }

    return null;
};

const TableCellPure: FunctionComponent<TablePersistentCellProps<ReportRow>> = ({ row, column }) => {
    const nav = useNav();
    const location = useLocation();

    if (column === "taskCompletion") {
        return (
            <TaskProgressCell
                value={row.totalTasks > 0 ? (row.doneTasks * 100) / row.totalTasks : 0}
                subtitle={translate("tasks left", { count: row.doneTasks })}
                large
            />
        );
    } else if (column === "company") {
        return <CompanyTableCell companyId={row.company} />;
    } else if (column === "owner" && row.owner != null) {
        return <AssigneesSync assignees={[row.owner]} />;
    } else if (column === "projectsList") {
        return <ProjectsList projects={row.projectsList} />;
    }

    // counter
    else if (
        [
            "totalTasks",
            "todoTasks",
            "doneTasks",
            "inProgressTasks",
            "criticalTasks",
            "highTasks",
            "mediumTasks",
            "lowTasks",
            "dueTodayTasks",
            "overdueTasks",
            "openProjects",
        ].includes(column)
    ) {
        return <CounterCell row={row} column={column} />;
    }

    // People
    else if (column === "assignees") {
        return <AssigneesSync assignees={row.assignees} />;
    } else if (column === "person") {
        const person = getPerson(row.person);
        return (
            <>
                <AssigneesSync assignees={[row.person]} /> {person?.firstName} {person?.lastName}
            </>
        );
    }

    // cost
    else if (["cost", "hourlyRate", "revenue", "profit"].includes(column)) {
        const locale = getBrowserLocale();
        const symbol = row.currency ? window.currencies[row.currency].symbol : "";
        const value = Number(row[column] ?? 0);

        return (
            <CompoundTag leftContent={symbol} round minimal intent={Intent.PRIMARY}>
                {new Intl.NumberFormat(locale).format(value)}
            </CompoundTag>
        );
    }

    // time estimation
    else if (["timeEstimated", "timeLogged", "billableTime", "nonBillableTime"].includes(column)) {
        const value = Number(row[column] ?? 0);
        const intent =
            column === "timeEstimated"
                ? Intent.PRIMARY
                : row.timeLogged > row.timeEstimated
                    ? Intent.WARNING
                    : Intent.SUCCESS;
        return (
            <Tag minimal intent={intent}>
                {formatStringDuration(value, "d")}
            </Tag>
        );
    } else if (column === "spentProgress") {
        return <TaskSpentProgress estimated={row.timeEstimated || 0} spent={row.timeLogged || 0} />;
    } else if (column === "taskStatus") {
        return <TaskStatus data={row} />;
    } else if (column === "updated") {
        return <Tag minimal>{timeAgo(row.updated)}</Tag>;
    }

    // project
    else if (column === "project") {
        const { id, title } = row.project;
        return (
            <OverflowTextCell onClick={() => nav(`/project/${id}`)}>
                {title ?? <span className={Classes.TEXT_DISABLED}>-</span>}{" "}
                <Icon icon="link-external-01" size={14} />
            </OverflowTextCell>
        );
    } else if (column === "health") {
        return (
            <ProjectHealth
                value={row.health}
                disabled
                onChange={(value?: string) => ProjectsActions.setHealth(row.id, value as PROJECTHEALTH)}
            />
        );
    }

    // stack
    else if (column === "stack") {
        const { title, tint } = row.stack;
        return title ? (
            <>
                <Icon icon="stop-filled" color={tint ?? Colors.GRAY3} /> {title}
            </>
        ) : (
            <span className={Classes.TEXT_DISABLED}>-</span>
        );
    } else if (column === "task") {
        const { id, title } = row.task;
        return (
            <>
                <TaskState taskId={id} readonly />
                <OverflowTextCell
                    onClick={() =>
                        nav(`/task/${id}`, {
                            state: { backgroundLocation: location },
                        })
                    }
                >
                    {title ?? <span className={Classes.TEXT_DISABLED}>-</span>}
                </OverflowTextCell>
            </>
        );
    }

    const value = row[column];
    return <>{value != null ? String(value) : <span className={Classes.TEXT_DISABLED}>-</span>}</>;
};
const TableCell = React.memo(TableCellPure);

const CounterCellIntents = {
    todoTasks: Intent.NONE,
    doneTasks: Intent.SUCCESS,
    inProgressTasks: Intent.PRIMARY,
    criticalTasks: Intent.DANGER,
    highTasks: Intent.WARNING,
    mediumTasks: Intent.NONE,
    lowTasks: Intent.SUCCESS,
    dueTodayTasks: Intent.WARNING,
    overdueTasks: Intent.DANGER,
};
const CounterCellWithIcons = ["criticalTasks", "highTasks", "mediumTasks", "lowTasks"];
const CounterCellWithPercentages = [
    "todoTasks",
    "doneTasks",
    "inProgressTasks",
    "dueTodayTasks",
    "overdueTasks",
    ...CounterCellWithIcons,
];
const CounterCellIcons = {
    criticalTasks: PRIORITYICON.CRITICAL,
    highTasks: PRIORITYICON.HIGH,
    mediumTasks: PRIORITYICON.MEDIUM,
    lowTasks: PRIORITYICON.LOW,
};
const CounterCellIconsIntents = {
    criticalTasks: "text-danger",
    highTasks: "text-warning",
    mediumTasks: "text-alert",
    lowTasks: "text-success",
};

const CounterCell = ({ row, column }: { row: ReportRow; column: string }) => {
    const withPercentage = CounterCellWithPercentages.includes(column);
    const withIcon = CounterCellWithIcons.includes(column);
    const value = Number(row[column] ?? 0);
    const percentage = withPercentage ? Math.round(value * 100) / (row.totalTasks ?? 0) : undefined;

    return (
        <>
            {withIcon && (
                <Icon
                    icon={CounterCellIcons[column as keyof typeof CounterCellIcons]}
                    className={CounterCellIconsIntents[column as keyof typeof CounterCellIconsIntents]}
                />
            )}
            <TaskCounter
                value={value}
                percentage={percentage}
                intent={CounterCellIntents[column as keyof typeof CounterCellIntents]}
            />
        </>
    );
};

const TaskCounter = ({
    value,
    percentage,
    intent,
}: {
    value: number;
    percentage?: number;
    intent?: Intent;
}) => {
    const textClass: Record<Intent, string> = {
        [Intent.NONE]: "text-alert",
        [Intent.PRIMARY]: "text-primary",
        [Intent.SUCCESS]: "text-success",
        [Intent.WARNING]: "text-warning",
        [Intent.DANGER]: "text-danger",
    };

    return (
        <>
            <BigNumberCell
                large
                value={value}
                className={intent ? textClass[intent ?? Intent.NONE] : undefined}
            />
            {percentage !== undefined && (
                <Tag minimal intent={intent}>
                    {!isNaN(percentage) ? Number(percentage || 0).toFixed() : "0"}%
                </Tag>
            )}
        </>
    );
};

const TaskStatus = ({ data }: { data: ReportRow }) => {
    const styles: CSSProperties = {
        borderRadius: 4,
        display: "flex",
        justifyContent: "space-between",
        gap: 20,
        padding: "15px 8px",
        flexGrow: 2,
        overflow: "hidden",
        maxWidth: "100%",
    };

    if (data.completed) {
        return (
            <div style={{ ...styles, backgroundColor: Colors.LIME5 }}>
                <strong>Completed</strong> <span>{timeAgo(data.completed)}</span>
            </div>
        );
    }

    if (data.duedate && isBefore(data.duedate, new Date())) {
        return (
            <div style={{ ...styles, backgroundColor: Colors.RED5 }}>
                <strong>Late</strong> <span>{differenceInDays(new Date(), data.duedate)} days</span>
            </div>
        );
    }

    return (
        <div style={{ ...styles, backgroundColor: Colors.GOLD5 }}>
            <strong>Upcoming</strong>{" "}
            <span>{differenceInDays(data.duedate ?? new Date(), new Date())} days left</span>
        </div>
    );
};
