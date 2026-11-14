// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Card } from "@blueprintjs/core";
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { translate } from "@stacks/translations";
import type { IWorkbook } from "@stacks/types";

import { BlankSlate, Grid, Icon } from "app/components/common";
import { AppView, AppViewContent, ToolbarWorkbooks } from "app/widgets";
import { WorkbooksActions } from "app/store/actions";
import { WorkbooksStore } from "app/store/workbooks";
import { formatDate } from "app/utils/date";
import { WorkbookDialog } from "./WorkbookDialog";

const filterSummary = (workbook: IWorkbook) => {
    const filters = workbook.filters;
    const parts = [
        filters.projects.length
            ? translate("Projects selected", { count: filters.projects.length })
            : translate("Any project"),
        translate(
            filters.state === "todo"
                ? "Incomplete tasks"
                : filters.state === "done"
                  ? "Completed tasks"
                  : "All tasks"
        ),
    ];
    if (filters.tags.length) parts.push(translate("Tags selected", { count: filters.tags.length }));
    if (filters.statuses.length)
        parts.push(translate("Statuses selected", { count: filters.statuses.length }));
    if (filters.startDate || filters.doDate || filters.dueDate) parts.push(translate("Dates active"));
    return parts.join(" · ");
};

export const Workbooks = () => {
    const navigate = useNavigate();
    const workbooks = WorkbooksStore.use(state => state.workbooks);
    const isLoading = WorkbooksStore.use(state => state.isLoading);
    const [query, setQuery] = useState("");
    const [createOpen, setCreateOpen] = useState(false);

    useEffect(() => {
        WorkbooksActions.loadAll().catch(() => undefined);
    }, []);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return normalized
            ? workbooks.filter(workbook => workbook.title.toLowerCase().includes(normalized))
            : workbooks;
    }, [query, workbooks]);

    return (
        <AppView
            data-testid="workbooks-view"
            toolbar={
                <ToolbarWorkbooks
                    query={query}
                    onQueryChange={setQuery}
                    onCreate={() => setCreateOpen(true)}
                />
            }
        >
            <AppViewContent padded>
                {!isLoading && filtered.length === 0 ? (
                    <Grid vertical>
                        <BlankSlate
                            testId="workbooks-blank-slate"
                            icon="book-open-01"
                            title={translate(query ? "No matching workbooks" : "No workbooks")}
                            description={translate(
                                query ? "Try another search" : "Create a reusable task view"
                            )}
                            action={
                                <Button intent="primary" onClick={() => setCreateOpen(true)}>
                                    {translate("Add workbook")}
                                </Button>
                            }
                        />
                    </Grid>
                ) : (
                    <Grid gap={12}>
                        {filtered.map(workbook => (
                            <Card
                                key={workbook.id}
                                interactive
                                onClick={() => navigate(`/workbooks/${workbook.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={event => {
                                    if (event.key === "Enter" || event.key === " ") {
                                        event.preventDefault();
                                        navigate(`/workbooks/${workbook.id}`);
                                    }
                                }}
                                className="workbook-list-item"
                                data-testid={`workbook-${workbook.id}`}
                            >
                                <div className="workbook-list-item__icon">
                                    <Icon icon="book-open-01" />
                                </div>
                                <div className="workbook-list-item__body">
                                    <div className="workbook-list-item__title">
                                        <strong>{workbook.title}</strong>
                                        {!workbook.permissions.isPublic && <Icon icon="lock" />}
                                    </div>
                                    <span>{filterSummary(workbook)}</span>
                                </div>
                                <small>
                                    {translate("Updated")} {formatDate(workbook.updated)}
                                </small>
                            </Card>
                        ))}
                    </Grid>
                )}
            </AppViewContent>
            <WorkbookDialog
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                onSaved={workbook => navigate(`/workbooks/${workbook.id}`)}
            />
        </AppView>
    );
};
