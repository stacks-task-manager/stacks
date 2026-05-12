// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Button } from "@blueprintjs/core";
import { More } from "@blueprintjs/icons";
import classNames from "classnames";

import Log from "app/utils/log";

interface IBoardSkeletonProps {
    listView?: boolean;
}

export const BoardSkeleton: FunctionComponent<IBoardSkeletonProps> = ({ listView }) => {
    Log.info("[Component][BoardSkeleton]", "render");

    return (
        <div
            id="board"
            className={classNames({
                "list-view": listView,
            })}
        >
            <div
                // id="stacks"
                className={classNames({
                    "list-view": listView,
                    "board-view": !listView,
                })}
            >
                <div className={classNames("stack", listView ? "list" : "column")}>
                    <div className="stack-header">
                        <div className="stack-title bp4-skeleton" style={{ marginRight: 5 }}>
                            &nbsp;
                        </div>
                        <div className="stack-options bp4-skeleton">
                            <Button icon={<More size={12} />} variant="minimal" size="small" />
                        </div>
                    </div>
                    <div className="stack-content">
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={classNames("stack", listView ? "list" : "column")}>
                    <div className="stack-header">
                        <div className="stack-title bp4-skeleton" style={{ marginRight: 5 }}>
                            &nbsp;
                        </div>
                        <div className="stack-options bp4-skeleton">
                            <Button icon={<More size={12} />} variant="minimal" size="small" />
                        </div>
                    </div>
                    <div className="stack-content">
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={classNames("stack", listView ? "list" : "column")}>
                    <div className="stack-header">
                        <div className="stack-title bp4-skeleton" style={{ marginRight: 5 }}>
                            &nbsp;
                        </div>
                        <div className="stack-options bp4-skeleton">
                            <Button icon={<More size={12} />} variant="minimal" size="small" />
                        </div>
                    </div>
                    <div className="stack-content">
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={classNames("stack", listView ? "list" : "column")}>
                    <div className="stack-header">
                        <div className="stack-title bp4-skeleton" style={{ marginRight: 5 }}>
                            &nbsp;
                        </div>
                        <div className="stack-options bp4-skeleton">
                            <Button icon={<More size={12} />} variant="minimal" size="small" />
                        </div>
                    </div>
                    <div className="stack-content">
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                        <div className={classNames("task normal", listView ? "row" : "card")}>
                            <div className="task-inner-wrapper">
                                <div className="task-content">
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>
                                    <p className="bp4-skeleton">Lorem ipsum dolor sit amet,</p>

                                    <span className="bp4-skeleton">Lorem ipsum dolor</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
