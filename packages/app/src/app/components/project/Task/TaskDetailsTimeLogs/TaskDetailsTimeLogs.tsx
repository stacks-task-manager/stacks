// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Intent, Menu, MenuDivider, MenuItem, Tag } from "@blueprintjs/core";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

import { APPICONS, ITimeLog, ROLE_SECTIONS, TIMELOG_STATUS } from "@stacks/types";
import {
    BlankSlate,
    Col,
    Grid,
    Icon,
    RoundButton,
    Row,
    Table,
    TableBody,
    TableBodyCell,
    TableFooter,
    TableFooterCell,
    TableHead,
    TableHeaderCell,
    TableRow,
} from "app/components/common";
import { OverflowTextCell } from "app/components/common/Table/Cells";
import { QuickTimeLogDialog, QuickTimeLogPopover } from "app/components/project";
import { useCanAccess, useTaskTimelogs } from "app/hooks";
import { TimelogsActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { formatStringDuration } from "app/utils/date";
import { Assignees } from "app/widgets";
import { format } from "date-fns";
interface ITaskDetailsTimeLogsTabProps {
    taskId: string;
    projectId: string;
    disabled?: boolean;
}
export const TaskDetailsTimelogsTab: FunctionComponent<ITaskDetailsTimeLogsTabProps> = ({
    taskId,
    projectId,
    disabled,
}) => {
    const { timelogs, isLoading } = useTaskTimelogs(taskId);

    useEffect(() => {
        if (isLoading) return;
        TimelogsActions.load({ task: taskId });
    }, [taskId]);

    return (
        <TaskDetailsTimeLogs
            taskId={taskId}
            projectId={projectId}
            entries={timelogs}
            disabled={disabled}
            loading={isLoading}
        />
    );
};

interface ITaskDetailsTimeLogsProps {
    taskId: string;
    projectId: string;
    entries?: ITimeLog[];
    disabled?: boolean;
    loading?: boolean;
}
export const TaskDetailsTimeLogs: FunctionComponent<ITaskDetailsTimeLogsProps> = ({
    taskId,
    projectId,
    entries,
    disabled,
    loading,
}) => {
    const { write: canLogTime } = useCanAccess(ROLE_SECTIONS.TIMELOGS);
    const { people } = PeopleStore.get();
    const [timelog, setTimelog] = useState<ITimeLog>();

    const total = useMemo(() => {
        let total = 0;
        if (entries) {
            for (const entry of entries) {
                total += entry.duration;
            }
        }

        return total;
    }, [entries]);

    if (!entries || (entries && entries.length === 0)) {
        return (
            <Row>
                <Col justify="center">
                    <BlankSlate
                        icon={APPICONS.TIMELOG}
                        title={translate("No time logged")}
                        description={translate(
                            "This task does not have any logged time yet Click the button bellow to add the first one"
                        )}
                        small
                        maxWidth={250}
                    >
                        <QuickTimeLogPopover taskId={taskId} projectId={projectId} placement="bottom-end">
                            <RoundButton
                                title={translate("Log time")}
                                minimal
                                icon="clock-plus"
                                disabled={disabled || loading || !canLogTime}
                            />
                        </QuickTimeLogPopover>
                    </BlankSlate>
                </Col>
            </Row>
        );
    }

    const handleClose = () => {
        setTimelog(undefined);
    };

    return (
        <Grid padding={[0, 30]}>
            {timelog && (
                <QuickTimeLogDialog
                    taskId={taskId}
                    projectId={projectId}
                    value={timelog}
                    onClose={handleClose}
                />
            )}
            <Table>
                <TableHead>
                    <TableHeaderCell name="date" title="Date" width={100} />
                    {/* <TableHeaderCell
                        name="project"
                        title="Project"
                        width={120}
                        minWidth={100}
                        maxWidth={200}
                        resizable
                    /> */}
                    <TableHeaderCell name="assignees" title="Assignees" width={100} />
                    <TableHeaderCell name="duration" title="Duration" width={120} />
                    <TableHeaderCell name="billable" title="Billable" width={100} />
                    <TableHeaderCell name="billed" title="Billed" width={100} />
                    <TableHeaderCell
                        name="description"
                        title="Description"
                        width={150}
                        minWidth={100}
                        resizable
                    />
                    <TableHeaderCell name="approved" title="Approved" width={100} />
                    <TableHeaderCell name="empty" empty width={24} />
                </TableHead>
                <TableBody>
                    {!loading &&
                        entries &&
                        entries.map((entry: ITimeLog) => (
                            <TableRow key={entry.id}>
                                <TableBodyCell>{format(entry.date, "P")}</TableBodyCell>
                                {/* <TableBodyCell>
                                    <OverflowTextCell>{getDocument(entry.project)?.text}</OverflowTextCell>
                                </TableBodyCell> */}
                                <TableBodyCell>
                                    <Assignees
                                        assignees={people.filter(p => entry.person === p.id)}
                                        max={3}
                                        small
                                    />
                                </TableBodyCell>
                                <TableBodyCell align="right">
                                    <Tag intent={Intent.SUCCESS} minimal>
                                        {formatStringDuration(entry.duration)}
                                    </Tag>
                                </TableBodyCell>
                                <TableBodyCell align="center">
                                    <Icon icon={entry.billable ? "check-square" : "square"} />
                                </TableBodyCell>
                                <TableBodyCell align="center">
                                    <Icon icon={entry.billed ? "check-square" : "square"} />
                                </TableBodyCell>
                                <TableBodyCell>
                                    <OverflowTextCell>{entry.description}</OverflowTextCell>
                                </TableBodyCell>
                                <TableBodyCell>{entry.status}</TableBodyCell>
                                <TableBodyCell
                                    menu={
                                        <Menu>
                                            <MenuItem
                                                text={translate("Edit")}
                                                icon={<Icon icon="edit-05" />}
                                                disabled={[
                                                    TIMELOG_STATUS.INREVIEW,
                                                    TIMELOG_STATUS.APPROVED,
                                                ].includes(entry.status)}
                                                onClick={() => setTimelog(entry)}
                                            />
                                            <MenuDivider />
                                            <MenuItem
                                                text={translate("Delete")}
                                                intent={Intent.DANGER}
                                                icon={<Icon icon="trash" />}
                                                disabled={entry.status === TIMELOG_STATUS.APPROVED}
                                                onClick={() => TimelogsActions.remove(entry.id)}
                                            />
                                        </Menu>
                                    }
                                />
                            </TableRow>
                        ))}

                    {loading &&
                        Array.from(Array(2).keys()).map(key => (
                            <TableRow key={key}>
                                <TableBodyCell>
                                    <div className={Classes.SKELETON}>Lorem ipsum</div>
                                </TableBodyCell>
                                <TableBodyCell>
                                    <div className={Classes.SKELETON}>Lorem ipsum</div>
                                </TableBodyCell>
                                <TableBodyCell>
                                    <div className={Classes.SKELETON} style={{ width: 20, height: 20 }} />
                                    <div className={Classes.SKELETON} style={{ width: 20, height: 20 }} />
                                </TableBodyCell>
                                <TableBodyCell>
                                    <div className={Classes.SKELETON}>1234567</div>
                                </TableBodyCell>
                                <TableBodyCell align="center">
                                    <div className={Classes.SKELETON} style={{ width: 20, height: 20 }} />
                                </TableBodyCell>
                                <TableBodyCell align="center">
                                    <div className={Classes.SKELETON} style={{ width: 20, height: 20 }} />
                                </TableBodyCell>
                                <TableBodyCell>
                                    <div className={Classes.SKELETON}>Lorem ipsum sit amet</div>
                                </TableBodyCell>
                                <TableBodyCell />
                            </TableRow>
                        ))}
                </TableBody>
                <TableFooter>
                    <TableFooterCell colSpan={2} align="right">
                        <strong>Total</strong>
                    </TableFooterCell>
                    <TableFooterCell align="right">
                        {loading ? (
                            <div className={Classes.SKELETON}>12345678</div>
                        ) : (
                            <Tag intent={Intent.SUCCESS} minimal>
                                {formatStringDuration(total)}
                            </Tag>
                        )}
                    </TableFooterCell>
                    <TableFooterCell colSpan={4}>&nbsp;</TableFooterCell>
                </TableFooter>
            </Table>

            <div>
                <QuickTimeLogPopover taskId={taskId} projectId={projectId} placement="bottom-end">
                    <RoundButton
                        title={translate("Log time")}
                        minimal
                        icon="clock-plus"
                        disabled={disabled || loading || !canLogTime}
                    />
                </QuickTimeLogPopover>
            </div>
        </Grid>
    );
};
