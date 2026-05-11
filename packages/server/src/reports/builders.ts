// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Registered report builder implementations keyed by {@link REPORT_TYPE}.
 */
import { IStack, ITask, PRIORITY, REPORT_TYPE } from "@stacks/types";
import { isBefore, isSameDay } from "date-fns";

import { IProjectWithTitle } from "../types/project";
import { PeopleLoader } from "../loaders/people";
import { TasksLoader } from "../loaders/tasks";
import type { ReportLoadContext } from "./context";
import { getSpanRange } from "./dateRange";
import {
    fetchTasksByProjects,
    fetchTasksGrouped,
    fetchTasksWithAssignees,
    fetchTimelogs,
    fetchTimelogsByTask,
    getProjects,
    getStacks,
} from "./data";

function timelogDateRange(ctx: ReportLoadContext) {
    return ctx.span ? getSpanRange(ctx.span) : undefined;
}

function taskUpdatedRange(ctx: ReportLoadContext) {
    return ctx.span ? getSpanRange(ctx.span) : undefined;
}

/** Planned vs actual: anchor completion on `completed`, else `updated`. */
function taskAnchoredInSpan(task: ITask, ctx: ReportLoadContext): boolean {
    if (!ctx.span) {
        return true;
    }
    const { start, end } = getSpanRange(ctx.span);
    const anchor = task.completed ?? task.updated;
    const d = anchor instanceof Date ? anchor : new Date(anchor as string);
    return d >= start && d <= end;
}

export async function buildProjectHealthReport(ctx: ReportLoadContext) {
    const updatedRange = taskUpdatedRange(ctx);
    const projects = await getProjects();
    const projectsIds = projects.map(project => project.id);
    const projectTasks: Record<string, ITask[]> = await fetchTasksGrouped(projectsIds, updatedRange);

    const report = {
        type: "grid",
        size: "100",
        columns: {
            project: {
                title: "Name",
                width: 200,
                minWidth: 150,
            },
            company: {
                title: "Company",
                width: 200,
                minWidth: 150,
            },
            owner: {
                title: "Owner",
                width: 200,
                minWidth: 150,
            },
            taskCompletion: {
                title: "Task completion",
                width: 200,
                minWidth: 150,
            },
            health: {
                title: "Health",
                width: 150,
                minWidth: 150,
            },
            totalTasks: {
                title: "Total",
                width: 100,
                minWidth: 100,
            },
            todoTasks: {
                title: "Todo",
                width: 150,
                minWidth: 150,
            },
            doneTasks: {
                title: "Completed",
                width: 150,
                minWidth: 150,
            },
            inProgressTasks: {
                title: "In progress",
                width: 150,
                minWidth: 150,
            },
            dueTodayTasks: {
                title: "Today",
                width: 150,
                minWidth: 150,
            },
            overdueTasks: {
                title: "Overdue",
                width: 150,
                minWidth: 150,
            },
            criticalTasks: {
                title: "Critical",
                width: 150,
                minWidth: 150,
            },
            highTasks: {
                title: "High",
                width: 150,
                minWidth: 150,
            },
            mediumTasks: {
                title: "Medium",
                width: 150,
                minWidth: 150,
            },
            lowTasks: {
                title: "Low",
                width: 150,
                minWidth: 150,
            },
        },
        data: [] as any[],
    };

    const today = new Date();

    for (const project of projects) {
        const row = {
            id: project.id,
            project: { title: project.title, id: project.id },
            company: project.company,
            owner: project.projectOwner,
            health: project.health,
            totalTasks: projectTasks[project.id]?.length ?? 0,
            todoTasks: projectTasks[project.id]?.filter(task => !task.done).length ?? 0,
            doneTasks: projectTasks[project.id]?.filter(task => task.done).length ?? 0,
            inProgressTasks: projectTasks[project.id]?.filter(task => task.progress > 0).length ?? 0,
            dueTodayTasks:
                projectTasks[project.id]?.filter(task => task.duedate && isSameDay(task.duedate, today)).length ?? 0,
            overdueTasks:
                projectTasks[project.id]?.filter(task => task.duedate && isBefore(task.duedate, today)).length ?? 0,
            criticalTasks:
                projectTasks[project.id]?.filter(task => task.priority === PRIORITY.CRITICAL).length ?? 0,
            highTasks: projectTasks[project.id]?.filter(task => task.priority === PRIORITY.HIGH).length ?? 0,
            mediumTasks:
                projectTasks[project.id]?.filter(task => task.priority === PRIORITY.MEDIUM).length ?? 0,
            lowTasks: projectTasks[project.id]?.filter(task => task.priority === PRIORITY.LOW).length ?? 0,
        };

        report.data.push(row);
    }

    return report;
}

export async function buildEstimatedVsLoggedReport(ctx: ReportLoadContext) {
    const report = {
        type: "grid",
        columns: {
            task: {
                title: "Task",
                width: 300,
                minWidth: 150,
                resizable: true,
            },
            assignees: {
                title: "Assignees",
                width: 100,
                minWidth: 100,
            },
            project: {
                title: "Project",
                width: 250,
                minWidth: 150,
                resizable: true,
            },
            timeEstimated: {
                title: "Time estimated",
                width: 150,
                minWidth: 100,
            },
            timeLogged: {
                title: "Time logged",
                width: 150,
                minWidth: 100,
            },
            spentProgress: {
                title: "Estimated vs. logged",
                width: 200,
                minWidth: 100,
                resizable: true,
            },
        },
        data: [] as any[],
    };

    const projects = await getProjects();
    const projectById = projects.reduce((acc, project) => {
        acc[project.id] = project;
        return acc;
    }, {} as Record<string, IProjectWithTitle>);
    const projectsIds = projects.map(project => project.id);
    const dateRange = timelogDateRange(ctx);
    const updatedRange = taskUpdatedRange(ctx);
    const projectTasks: ITask[] = await fetchTasksByProjects(projectsIds, updatedRange);
    const taskTimelogs = await fetchTimelogsByTask(projectsIds, dateRange);

    for (const task of projectTasks) {
        const timeLogged = taskTimelogs[task.id]?.reduce((acc, timelog) => acc + timelog.duration, 0) ?? 0;

        const row = {
            id: task.id,
            task: { title: task.title, id: task.id, done: task.done },
            assignees: task.assignees,
            project: { id: task.project, title: projectById[task.project].title },
            timeEstimated: task.estimate ?? 0,
            timeLogged,
        };

        report.data.push(row);
    }
    return report;
}

export async function buildPlannedVsActualReport(ctx: ReportLoadContext) {
    const report = {
        type: "grid",
        columns: {
            task: {
                title: "Task",
                minWidth: 150,
                resizable: true,
            },
            project: {
                title: "Project",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            stack: {
                title: "Stack",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            assignees: {
                title: "Assignees",
                width: 100,
                minWidth: 100,
            },
            taskStatus: {
                title: "Status",
                width: 250,
                minWidth: 250,
                resizable: true,
            },
            updated: {
                title: "Last updated",
                width: 200,
                minWidth: 150,
            },
        },
        data: [] as any[],
    };

    const projects = await getProjects();
    const projectById = projects.reduce((acc, project) => {
        acc[project.id] = project;
        return acc;
    }, {} as Record<string, IProjectWithTitle>);
    const projectsIds = projects.map(project => project.id);
    const tasks: ITask[] = await TasksLoader.getAll({ project: projectsIds, completed: "true" }, [
        ["updated", "DESC"],
    ]);
    const tasksWithDueDates = tasks.filter(task => task.duedate != null).filter(t => taskAnchoredInSpan(t, ctx));
    const stacks = await getStacks(projectsIds);
    const stackById = stacks.reduce((acc, stack) => {
        acc[stack.id] = stack;
        return acc;
    }, {} as Record<string, IStack>);

    for (const task of tasksWithDueDates) {
        const row = {
            id: task.id,
            task: { title: task.title, id: task.id, done: task.done },
            assignees: task.assignees,
            project: { id: task.project, title: projectById[task.project].title },
            stack: { id: task.stack, title: stackById[task.stack].title, tint: stackById[task.stack].tint },
            duedate: task.duedate,
            updated: task.updated,
            completed: task.done,
        };

        report.data.push(row);
    }

    return report;
}

export async function buildProfitabilityReport(ctx: ReportLoadContext) {
    const report = {
        type: "grid",
        columns: {
            person: {
                title: "Project",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            estimate: {
                title: "Estimate",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            timeLogged: {
                title: "Total time logged",
                width: 150,
                minWidth: 100,
            },
            hourlyRate: {
                title: "Hourly rate",
                help: "Either project hourly rate or person hourly cost",
                width: 150,
                minWidth: 100,
            },
            revenue: {
                title: "Revenue",
                width: 150,
                minWidth: 100,
            },
            cost: {
                title: "Person cost",
                width: 150,
                minWidth: 100,
            },
            profit: {
                title: "Profit",
                width: 150,
                minWidth: 100,
            },
        },
        data: [] as any[],
    };

    const dateRange = timelogDateRange(ctx);
    const updatedRange = taskUpdatedRange(ctx);
    const projects = await getProjects();
    const projectsIds = projects.map(project => project.id);
    const timelogs = await fetchTimelogs({ projectIds: projectsIds, dateRange });
    const projectTasks: ITask[] = await fetchTasksByProjects(projectsIds, updatedRange);
    const people = await PeopleLoader.getAll({});

    for (const project of projects) {
        const timeLogged = timelogs
            .filter(timelog => timelog.project === project.id)
            .reduce((acc, timelog) => acc + timelog.duration, 0);
        const tasksEstimate = projectTasks
            .filter(task => task.project === project.id)
            .reduce((acc, task) => acc + (task.estimate || 0), 0);

        const peopleIds: string[] = [];
        projectTasks
            .filter(task => task.project === project.id)
            .forEach(task => {
                if (task.assignees) {
                    task.assignees.forEach(assignee => {
                        if (!peopleIds.includes(assignee)) {
                            peopleIds.push(assignee);
                        }
                    });
                }
            });
        const projectPeople = people.filter(person => peopleIds.includes(person.id));

        const row = {
            groupId: project.id,
            title: project.title,
            data: [] as any[],
            defaultExpanded: false,
            timeLogged,
            tasksEstimate,
            cost: 0,
            revenue: (project.hourlyRate ?? 0) * ((project.estimate ?? 0) / 3600),
            estimate: project.estimate,
            hourlyRate: project.hourlyRate,
            currency: project.currency,
            profit: 0,
        };

        for (const person of projectPeople) {
            const personRate = person.hourlyRates?.[project.currency] ?? 0;
            const timelogedPerson = timelogs
                .filter(timelog => timelog.project === project.id && timelog.person === person.id)
                .reduce((acc, timelog) => acc + timelog.duration, 0);

            const rowData = {
                project: {},
                person: person.id,
                timeLogged: timelogedPerson,
                hourlyRate: personRate,
                currency: project.currency,
                cost: personRate * (timelogedPerson / 3600),
            };

            row.cost += rowData.cost;

            row.data.push(rowData);
        }

        row.profit = row.revenue - row.cost;

        report.data.push(row);
    }

    return report;
}

export async function buildLoggedTimeUserReport(ctx: ReportLoadContext) {
    const report = {
        type: "grid",
        columns: {
            person: {
                title: "Person",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            timeLogged: {
                title: "Logged time",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            billableTime: {
                title: "Billable time",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            nonBillableTime: {
                title: "Non billable time",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
        },
        data: [] as any[],
    };

    const dateRange = timelogDateRange(ctx);
    const timelogs = await fetchTimelogs({ dateRange });
    const people = await PeopleLoader.getAll({});

    for (const person of people) {
        const row = {
            person: person.id,
            timeLogged: timelogs
                .filter(timelog => timelog.person === person.id)
                .reduce((acc, timelog) => acc + timelog.duration, 0),
            billableTime: timelogs
                .filter(timelog => timelog.person === person.id && timelog.billable)
                .reduce((acc, timelog) => acc + timelog.duration, 0),
            nonBillableTime: timelogs
                .filter(timelog => timelog.person === person.id && !timelog.billable)
                .reduce((acc, timelog) => acc + timelog.duration, 0),
        };

        report.data.push(row);
    }

    return report;
}

export async function buildLoggedTimeProjectReport(ctx: ReportLoadContext) {
    const report = {
        type: "grid",
        columns: {
            project: {
                title: "Project",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            timeEstimated: {
                title: "Time estimated",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            timeLogged: {
                title: "Logged time",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            billableTime: {
                title: "Billable time",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
            nonBillableTime: {
                title: "Non billable time",
                width: 150,
                minWidth: 100,
                resizable: true,
            },
        },
        data: [] as any[],
    };

    const dateRange = timelogDateRange(ctx);
    const timelogs = await fetchTimelogs({ dateRange });
    const projects = await getProjects();

    for (const project of projects) {
        const row = {
            project: { id: project.id, title: project.title },
            timeEstimated: project.estimate,
            timeLogged: timelogs
                .filter(timelog => timelog.project === project.id)
                .reduce((acc, timelog) => acc + timelog.duration, 0),
            billableTime: timelogs
                .filter(timelog => timelog.project === project.id && timelog.billable)
                .reduce((acc, timelog) => acc + timelog.duration, 0),
            nonBillableTime: timelogs
                .filter(timelog => timelog.project === project.id && !timelog.billable)
                .reduce((acc, timelog) => acc + timelog.duration, 0),
        };

        report.data.push(row);
    }

    return report;
}

export async function buildResourceUtilizationReport(ctx: ReportLoadContext) {
    const report = {
        type: "grid",
        columns: {
            person: {
                title: "Person",
                width: 200,
                minWidth: 150,
                resizable: true,
            },
            totalCapacity: {
                title: "Total Capacity (hrs)",
                width: 150,
                minWidth: 120,
            },
            timeLogged: {
                title: "Time Logged (hrs)",
                width: 150,
                minWidth: 120,
            },
            billableTime: {
                title: "Billable Time (hrs)",
                width: 150,
                minWidth: 120,
            },
            utilizationRate: {
                title: "Utilization %",
                width: 150,
                minWidth: 120,
            },
            billableRate: {
                title: "Billable %",
                width: 150,
                minWidth: 120,
            },
            activeProjects: {
                title: "Active Projects",
                width: 150,
                minWidth: 120,
            },
            efficiency: {
                title: "Efficiency Score",
                width: 150,
                minWidth: 120,
            },
        },
        data: [] as any[],
    };

    const dateRange = timelogDateRange(ctx);
    const updatedRange = taskUpdatedRange(ctx);
    const people = await PeopleLoader.getAll({});
    const projects = await getProjects();
    const projectsIds = projects.map(project => project.id);
    const tasks: ITask[] = await fetchTasksByProjects(projectsIds, updatedRange);
    const timelogs = await fetchTimelogs({ projectIds: projectsIds, dateRange });

    for (const person of people) {
        const personTimelogs = timelogs.filter(timelog => timelog.person === person.id);
        const totalTimeLogged = personTimelogs.reduce((acc, timelog) => acc + timelog.duration, 0) / 3600;
        const billableTime =
            personTimelogs
                .filter(timelog => timelog.billable)
                .reduce((acc, timelog) => acc + timelog.duration, 0) / 3600;

        const totalCapacity = 40;
        const utilizationRate = totalCapacity > 0 ? (totalTimeLogged / totalCapacity) * 100 : 0;
        const billableRate = totalTimeLogged > 0 ? (billableTime / totalTimeLogged) * 100 : 0;

        const personTasks = tasks.filter(task => task.assignees?.includes(person.id) && !task.done);
        const activeProjects = [...new Set(personTasks.map(task => task.project))].length;

        const completedTasks = tasks.filter(task => task.assignees?.includes(person.id) && task.done).length;
        const totalTasks = tasks.filter(task => task.assignees?.includes(person.id)).length;
        const taskCompletionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;
        const efficiency = (taskCompletionRate * 0.6 + (utilizationRate / 100) * 0.4) * 100;

        const row = {
            id: person.id,
            person: person.id,
            totalCapacity,
            timeLogged: Math.round(totalTimeLogged * 100) / 100,
            billableTime: Math.round(billableTime * 100) / 100,
            utilizationRate: Math.round(utilizationRate * 100) / 100,
            billableRate: Math.round(billableRate * 100) / 100,
            activeProjects,
            efficiency: Math.round(efficiency * 100) / 100,
        };

        report.data.push(row);
    }

    return report;
}

export async function buildProjectBudgetVsActualReport(ctx: ReportLoadContext) {
    const report = {
        type: "grid",
        columns: {
            project: {
                title: "Project",
                width: 250,
                minWidth: 200,
                resizable: true,
            },
            budgetEstimated: {
                title: "Budget Estimated",
                width: 150,
                minWidth: 120,
            },
            actualCost: {
                title: "Actual Cost",
                width: 150,
                minWidth: 120,
            },
            variance: {
                title: "Variance",
                width: 150,
                minWidth: 120,
            },
            variancePercent: {
                title: "Variance %",
                width: 150,
                minWidth: 120,
            },
            timeEstimated: {
                title: "Time Estimated (hrs)",
                width: 150,
                minWidth: 120,
            },
            timeActual: {
                title: "Time Actual (hrs)",
                width: 150,
                minWidth: 120,
            },
            costPerHour: {
                title: "Cost/Hour",
                width: 150,
                minWidth: 120,
            },
            status: {
                title: "Budget Status",
                width: 150,
                minWidth: 120,
            },
        },
        data: [] as any[],
    };

    const dateRange = timelogDateRange(ctx);
    const projects = await getProjects();
    const projectsIds = projects.map(project => project.id);
    const timelogs = await fetchTimelogs({ projectIds: projectsIds, dateRange });
    const people = await PeopleLoader.getAll({});

    for (const project of projects) {
        const projectTimelogs = timelogs.filter(timelog => timelog.project === project.id);
        const timeActual = projectTimelogs.reduce((acc, timelog) => acc + timelog.duration, 0) / 3600;
        const timeEstimated = (project.estimate || 0) / 3600;

        let actualCost = 0;
        for (const timelog of projectTimelogs) {
            const person = people.find(p => p.id === timelog.person);
            const hourlyRate = person?.hourlyRates?.[project.currency] || 0;
            actualCost += (timelog.duration / 3600) * hourlyRate;
        }

        const budgetEstimated = (project.hourlyRate || 0) * timeEstimated;
        const variance = actualCost - budgetEstimated;
        const variancePercent = budgetEstimated > 0 ? (variance / budgetEstimated) * 100 : 0;
        const costPerHour = timeActual > 0 ? actualCost / timeActual : 0;

        let status = "On Budget";
        if (variancePercent > 10) status = "Over Budget";
        else if (variancePercent < -10) status = "Under Budget";

        const row = {
            id: project.id,
            project: { id: project.id, title: project.title },
            budgetEstimated: Math.round(budgetEstimated * 100) / 100,
            actualCost: Math.round(actualCost * 100) / 100,
            variance: Math.round(variance * 100) / 100,
            variancePercent: Math.round(variancePercent * 100) / 100,
            timeEstimated: Math.round(timeEstimated * 100) / 100,
            timeActual: Math.round(timeActual * 100) / 100,
            costPerHour: Math.round(costPerHour * 100) / 100,
            status,
            currency: project.currency,
        };

        report.data.push(row);
    }

    return report;
}

export async function buildUserWorkloadDistributionReport(ctx: ReportLoadContext) {
    const report = {
        type: "grid",
        columns: {
            person: {
                title: "Projects",
                width: 200,
                minWidth: 100,
            },
            projectsList: {
                title: "Projects",
                width: 100,
                minWidth: 100,
            },
            taskCompletion: {
                title: "Task completion",
                width: 200,
                minWidth: 150,
            },
            todoTasks: {
                title: "Todo",
                width: 150,
                minWidth: 150,
            },
            doneTasks: {
                title: "Completed",
                width: 150,
                minWidth: 150,
            },
            inProgressTasks: {
                title: "In progress",
                width: 150,
                minWidth: 150,
            },
            dueTodayTasks: {
                title: "Today",
                width: 150,
                minWidth: 150,
            },
            overdueTasks: {
                title: "Overdue",
                width: 150,
                minWidth: 150,
            },
            criticalTasks: {
                title: "Critical",
                width: 150,
                minWidth: 150,
            },
            highTasks: {
                title: "High",
                width: 150,
                minWidth: 150,
            },
            mediumTasks: {
                title: "Medium",
                width: 150,
                minWidth: 150,
            },
            lowTasks: {
                title: "Low",
                width: 150,
                minWidth: 150,
            },
        },
        data: [] as any[],
    };

    const updatedRange = taskUpdatedRange(ctx);
    const tasks = await fetchTasksWithAssignees(updatedRange);
    const people = await PeopleLoader.getAll({});
    const projects = await getProjects();
    const today = new Date();

    for (const person of people) {
        const projectsAssigned: string[] = [];

        const totalTasks = tasks.reduce((acc, task) => {
            if (task.assignees?.includes(person.id)) {
                acc++;
                if (!projectsAssigned.includes(task.project)) {
                    projectsAssigned.push(task.project);
                }
            }
            return acc;
        }, 0);

        const projectsList = projects
            .filter(project => projectsAssigned.includes(project.id))
            .map(project => ({
                id: project.id,
                title: project.title,
            }));

        const doneTasks = tasks.reduce((acc, task) => {
            if (task.assignees?.includes(person.id) && task.done) {
                acc++;
            }
            return acc;
        }, 0);

        const inProgressTasks = tasks.reduce((acc, task) => {
            if (task.assignees?.includes(person.id) && !task.done && task.progress > 0) {
                acc++;
            }
            return acc;
        }, 0);

        const overdueTasks = tasks.reduce((acc, task) => {
            if (
                task.assignees?.includes(person.id) &&
                !task.done &&
                task.duedate &&
                isBefore(task.duedate, today)
            ) {
                acc++;
            }
            return acc;
        }, 0);

        const dueTodayTasks = tasks.reduce((acc, task) => {
            if (
                task.assignees?.includes(person.id) &&
                !task.done &&
                task.duedate &&
                isSameDay(task.duedate, today)
            ) {
                acc++;
            }
            return acc;
        }, 0);

        const criticalTasks = tasks.reduce((acc, task) => {
            if (task.assignees?.includes(person.id) && !task.done && task.priority === PRIORITY.CRITICAL) {
                acc++;
            }
            return acc;
        }, 0);

        const highTasks = tasks.reduce((acc, task) => {
            if (task.assignees?.includes(person.id) && !task.done && task.priority === PRIORITY.HIGH) {
                acc++;
            }
            return acc;
        }, 0);

        const mediumTasks = tasks.reduce((acc, task) => {
            if (task.assignees?.includes(person.id) && !task.done && task.priority === PRIORITY.MEDIUM) {
                acc++;
            }
            return acc;
        }, 0);

        const lowTasks = tasks.reduce((acc, task) => {
            if (task.assignees?.includes(person.id) && !task.done && task.priority === PRIORITY.LOW) {
                acc++;
            }
            return acc;
        }, 0);

        report.data.push({
            id: person.id,
            person: person.id,
            projectsList,
            totalTasks,
            todoTasks: totalTasks,
            doneTasks,
            inProgressTasks,
            dueTodayTasks,
            overdueTasks,
            criticalTasks,
            highTasks,
            mediumTasks,
            lowTasks,
        });
    }

    return report;
}

export const reportBuilders: Partial<Record<REPORT_TYPE, (ctx: ReportLoadContext) => Promise<unknown>>> = {
    [REPORT_TYPE.PROJECT_HEALTH]: buildProjectHealthReport,
    [REPORT_TYPE.ESTIMATED_VS_LOGGED]: buildEstimatedVsLoggedReport,
    [REPORT_TYPE.PLANNED_VS_ACTUAL]: buildPlannedVsActualReport,
    [REPORT_TYPE.PROFITABILITY]: buildProfitabilityReport,
    [REPORT_TYPE.LOGGED_TIME_USER]: buildLoggedTimeUserReport,
    [REPORT_TYPE.LOGGED_TIME_PROJECT]: buildLoggedTimeProjectReport,
    [REPORT_TYPE.RESOURCE_UTILIZATION]: buildResourceUtilizationReport,
    [REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL]: buildProjectBudgetVsActualReport,
    [REPORT_TYPE.USER_WORKLOAD_DISTRIBUTION]: buildUserWorkloadDistributionReport,
};
