// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Project overview, stacks, timelines, and analytics endpoints with caching.
 */
import { addDays, differenceInDays, format, isBefore, isSameDay, startOfDay, subWeeks } from "date-fns";
import type { Context } from "hono";
import { Hono } from "hono";

import { IProjectTimelogs, ITimeLog, PRIORITY, type IProjectOverview, type ITask } from "@stacks/types";
import { TimelogsLoader } from "../loaders";
import { ProjectsLoader } from "../loaders/projects";
import { StacksLoader } from "../loaders/stacks";
import { TasksLoader } from "../loaders/tasks";
import { validator } from "../middleware/validator";
import { cacheMiddleware } from "../utils/cache";
import { asyncHandler } from "../utils/errorHandler";
import { ProjectSchema } from "./schema/project";
import { parseUuidParam } from "./schema/common";

const projects = new Hono();

/**
 * Get a specific project by ID.
 * @param {string} id - The project ID
 * @returns {Promise<IProject>} The requested project
 */
projects.get(
    "/:id",
    cacheMiddleware({ ttl: 600 }),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);

        const project = await ProjectsLoader.getOne(id);
        return c.replySuccess(project);
    })
);

/**
 * Get all stacks for a specific project.
 * @param {string} id - The project ID
 * @returns {Promise<IStack[]>} Array of project stacks
 */
projects.get(
    "/:id/stacks",
    cacheMiddleware({ ttl: 300 }),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);

        const stacks = await StacksLoader.getAll(id);
        return c.replySuccess(stacks);
    })
);

/**
 * Update a project by ID.
 * @param {string} id - The project ID
 * @param {Partial<IProject>} projectData - Updated project data
 * @returns {Promise<boolean>} Success status
 */
projects.patch(
    "/:id",
    validator(ProjectSchema),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        const projectData = c.req.valid("json");
        parseUuidParam(id);

        await ProjectsLoader.update(id, projectData);
        return c.replySuccess();
    })
);

/**
 * Get project overview with statistics and analytics.
 * @param {string} id - The project ID
 * @returns {Promise<IProjectOverview>} Project overview with task statistics
 */
projects.get(
    "/:id/overview",
    cacheMiddleware({ ttl: 120 }),
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        parseUuidParam(id);

        const project = await ProjectsLoader.getOne(id);
        const tasks = await TasksLoader.getAll({ project: id });
        const archived = await TasksLoader.getAll({ project: id, archived: true });
        const stacks = await StacksLoader.getAll(id);
        const timelogs = await TimelogsLoader.getAll({ project: id });

        const overview: IProjectOverview = {
            // Tasks summary
            tasksTotal: 0,
            tasksIdle: 0,
            tasksInProgress: 0,
            tasksCompleted: 0,
            tasksToday: 0,
            tasksOverdue: 0,
            tasksCompletionPercentage: 0,
            tasksAssigned: 0,
            tasksUnassigned: 0,
            tasksArchived: archived.length,

            // priority
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,

            // stacks
            stacksCount: stacks.length,
            stacksOverview: [],
            stacksTime: [],

            // assignees
            assignees: [],

            // workload
            workload: {},

            // time
            timeEstimatedTotal: 0,
            timeLoggedTotal: 0,
            timeLoggedNonBillable: 0,
            timeLoggedBillable: 0,
            timeRemaining: 0,
            timeLoad: {},

            // budget
            budgetEstimated: 0,
            budgetSpent: 0,
            budgetProfit: 0,

            // tags & statuses
            tags: {},
            statuses: {},

            // tasks over time
            tasksCompletionTime: [],

            // timelogs
            timelogs: [],
        };

        for (const stack of stacks) {
            const stackOverviewData = {
                name: stack.title,
                idle: 0,
                doing: 0,
                done: 0,
                overdue: 0,
            };

            const stackTimeData = {
                name: stack.title,
                estimated: 0,
                spent: 0,
                remaining: 0,
            };

            for (const task of tasks) {
                if (task.done) continue;
                if (task.stack !== stack.id) continue;

                if (task.progress != null && task.progress > 0 && !task.done) {
                    stackOverviewData.doing++;
                } else if (task.done) {
                    stackOverviewData.done++;
                } else {
                    stackOverviewData.idle++;
                }

                if (task.duedate && isBefore(startOfDay(new Date(task.duedate)), startOfDay(new Date()))) {
                    stackOverviewData.overdue++;
                }

                if (task.estimate != null) {
                    stackTimeData.estimated += task.estimate;
                }

                // TODO: add timelogs here
                // if (task.timelogs && task.timelogs.length) {
                //     for (const timelog of task.timelogs) {
                //         stackTimeData.spent += timelog.duration;
                //     }
                // }

                stackTimeData.remaining =
                    stackTimeData.estimated - stackTimeData.spent < 0
                        ? 0
                        : stackTimeData.estimated - stackTimeData.spent;
            }

            overview.stacksOverview.push(stackOverviewData);
            overview.stacksTime.push(stackTimeData);
        }

        for (const task of tasks) {
            overview.tasksTotal++;

            if (task.progress != null && task.progress > 0 && !task.done) {
                overview.tasksInProgress++;
            } else if (task.done) {
                overview.tasksCompleted++;
            } else {
                overview.tasksIdle++;
            }

            if (task.startdate && isBefore(startOfDay(new Date(task.startdate)), startOfDay(new Date()))) {
                overview.tasksToday++;
            }

            if (task.duedate && isBefore(startOfDay(new Date(task.duedate)), startOfDay(new Date()))) {
                overview.tasksOverdue++;
            }

            overview.tasksCompletionPercentage = Math.round(
                (overview.tasksCompleted * 100) / overview.tasksTotal
            );

            // priority
            if (task.priority === PRIORITY.CRITICAL) overview.critical++;
            if (task.priority === PRIORITY.HIGH) overview.high++;
            if (task.priority === PRIORITY.MEDIUM) overview.medium++;
            if (task.priority === PRIORITY.LOW) overview.low++;

            // estimated, logged time
            if (task.estimate != null) overview.timeEstimatedTotal += task.estimate;
            // TODO: add timelogs
            // if (task.timelogs && task.timelogs.length) {
            //     for (const timelog of task.timelogs) {
            //         overview.timeLoggedTotal += timelog.duration;

            //         if (timelog.billable) {
            //             overview.timeLoggedBillable += timelog.duration;
            //         } else {
            //             overview.timeLoggedNonBillable += timelog.duration;
            //         }

            //         if (overview.timeLoad[timelog.person]) {
            //             overview.timeLoad[timelog.person] += timelog.duration;
            //         } else {
            //             overview.timeLoad[timelog.person] = timelog.duration;
            //         }
            //     }
            // }

            overview.timeRemaining =
                overview.timeEstimatedTotal - overview.timeLoggedTotal < 0
                    ? 0
                    : overview.timeEstimatedTotal - overview.timeLoggedTotal;

            // bugets
            if (project.hourlyRate) {
                overview.budgetEstimated = (overview.timeEstimatedTotal / 3600) * project.hourlyRate;
                overview.budgetSpent = (overview.timeLoggedTotal / 3600) * project.hourlyRate;
                overview.budgetProfit = (overview.budgetSpent * 100) / overview.budgetEstimated;
            }

            // assignees
            if (task.assignees && task.assignees.length > 0) {
                for (const assignee of task.assignees) {
                    if (!overview.assignees.includes(assignee)) {
                        overview.assignees.push(assignee);
                    }

                    if (overview.workload[assignee]) {
                        overview.workload[assignee]++;
                    } else {
                        overview.workload[assignee] = 1;
                    }
                }

                overview.tasksAssigned++;
            } else {
                overview.tasksUnassigned++;
            }

            // tags
            if (task.tags) {
                for (const tag of task.tags) {
                    if (overview.tags[tag]) {
                        overview.tags[tag]++;
                    } else {
                        overview.tags[tag] = 1;
                    }
                }
            }

            // statuses
            if (task.status) {
                if (overview.statuses[task.status]) {
                    overview.statuses[task.status]++;
                } else {
                    overview.statuses[task.status] = 1;
                }
            }
        }

        // timelogs
        const monthTimelogs: Record<string, ITimeLog[]> = {};
        for (const timelog of timelogs) {
            const month = format(new Date(timelog.date), "yyyy-MM");

            if (monthTimelogs[month]) {
                monthTimelogs[month].push(timelog);
            } else {
                monthTimelogs[month] = [timelog];
            }
        }

        const totalTimelogs: IProjectTimelogs = {
            type: "total",
            data: [],
        };
        const billableTimelogs: IProjectTimelogs = {
            type: "billable",
            data: [],
        };
        const nonBillableTimelogs: IProjectTimelogs = {
            type: "non-billable",
            data: [],
        };
        for (const month of Object.keys(monthTimelogs)) {
            const timelogs = monthTimelogs[month];

            totalTimelogs.data.push({
                date: month,
                timespent: timelogs.reduce((acc, timelog) => acc + timelog.duration, 0),
            });

            billableTimelogs.data.push({
                date: month,
                timespent: timelogs
                    .filter(timelog => timelog.billable)
                    .reduce((acc, timelog) => acc + timelog.duration, 0),
            });

            nonBillableTimelogs.data.push({
                date: month,
                timespent: timelogs
                    .filter(timelog => !timelog.billable)
                    .reduce((acc, timelog) => acc + timelog.duration, 0),
            });
        }

        overview.timelogs = [billableTimelogs, nonBillableTimelogs, totalTimelogs];

        const today = new Date();
        const weekAgo = subWeeks(today, 2);

        for (
            let currentDate = new Date(weekAgo);
            differenceInDays(today, currentDate) >= 0;
            currentDate = addDays(currentDate, 1)
        ) {
            const value = tasks.filter((task: ITask) => {
                return task.done && task.completed && isSameDay(new Date(task.completed), currentDate);
            }).length;

            overview.tasksCompletionTime.push({
                name: format(currentDate, "dd/MM"),
                value,
            });
        }

        return c.replySuccess(overview);
    })
);

/**
 * Archive all completed tasks for a project
 *
 * @param c - Hono context object
 * @returns Response or continues to next middleware
 */
projects.post(
    "/:id/archive-completed",
    asyncHandler(async (c: Context) => {
        const { id } = c.req.param();
        await ProjectsLoader.archiveCompletedTasks(id);
        return c.replySuccess();
    })
);
export default projects;
