// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum REPORT_TYPE {
    FINANCIAL_UTILIZATION_INSIGHTS = "financial_utilization_insights",
    PROJECT_HEALTH = "project_health",
    UTILIZATION = "utilization",
    ESTIMATED_VS_LOGGED = "estimated_vs_logged",
    TIME = "time",
    PLANNED_VS_ACTUAL = "planned_vs_actual",
    LOGGED_TIME_PROJECT = "logged_time_project",
    LOGGED_TIME_USER = "logged_time_user",
    PROFITABILITY = "profitability",
    RESOURCE_UTILIZATION = "resource_utilization",
    PROJECT_BUDGET_VS_ACTUAL = "project_budget_vs_actual",
    USER_WORKLOAD_DISTRIBUTION = "user_workload_distribution",
}

export interface IReport {
    title: string;
    description: string;
    icon: string;
    color: string;
    type: REPORT_TYPE;
    disabled?: boolean;
}
