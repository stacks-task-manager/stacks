// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { IWorkbook, IWorkbookFilters } from "@stacks/types";
import React from "react";

import { WorkbooksActions } from "app/store/actions";
import type { WorkbookFilterActions } from "app/widgets/task/TaskFilter/TaskFilterActions";
import { WorkbookDialog } from "../WorkbookDialog";

jest.mock("@stacks/translations", () => ({ translate: (key: string) => key }));

jest.mock("@blueprintjs/core", () => {
    const ReactModule = jest.requireActual("react");
    const passthrough = (props: Record<string, unknown>) => {
        const { children, onClick, onChange, label, title, isOpen, loading, intent, ...rest } = props;
        return rest;
    };

    return {
        Button: ({ children, onClick, loading: _loading, intent: _intent, ...props }: any) => (
            <button type="button" onClick={onClick} {...props}>
                {children}
            </button>
        ),
        Classes: { DIALOG_BODY: "dialog-body" },
        Dialog: ({ isOpen, title, children }: any) =>
            isOpen ? (
                <div>
                    <h1>{title}</h1>
                    {children}
                </div>
            ) : null,
        FormGroup: ({ label, children }: any) => (
            <div>
                <label>{label}</label>
                {children}
            </div>
        ),
        InputGroup: ({ value, onChange, ...props }: any) => (
            <input value={value} onChange={onChange} {...passthrough(props)} />
        ),
        Intent: { PRIMARY: "primary" },
        ReactModule,
    };
});

jest.mock("app/components/common", () => ({
    Scroller: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

jest.mock("app/store/actions", () => ({
    WorkbooksActions: {
        create: jest.fn(),
        update: jest.fn(),
    },
}));

jest.mock("app/widgets", () => ({
    TaskFilter: ({ actions }: { actions: WorkbookFilterActions }) => (
        <button type="button" onClick={() => actions.set("loggedTime", true)}>
            toggle logged time
        </button>
    ),
}));

const filters: IWorkbookFilters = {
    projects: [],
    tags: [],
    statuses: [],
    state: "todo",
    assignees: [],
    overdue: false,
    inProgress: false,
    loggedTime: false,
};

const workbook = {
    id: "workbook-1",
    title: "Workbook",
    filters,
    permissions: { isPublic: false },
    created: new Date(),
    updated: new Date(),
} as IWorkbook;

describe("WorkbookDialog filters", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(WorkbooksActions.update).mockResolvedValue(workbook);
    });

    it("saves edits from the workbook-local TaskFilter actions", async () => {
        render(<WorkbookDialog isOpen onClose={jest.fn()} workbook={workbook} />);

        await waitFor(() => expect(screen.getByDisplayValue("Workbook")).toBeInTheDocument());
        fireEvent.click(screen.getByText("toggle logged time"));
        fireEvent.click(screen.getByTestId("workbook-save-button"));

        await waitFor(() =>
            expect(WorkbooksActions.update).toHaveBeenCalledWith("workbook-1", {
                title: "Workbook",
                filters: { ...filters, loggedTime: true },
            })
        );
    });
});
