// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    EditableText,
    InputGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
} from "@blueprintjs/core";
import classNames from "classnames";
import React from "react";
import { useNavigate } from "react-router-dom";
import { translate } from "@stacks/translations";
import type { ITask, IWorkbook } from "@stacks/types";

import { Icon } from "app/components/common";
import { WorkbooksActions } from "app/store/actions";
import { showPermissions, toggleNewTask } from "app/store/global";
import dialog from "app/utils/dialog";
import toast from "app/utils/toast";

export type WorkbookView = "table" | "gantt" | "overview";

interface ToolbarWorkbookProps {
    workbook?: IWorkbook;
    title: string;
    query: string;
    view: WorkbookView;
    tasks: ITask[];
    onTitleChange: (title: string) => void;
    onQueryChange: (query: string) => void;
    onViewChange: (view: WorkbookView) => void;
    onEditFilters: () => void;
}

export const ToolbarWorkbook = ({
    workbook,
    title,
    query,
    view,
    tasks,
    onTitleChange,
    onQueryChange,
    onViewChange,
    onEditFilters,
}: ToolbarWorkbookProps) => {
    const navigate = useNavigate();

    const handleDelete = async () => {
        if (!workbook) return;
        const confirmed = await dialog.confirm(
            translate("Delete workbook"),
            translate("Are you sure you want to delete this workbook?")
        );
        if (!confirmed) return;
        await WorkbooksActions.remove(workbook.id);
        toast.success(translate("Workbook deleted"));
        navigate("/workbooks");
    };

    const handlePermissions = () => {
        if (!workbook) return;
        showPermissions(workbook.permissions, permissions =>
            WorkbooksActions.updatePermissions(workbook.id, permissions)
        );
    };

    const handleExport = (format: "json" | "excel") =>
        workbook && WorkbooksActions.exportWorkbook(workbook, tasks, format);

    return (
        <div className="main-toolbar" data-testid="workbook-toolbar">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <Button
                            icon={<Icon icon="arrow-left" />}
                            minimal
                            onClick={() => navigate("/workbooks")}
                        />
                        <h1>
                            <EditableText
                                value={title || translate("Loading")}
                                disabled={!workbook}
                                onChange={onTitleChange}
                                onConfirm={nextTitle => {
                                    const trimmed = nextTitle.trim();
                                    if (!workbook || !trimmed || trimmed === workbook.title) return;
                                    void WorkbooksActions.update(workbook.id, { title: trimmed });
                                }}
                            />
                        </h1>

                        <Popover
                            content={
                                <Menu>
                                    <MenuItem
                                        icon={<Icon icon="edit-04" />}
                                        text={translate("Edit filters")}
                                        onClick={onEditFilters}
                                    />
                                    <MenuItem
                                        icon={<Icon icon="lock-01" />}
                                        text={`${translate("Permissions")}...`}
                                        onClick={handlePermissions}
                                    />
                                    <MenuDivider />
                                    <MenuItem icon={<Icon icon="download-04" />} text={translate("Export")}>
                                        <MenuItem
                                            icon={<Icon icon="download-04" />}
                                            text={translate("Export as", { type: ".json" })}
                                            onClick={() => handleExport("json")}
                                        />
                                        <MenuItem
                                            icon={<Icon icon="download-04" />}
                                            text={translate("Export as", { type: ".xlsx" })}
                                            onClick={() => handleExport("excel")}
                                        />
                                    </MenuItem>
                                    <MenuDivider />
                                    <MenuItem
                                        icon={<Icon icon="trash" />}
                                        intent={Intent.DANGER}
                                        text={`${translate("Delete workbook")}...`}
                                        onClick={handleDelete}
                                    />
                                </Menu>
                            }
                        >
                            <Button
                                icon={<Icon icon="chevron-down" />}
                                variant="minimal"
                                aria-label={translate("More")}
                            />
                        </Popover>
                    </div>
                </div>
                <div className="section-toolbar-side fixed">
                    <InputGroup
                        round
                        leftIcon={<Icon icon="search" />}
                        value={query}
                        placeholder={translate("Search tasks")}
                        onChange={event => onQueryChange(event.currentTarget.value)}
                    />
                    <Button icon={<Icon icon="plus" />} intent="primary" onClick={toggleNewTask}>
                        {translate("Add task")}
                    </Button>
                </div>
            </div>
            <div className="section-toolbar">
                <div className="section-toolbar-side" role="tablist" aria-label={translate("Workbook views")}>
                    {(["table", "gantt", "overview"] as const).map(item => (
                        <button
                            key={item}
                            type="button"
                            role="tab"
                            aria-selected={view === item}
                            className={classNames("view-type-button", { active: view === item })}
                            onClick={() => onViewChange(item)}
                        >
                            <Icon
                                icon={
                                    item === "table"
                                        ? "list-view"
                                        : item === "gantt"
                                          ? "dataflow-03"
                                          : "overview-view"
                                }
                            />
                            {translate(item === "table" ? "Table" : item === "gantt" ? "Gantt" : "Overview")}
                        </button>
                    ))}
                </div>
                <div className="section-toolbar-side" />
            </div>
        </div>
    );
};
