// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { AnchorButton, Intent, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { HotkeyTooltip, Icon, RoundButton } from "app/components/common";
import { QuickTimeLogDialog } from "app/components/project";
import { useMe, useTask } from "app/hooks";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { ITimeLog } from "@stacks/types";
import { RecordActions } from "app/store/actions";
import { RecordsStore } from "app/store/records";
import Dialog from "app/utils/dialog";
import { stripMd } from "app/utils/string";
import { formatDuration } from "app/utils/date";

const getElapsed = (time: number | null) => {
    if (!time) return 0;
    const now = Math.floor(Date.now() / 1000);
    return now - (time || 0);
};

interface ITimeTrackerProps {
    taskId: string;
    id?: string;
    detailed?: boolean;
    rounded?: boolean;
    disabled?: boolean;
}
// eslint-disable-next-line react/display-name
export const TimeTracker: FunctionComponent<ITimeTrackerProps> = React.memo(
    ({ taskId, id, detailed, rounded, disabled }) => {
        const me = useMe();
        const { task } = useTask(taskId);
        const [time, setTime] = useState<number | null>(null);
        const [elapsed, setElapsed] = useState(0);
        const [showModal, setShowModal] = useState(false);
        const [timelog, setTimelog] = useState<Partial<ITimeLog>>();
        const loop = useRef<NodeJS.Timeout | null>(null);
        const navigate = useNavigate();

        const startLoop = () => {
            loop.current = setInterval(() => {
                const elapsed = getElapsed(time);
                setElapsed(elapsed);
            }, 1000);
        };

        const stopLoop = () => {
            if (loop.current) {
                clearInterval(loop.current);
                loop.current = null;
            }
        };

        useEffect(() => {
            const { timers } = RecordsStore.get();
            if (timers[taskId] == null) {
                stopLoop();
                setTime(null);
                return;
            }
            const readTime = timers[taskId];

            setTime(readTime);
            const elapsed = getElapsed(readTime);
            setElapsed(elapsed);

            return () => {
                stopLoop();
            };
        }, [taskId]);

        useEffect(() => {
            if (time !== null) {
                stopLoop();
                startLoop();
            }
        }, [time]);

        const handleSave = () => {
            handleCancel();
        };

        const handleCloseDialog = () => {
            // if (timelog) {
            //     handleCancel();
            // } else {
            //     startLoop();
            // }

            setShowModal(false);
        };

        const handleClearTimer = () => {
            setShowModal(false);
            handleCancel();
        };

        const handleCancel = () => {
            RecordActions.removeTimer(taskId);
            setTime(null);
            setElapsed(0);
        };

        const handleStartTimer = async () => {
            const { timers } = RecordsStore.get();

            if (timers[taskId] != null) {
                const response = await Dialog.confirm(
                    "Time tracker running",
                    "A timer is currently in operation. If you proceed, the current tracker will be terminated and the time that has already been registered will be lost. Do you want to stop the current timer and begin a new one?",
                    Intent.WARNING
                );

                if (!response) return;
            }

            handleCancel();
            stopLoop();

            const now = RecordActions.startTimer(taskId);

            setTime(now);
        };

        const handleStopTimer = () => {
            stopLoop();

            setTimelog({
                duration: elapsed,
                date: new Date((time || Date.now()) * 1000),
                project: task?.project,
                person: me?.id || task?.assignees?.at(0),
            });

            setShowModal(true);
        };

        const handleOpenTask = () => {
            navigate(`/task/${taskId}`, {
                state: { backgroundLocation: snapshotTaskModalBackground() },
            });
        };

        if (time) {
            return (
                <>
                    <div className={classNames("time-tracker-wrapper", { detailed })}>
                        {task && detailed && <a onClick={handleOpenTask}>{stripMd(task.title)}</a>}
                        <Tooltip content="Stop and save time log" placement="top">
                            <div className="time-tracker" id={id} onClick={handleStopTimer}>
                                <Icon icon="stop-circle" className="stop-icon" size={detailed ? 18 : 14} />
                                <Icon icon="clock" className="clock-icon" size={detailed ? 18 : 14} spin />
                                {formatDuration(elapsed, "colon")}
                                {detailed && <span className="time-tracker-spacer" />}
                                {detailed && <Icon icon="arrow-up-right" className="arrow-icon" size={18} />}
                            </div>
                        </Tooltip>
                    </div>
                    {showModal && task && (
                        // <TimeLogDialog task={task} time={time} onClose={handleCloseDialog} />
                        <QuickTimeLogDialog
                            projectId={task.project}
                            taskId={task.id}
                            value={timelog}
                            onSave={handleSave}
                            onClear={handleClearTimer}
                            onClose={handleCloseDialog}
                        />
                    )}
                </>
            );
        }

        if (rounded) {
            return (
                <RoundButton
                    id={id}
                    dashed
                    tooltip="Log time"
                    icon="play"
                    disabled={disabled}
                    onClick={handleStartTimer}
                />
            );
        }

        return (
            <HotkeyTooltip
                title={translate("Start timer")}
                placement="bottom"
                keys={["shift", "M"]}
                disabled={disabled}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ref, ...props }) => (
                    <AnchorButton
                        {...props}
                        ref={ref}
                        id={id}
                        minimal
                        small
                        icon={<Icon icon="play" />}
                        disabled={disabled}
                        onClick={handleStartTimer}
                    />
                )}
            />
        );
    }
);
