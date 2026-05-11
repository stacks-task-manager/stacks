// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Report catalog and typed report data (requires reports role section).
 */
import { REPORT_TYPE, ROLE_SECTIONS } from "@stacks/types";
import { translate } from "@stacks/translations";
import type { Context } from "hono";
import { Hono } from "hono";
import { ReportsLoader } from "../loaders";
import { isReportSpan } from "../reports/dateRange";
import type { ReportLoadContext } from "../reports/context";
import { requireRoleAccess } from "../middleware/roleAccess";
import { asyncHandler } from "../utils/errorHandler";

const reports = new Hono();

const REPORTS = [
    {
        title: "Financial utilization insights",
        description: "Monitor and gain insights into your utilization, revenue, costs and profit.",
        icon: "currency-dollar",
        type: REPORT_TYPE.FINANCIAL_UTILIZATION_INSIGHTS,
        disabled: true,
    },
    {
        title: "Project health",
        description: "Monitor and oversee the advancement of your project initiatives",
        icon: "check-heart",
        color: "#EB6847",
        type: REPORT_TYPE.PROJECT_HEALTH,
    },
    {
        title: "Resource utilization",
        description: "Track and manage how your team's time is being distributed.",
        icon: "user",
        color: "#0F6894",
        type: REPORT_TYPE.UTILIZATION,
        disabled: true,
    },
    {
        title: "Estimated vs. Logged",
        description: "Monitor and oversee task advancement within each project",
        icon: "hourglass-03",
        color: "#29A634",
        type: REPORT_TYPE.ESTIMATED_VS_LOGGED,
    },
    {
        title: "Planned vs. Actual",
        description: "Analyze the difference between intended and real outcomes for projects and tasks",
        icon: "calendar-check-01",
        color: "#238551",
        type: REPORT_TYPE.PLANNED_VS_ACTUAL,
    },
    {
        title: "Logged time per project",
        description:
            "Analyze time investment (both billable and non-billable) across your project portfolio.",
        icon: "check-circle-broken",
        color: "#C87619",
        type: REPORT_TYPE.LOGGED_TIME_PROJECT,
    },
    {
        title: "Logged time per user",
        description: "Analyze time investment (both billable and non-billable) across team members.",
        icon: "user-check-01",
        color: "#9D3F9D",
        type: REPORT_TYPE.LOGGED_TIME_USER,
    },
    {
        title: "Profitability",
        description: "Monitor the financial performance of your projects and team members.",
        icon: "currency-dollar",
        color: "#F0B726",
        type: REPORT_TYPE.PROFITABILITY,
    },
    {
        title: "People workload distribution",
        description: "Visualize the distribution of workload across team members.",
        icon: "user-square",
        color: "#5642A6",
        type: REPORT_TYPE.USER_WORKLOAD_DISTRIBUTION,
    },

    {
        title: "Project budget vs Actual cost",
        description: "Compare the initial project budget against the actual costs incurred.",
        icon: "currency-dollar",
        color: "#ff6700",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Billable amount",
        description: "Track the amount of billable hours and revenue generated.",
        icon: "currency-dollar",
        color: "#E11D48",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Uninvoiced amount",
        description: "Monitor uninvoiced billable hours and potential revenue.",
        icon: "currency-dollar",
        color: "#EA580C",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Client profitability",
        description: "Analyze profitability across different clients.",
        icon: "currency-dollar",
        color: "#65A30D",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Task completion rate",
        description: "Measure the efficiency of task completion across projects.",
        icon: "check-circle-broken",
        color: "#0D9488",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Team capacity",
        description: "View team availability and capacity planning.",
        icon: "users",
        color: "#2563EB",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Project margin analysis",
        description: "Analyze the profit margin for each project.",
        icon: "folder",
        color: "#9333EA",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Overdue tasks",
        description: "Track tasks that have exceeded their due dates.",
        icon: "calendar-view",
        color: "#C026D3",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Time to resolution",
        description: "Measure the average time taken to resolve issues or tasks.",
        icon: "clock-stopwatch",
        color: "#DB2777",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Resource allocation",
        description: "View how resources are allocated across different projects.",
        icon: "users-check",
        color: "#4B5563",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
    {
        title: "Expense breakdown",
        description: "Analyze project expenses by category.",
        icon: "currency-dollar",
        color: "#DC2626",
        type: REPORT_TYPE.PROJECT_BUDGET_VS_ACTUAL,
        disabled: true,
    },
];

reports.use("*", requireRoleAccess(ROLE_SECTIONS.REPORTS));

/** GET `/` — Returns the static catalog of available report types for the UI. */
reports.get(
    "/",
    asyncHandler(async (c: Context) => {
        return c.replySuccess(REPORTS);
    })
);

/** GET `/:type` — Loads report payload for `type`, optionally scoped by `span` query. */
reports.get(
    "/:type",
    asyncHandler(async (c: Context) => {
        const type = c.req.param("type");
        const spanRaw = c.req.query("span");

        let ctx: ReportLoadContext = {};
        if (spanRaw !== undefined) {
            if (!isReportSpan(spanRaw)) {
                return c.replyError(new Error(translate("Invalid span parameter")), undefined, 400);
            }
            ctx = { span: spanRaw };
        }

        const report = await ReportsLoader.getReport(type as REPORT_TYPE, ctx);

        return c.replySuccess(report);
    })
);

export default reports;
