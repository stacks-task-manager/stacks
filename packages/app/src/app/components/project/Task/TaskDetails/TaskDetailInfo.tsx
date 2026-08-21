// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent, Tag, Tooltip } from "@blueprintjs/core";
import { ITask, PRIORITY, TASKDETAILMATRIX } from "@stacks/types";
import { translate } from "@stacks/translations";
import { DatePickerButton, HotkeyChip } from "app/components/common";
import {
    FeeInput,
    TIRepeats,
    TaskDetailsAssignees,
    TaskDetailsId,
    TaskDetailsPriority,
    TaskDetailsProgress,
    TaskDetailsProjects,
    TaskDetailsSection,
    TaskDetailsStack,
    TaskDetailsTint,
    TaskEstimates,
    TaskSpentProgress,
} from "app/components/project";
import { getProject } from "app/hooks";
import { TasksActions } from "app/store/actions";
import { formatStringDuration } from "app/utils/date";
import { TaskDetailsDueDate, TaskDetailsStartDate, TaskDetailsStatus, TaskDetailsTags } from "app/widgets";
import React, { FunctionComponent } from "react";
import { TaskDetailsCover } from "../TaskDetailsCover/TaskDetailsCover";

interface ITaskDetailInfoProps {
    task: ITask;
    section: TASKDETAILMATRIX | undefined;
    vertical?: boolean;
    centered?: boolean;
    disabled?: boolean;
    onClose: (delayed?: boolean) => void;
}
/**
 * Renders a single task-details section (assignees, start/due dates, estimates,
 * priority, progress, tags, tint, repeats, etc.) based on the requested
 * `TASKDETAILMATRIX` section, delegating to the matching widget.
 */
// eslint-disable-next-line react/display-name
export const TaskDetailInfo: FunctionComponent<ITaskDetailInfoProps> = React.memo(
    ({ task, section, vertical, centered, disabled, onClose }) => {
        switch (section) {
            case TASKDETAILMATRIX.ASSIGNEES:
                return (
                    <TaskDetailsSection
                        title={translate("Assignees")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <TaskDetailsAssignees
                            taskId={task.id}
                            assignees={task.assignees || []}
                            disabled={disabled}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.PRIORITY:
                return (
                    <TaskDetailsSection title={translate("Priority")} vertical={vertical} centered={centered}>
                        <TaskDetailsPriority
                            taskId={task.id}
                            value={task.priority ?? PRIORITY.NONE}
                            showEmpty
                            canClear
                            disabled={disabled}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.STATUS:
                return (
                    <TaskDetailsSection title={translate("Status")} vertical={vertical} centered={centered}>
                        <TaskDetailsStatus
                            taskId={task.id}
                            value={task.status}
                            canClear
                            disabled={disabled}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.REPEATS:
                return (
                    <TaskDetailsSection title={translate("Repeats")} vertical={vertical} centered={centered}>
                        <TIRepeats taskId={task.id} value={task.repeats} disabled={disabled} />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.PROGRESS:
                return (
                    <TaskDetailsSection
                        title={translate("Progress")}
                        accessory={<HotkeyChip keys={[`${task?.progress || 0}%`]} light />}
                        vertical={vertical}
                        centered
                    >
                        <TaskDetailsProgress
                            taskId={task.id}
                            progress={task?.progress}
                            disabled={disabled}
                            onComplete={() => onClose(true)}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.DUEDATE:
                return (
                    <TaskDetailsSection title={translate("Due Date")} vertical={vertical} centered={centered}>
                        <TaskDetailsDueDate
                            value={task.duedate ?? null}
                            disabled={disabled}
                            minDate={task.startdate ?? undefined}
                            taskId={task.id}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.STARTDATE:
                return (
                    <TaskDetailsSection
                        title={translate("Start date")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <TaskDetailsStartDate
                            value={task.startdate ?? null}
                            disabled={disabled}
                            maxDate={task.duedate ?? undefined}
                            taskId={task.id}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.DODATE:
                return (
                    <TaskDetailsSection title={translate("Do date")} vertical={vertical} centered={centered}>
                        <DatePickerButton
                            extendedFormat
                            value={task.dodate ?? null}
                            disabled={disabled}
                            minDate={task.startdate ?? undefined}
                            maxDate={task.duedate ?? undefined}
                            onChange={(date: Date | null) => TasksActions.setDoDate(task.id, date)}
                            popoverProps={{
                                placement: "top",
                            }}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.TAGS:
                return (
                    <TaskDetailsSection title={translate("Tags")} vertical={vertical} centered={centered}>
                        <TaskDetailsTags value={task.tags} disabled={disabled} taskId={task.id} />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.ESTIMATE:
                return (
                    <TaskDetailsSection title={translate("Estimate")} vertical={vertical} centered={centered}>
                        <TaskEstimates
                            value={task.estimate}
                            disabled={disabled}
                            onChange={(value: number | undefined) => TasksActions.setEstimate(task.id, value)}
                        />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.TIMESPENT:
                return (
                    <TaskDetailsSection
                        title={translate("Time spent")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <Tooltip
                            content={translate("Task time logs spent hint")}
                            placement="top"
                            disabled={disabled}
                        >
                            <Tag minimal intent={Intent.SUCCESS}>
                                {formatStringDuration(task.timeSpent)}
                            </Tag>
                        </Tooltip>
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.PROJECTS:
                return (
                    <TaskDetailsSection title={translate("Project")} vertical={vertical} centered={centered}>
                        <TaskDetailsProjects taskId={task.id} projectId={task.project} />
                    </TaskDetailsSection>
                );
            case TASKDETAILMATRIX.STACK:
                return (
                    <TaskDetailsStack
                        taskId={task.id}
                        projectId={task.project}
                        stackId={task.stack}
                        vertical={vertical}
                        centered={centered}
                        disabled={disabled}
                    />
                );

            case TASKDETAILMATRIX.SPENTPROGRESS:
                return (
                    <TaskDetailsSection
                        title={translate("Time progress")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <TaskSpentProgress
                            estimated={task.estimate || 0}
                            spent={task.timeSpent}
                            disabled={disabled}
                        />
                    </TaskDetailsSection>
                );

            case TASKDETAILMATRIX.TINT:
                return (
                    <TaskDetailsTint
                        taskId={task.id}
                        tint={task.tint ?? undefined}
                        vertical={vertical}
                        centered={centered}
                        disabled={disabled}
                    />
                );

            case TASKDETAILMATRIX.COVER:
                return (
                    <TaskDetailsSection title={translate("Cover")} vertical={vertical} centered={centered}>
                        <TaskDetailsCover taskId={task.id} url={task.cover} disabled={disabled} />
                    </TaskDetailsSection>
                );

            case TASKDETAILMATRIX.ID:
                return <TaskDetailsId id={task.id} vertical={vertical} centered={centered} />;

            case TASKDETAILMATRIX.HOURLY_RATE:
                const project = getProject(task.project);
                return (
                    <TaskDetailsSection
                        title={translate("Task hourly rate")}
                        vertical={vertical}
                        centered={centered}
                    >
                        <FeeInput
                            value={task.hourlyRate}
                            currency={project?.currency}
                            readonly
                            placeholder={project?.hourlyRate ?? 0}
                            onChange={value => TasksActions.setHourlyRate(task.id, value)}
                        />
                    </TaskDetailsSection>
                );

            default:
                return null;
        }
    }
);
