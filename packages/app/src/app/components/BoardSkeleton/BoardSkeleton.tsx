// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Button, Classes } from "@blueprintjs/core";
import { More } from "@blueprintjs/icons";
import classNames from "classnames";

interface IBoardSkeletonProps {
    listView?: boolean;
}

/** Number of placeholder tasks per stack, mirroring a typical board layout. */
const STACK_TASK_COUNTS = [6, 2, 4, 6];

/** Placeholder task row/card shown while the board is loading. */
const SkeletonTask: FunctionComponent<{ listView?: boolean }> = ({ listView }) => {
    return (
        <div className={classNames("task normal", listView ? "row" : "card")}>
            <div className="task-inner-wrapper">
                <div className="task-content">
                    <p className={Classes.SKELETON}>Lorem ipsum dolor sit amet,</p>
                    <p className={Classes.SKELETON}>Lorem ipsum dolor sit amet,</p>

                    <span className={Classes.SKELETON}>Lorem ipsum dolor</span>
                </div>
            </div>
        </div>
    );
};

/** Placeholder stack column/list containing `tasks` skeleton cards. */
const SkeletonStack: FunctionComponent<{ listView?: boolean; tasks: number }> = ({ listView, tasks }) => {
    return (
        <div className={classNames("stack", listView ? "list" : "column")}>
            <div className="stack-header">
                <div className={classNames("stack-title", Classes.SKELETON)} style={{ marginRight: 5 }}>
                    &nbsp;
                </div>
                <div className={classNames("stack-options", Classes.SKELETON)}>
                    <Button
                        icon={<More size={12} />}
                        variant="minimal"
                        size="small"
                        aria-hidden
                        tabIndex={-1}
                    />
                </div>
            </div>
            <div className="stack-content">
                {Array.from({ length: tasks }, (_, i) => (
                    <SkeletonTask key={i} listView={listView} />
                ))}
            </div>
        </div>
    );
};

export const BoardSkeleton: FunctionComponent<IBoardSkeletonProps> = ({ listView }) => {
    return (
        <div
            id="board"
            className={classNames({
                "list-view": listView,
            })}
        >
            <div
                className={classNames({
                    "list-view": listView,
                    "board-view": !listView,
                })}
            >
                {STACK_TASK_COUNTS.map((tasks, i) => (
                    <SkeletonStack key={i} listView={listView} tasks={tasks} />
                ))}
            </div>
        </div>
    );
};
