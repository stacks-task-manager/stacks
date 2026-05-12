// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import Log from "app/utils/log";

import { ITag } from "@stacks/types";
import { IStack } from "@stacks/types";

import BOBox from "./BOBox";
import BOPie from "./BOPie";
import BOStacks from "./BOStacks";
import BOTime from "./BOTime";

import { minutesToTime } from "app/utils/string";
// import BOStacksEarnings from "./BOStacksEarnings";
// import BOStacksEstimations from "./BOStacksEstimations";
import { getProjectStacks, useCurrentProject } from "app/hooks";
import { RecordsStore } from "app/store/records";

interface ICountBase {
    idle: number;
    doing: number;
    done: number;
    overdue: number;
    upcoming: number;
    name?: string;
}

export interface ICount extends ICountBase {
    total: number;
    archived: number;
}

export interface IStackCount {
    [key: string]: ICountBase;
}

export interface ITime {
    total: number;
    spent: number;
}

interface ITagsCount {
    [key: string]: number;
}

export const Dashboard = () => {
    Log.info("[Component][DashboardNested]", "render");
    const { project } = useCurrentProject();
    if (!project) return null;

    const { tags } = RecordsStore.get();

    // const { tags, feeCurrency } = this.props;

    const getCount = () => {
        // const { stacks } = project;

        const count: ICount = {
            total: 0,
            idle: 0,
            doing: 0,
            done: 0,
            upcoming: 0,
            overdue: 0,
            archived: 0,
        };

        // stacks.forEach((stack: IStack) => {
        //     stack.tasks.forEach((task: ITask) => {
        //         count.total++;

        //         if (task.done) {
        //             count.done++;
        //         }

        //         if (!task.progress || (task.progress && task.progress < 20)) {
        //             count.idle++;
        //         }

        //         if (task.progress && task.progress > 20 && !task.done) {
        //             count.doing++;
        //         }

        //         if (task.startdate && moment().isBefore(task.startdate)) {
        //             count.upcoming++;
        //         }

        //         if (isOverdue(task)) {
        //             count.overdue++;
        //         }
        //     });
        // });

        return count;
    };

    const getStackCount = () => {
        const stacks = getProjectStacks(project.id);

        const count: IStackCount = {};

        stacks.forEach((stack: IStack) => {
            count[stack.id] = {
                idle: 0,
                doing: 0,
                done: 0,
                upcoming: 0,
                overdue: 0,
                name: stack.title,
            };

            // stack.tasks.forEach((task: ITask) => {
            //     if (task.done) {
            //         count[stack.id].done++;
            //     }

            //     if (!task.progress || (task.progress && task.progress < 20)) {
            //         count[stack.id].idle++;
            //     }

            //     if (task.progress && task.progress > 20 && !task.done) {
            //         count[stack.id].doing++;
            //     }

            //     if (isOverdue(task)) {
            //         count[stack.id].overdue++;
            //     }
            // });
        });

        return count;
    };

    const getTime = () => {
        const time: ITime = {
            total: 0,
            spent: 0,
        };

        // const { stacks } = project;

        // stacks.forEach((stack: IStack) => {
        //     stack.tasks.forEach((task: ITask) => {
        //         if (task.estimate) {
        //             time.total += timeToMinutes(task.estimate);
        //         }

        //         if (task.spent) {
        //             time.spent += timeToMinutes(task.spent);
        //         }
        //     });
        // });

        return time;
    };

    const getTagsCount = () => {
        // const { stacks } = project;

        const tags: ITagsCount = {};

        // stacks.forEach((stack: IStack) => {
        //     stack.tasks.forEach((task: ITask) => {
        //         task.tags?.forEach((tag: string) => {
        //             if (!tags[tag as string]) {
        //                 tags[tag as string] = 0;
        //             }

        //             tags[tag as string]++;
        //         });
        //     });
        // });

        return tags;
    };

    const getEarnings = () => {
        // const { stacks } = project;

        const earnings = {
            total: 0,
            spent: 0,
        };

        // stacks.forEach((stack: IStack) => {
        //     stack.tasks.forEach((task: ITask) => {
        //         if (task.estimate || task.spent) {
        //             const estimatedMinutes = timeToMinutes(task.estimate);
        //             const spentMinutes = timeToMinutes(task.spent);

        //             if (task.hourlyRate) {
        //                 earnings.total += (estimatedMinutes / 60) * task.hourlyRate;
        //                 earnings.spent += (spentMinutes / 60) * task.hourlyRate;
        //             } else {
        //                 earnings.total +=
        //                     (estimatedMinutes / 60) * (options && options.hourlyRate ? options.hourlyRate : 0);
        //                 earnings.spent +=
        //                     (spentMinutes / 60) * (options && options.hourlyRate ? options.hourlyRate : 0);
        //             }
        //         }
        //     });
        // });

        return earnings;
    };

    const count = getCount();

    const stackCount = getStackCount();
    const time = getTime();
    const tagsCount = getTagsCount();

    const totalEstimated = minutesToTime(time.total);
    const totalSpent = minutesToTime(time.spent);
    const remaining = time.total - time.spent < 0 ? 0 : minutesToTime(time.total - time.spent);

    const earnings = getEarnings();

    return (
        <div id="board-overview">
            <div className="board-overview-wrapper">
                <div className="board-overview-sidebar">
                    <h3>
                        {translate("Board Overview")}
                    </h3>

                    {time.total === 0 && (
                        <p>
                            {translate("There is not enough data to render this report")}
                        </p>
                    )}

                    {time.total > 0 && <BOPie count={count} />}

                    <div className="board-overview-separator negative" />

                    <h3>
                        {translate("Estimates Overview")}
                    </h3>

                    {time.total === 0 && (
                        <p>
                            {translate("There is not enough data to render this report")}
                        </p>
                    )}

                    {time.total > 0 && (
                        <React.Fragment>
                            <BOTime time={time} />

                            <div className="board-overview-estimates">
                                <div>
                                    <span className="estimated-box" />
                                    {translate("Total Estimates")}: <i>{totalEstimated}</i>
                                </div>
                                <div>
                                    <span className="spent-box" />
                                    {translate("Total Spent")}: <i>{totalSpent}</i>
                                </div>
                                <div>
                                    <span className="remaining-box" />
                                    {translate("Total Remaining")}: <i>{remaining}</i>
                                </div>
                            </div>
                        </React.Fragment>
                    )}

                    <div className="board-overview-separator negative" />

                    <h3>
                        {translate("Earnings Overview")}
                    </h3>

                    {earnings.total === 0 && (
                        <p>
                            {translate("There is not enough data to render this report")}
                        </p>
                    )}
                    {earnings.total > 0 && (
                        <div className="board-overview-estimates">
                            <div>
                                <span className="estimated-box" />
                                {translate("Total Earnings")}:{" "}
                            </div>
                            {earnings.spent >= earnings.total && (
                                <div>
                                    <span className="spent-box" />
                                    {translate("Exceeded by")}:{" "}
                                </div>
                            )}
                            {earnings.spent <= earnings.total && (
                                <div>
                                    <span className="remaining-box" />
                                    {translate("Profit")}:{" "}
                                    <i>{100 - Math.floor((earnings.spent * 100) / earnings.total)}%</i>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="board-overview-separator negative" />

                    <h3>
                        {translate("Tags Overview")}
                    </h3>

                    {tags.length === 0 && (
                        <p>
                            {translate("This board does not have any tags")}
                        </p>
                    )}

                    <div className="board-overview-tags">
                        {tags.map((tag: ITag) => {
                            return (
                                <div
                                    className="board-overview-tag"
                                    key={tag.id}
                                    style={{ backgroundColor: tag.color }}
                                >
                                    {tag.title}&nbsp; &nbsp;
                                    <strong>{tagsCount[tag.id]}</strong>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="board-overview-main">
                    <h3>
                        {translate("Tasks Overview")}
                    </h3>

                    <div className="board-overview-boxes">
                        <BOBox
                            title={translate("Total")}
                            value={count.total}
                            intent="total"
                        />

                        <BOBox
                            title={translate("Idle")}
                            value={count.idle}
                            intent="idle"
                        />

                        <BOBox
                            title={translate("Doing")}
                            value={count.doing}
                            intent="doing"
                        />

                        <BOBox
                            title={translate("Done")}
                            value={count.done}
                            intent="done"
                        />

                        <BOBox
                            title={translate("Upcoming")}
                            value={count.upcoming}
                            intent="upcoming"
                        />

                        <BOBox
                            title={translate("Overdue")}
                            value={count.overdue}
                            intent="overdue"
                        />

                        <BOBox
                            title={translate("Archived")}
                            value={count.archived}
                            intent="archived"
                        />
                    </div>

                    <div className="board-overview-separator" />

                    <h3>
                        {translate("Stacks Overview")}
                    </h3>

                    <BOStacks count={stackCount} />

                    <div className="board-overview-separator" />

                    <h3>Time Estimates by Stack</h3>

                    {/* <BOStacksEstimations
                        stacks={project.stacks}
                        value={project.options ? project.options.hourlyRate : undefined}
                        currency={project.options ? project.options.currency : undefined}
                    /> */}

                    <div className="board-overview-separator" />

                    <h3>
                        {translate("Earnings by Stacks")}
                    </h3>

                    {/* <BOStacksEarnings
                        stacks={project.stacks}
                        value={project.options ? project.options.hourlyRate : undefined}
                        currency={project.options ? project.options.currency : undefined}
                    /> */}
                </div>
            </div>
        </div>
    );
};
