// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";
import classNames from "classnames";
import { Tooltip } from "@blueprintjs/core";

import { formatStringDuration } from "app/utils/date";

interface ITaskSpentProgressProps {
    estimated: number;
    spent: number;
    disabled?: boolean;
    fill?: boolean;
}
export const TaskSpentProgress: FunctionComponent<ITaskSpentProgressProps> = ({
    estimated,
    spent,
    disabled,
    fill = false,
}) => {
    const progress = useMemo(() => {
        if (spent === 0) return 0;

        const percent = Math.round((spent * 100) / estimated);
        return percent > 100 ? 100 : percent;
    }, [estimated, spent]);

    return (
        <div className={classNames("task-spent-progress__wrapper", { fill })}>
            <div className="task-spent-progress__labels">
                <Tooltip
                    content="Spent time"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <span {...props} style={{ cursor: "help" }}>
                            {formatStringDuration(spent)}
                        </span>
                    )}
                />
                <Tooltip
                    content="Estimated time"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <span {...props} style={{ cursor: "help" }}>
                            {formatStringDuration(estimated)}
                        </span>
                    )}
                />
            </div>
            <Tooltip
                content={`Spent ${progress}% of the total estimated time`}
                placement="top"
                disabled={disabled}
            >
                <div className={classNames("task-spent-progress", { disabled })}>
                    <div
                        className={classNames("task-spent-progress__bar", { over: progress >= 100 })}
                        style={{ width: `${progress}%` }}
                    />
                </div>
            </Tooltip>
        </div>
    );
};
