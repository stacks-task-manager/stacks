// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { fireEvent, render, screen } from "@testing-library/react";
import type { IWorkbookFilters } from "@stacks/types";
import type { IFilters } from "app/store/projectFilters";
import React from "react";

import { ProjectsFilter } from "../ProjectsFilter";
import { TaskFilter } from "../TaskFilter";
import type { ProjectFilterActions, WorkbookFilterActions } from "../TaskFilterActions";

const tags = [
    { id: "tag-1", title: "Tag one", color: "#123456", section: "projects", type: "tag", parent: null },
] as never[];
const statuses = [
    {
        id: "status-1",
        title: "Status one",
        color: "#654321",
        section: "projects",
        type: "status",
        parent: null,
    },
] as never[];
const projects = [{ id: "project-1", title: "Website" }] as never[];

jest.mock("@stacks/translations", () => ({
    translate: (key: string, values?: { count?: number }) =>
        values?.count == null ? key : `${key} ${values.count}`,
}));

jest.mock("app/hooks", () => ({
    getCurrentProjectId: () => "project-1",
    useMe: () => ({ id: "me", firstName: "Current", lastName: "User" }),
    usePeople: () => [],
    usePreferences: () => ({ dateLocale: undefined }),
    useProjectDocuments: () => projects,
    useProjectStatuses: () => statuses,
    useProjectTags: () => tags,
    useTags: (_section: unknown, type: string) => (type === "status" ? statuses : tags),
}));

jest.mock("app/components/common/Icon/Icon", () => ({ Icon: () => <span /> }));
jest.mock("app/components/common/AvatarChip/AvatarChip", () => ({ AvatarChip: () => null }));
jest.mock("app/components/common/Layout/Grid/Grid", () => ({
    Grid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));
jest.mock("app/components/project/PriorityMenu/PriorityMenu", () => ({ PriorityMenu: () => null }));
jest.mock("app/components/project/StatusesMenu/StatusesMenu", () => ({
    StatusesMenu: () => null,
}));
jest.mock("app/components/project/TagsMenu/TagsMenu", () => ({ TagsMenu: () => null }));
jest.mock("app/widgets/people/PeopleDialog/PeopleDialog", () => ({ PeopleDialog: () => null }));

const baseProjectFilters: IFilters = {
    query: "",
    tags: [],
    assignees: [],
    state: "todo",
    overdue: false,
    inProgress: false,
};

const baseWorkbookFilters: IWorkbookFilters = {
    projects: [],
    tags: [],
    statuses: [],
    state: "todo",
    assignees: [],
    overdue: false,
    inProgress: false,
    loggedTime: false,
};

const projectActions = (): ProjectFilterActions => ({
    set: jest.fn(),
    setMultiple: jest.fn(),
    setQuery: jest.fn(),
    hide: jest.fn(),
});

const workbookActions = (): WorkbookFilterActions => ({
    set: jest.fn(),
    setMultiple: jest.fn(),
});

describe("TaskFilter", () => {
    it("updates project filters through the supplied project actions", () => {
        const actions = projectActions();
        render(<TaskFilter mode="project" filters={baseProjectFilters} actions={actions} />);

        fireEvent.change(screen.getByTestId("filter-query-input"), { target: { value: "website" } });
        fireEvent.click(screen.getByLabelText("Only overdue tasks"));

        expect(screen.getByTestId("assignees-filter-button")).toBeInTheDocument();
        expect(actions.setQuery).toHaveBeenCalledWith("website");
        expect(actions.set).toHaveBeenCalledWith("overdue", true);
    });

    it("hides assignment controls in my tasks mode", () => {
        const actions = projectActions();
        render(<TaskFilter mode="myTasks" filters={{ ...baseProjectFilters, me: true }} actions={actions} />);

        expect(screen.getByTestId("filter-query-input")).toBeInTheDocument();
        expect(screen.queryByText("Tasks assigned to")).not.toBeInTheDocument();
        expect(screen.queryByTestId("assignees-filter-button")).not.toBeInTheDocument();
    });

    it("uses workbook-local actions and exposes workbook-only filters", () => {
        const actions = workbookActions();
        render(<TaskFilter mode="workbook" filters={baseWorkbookFilters} actions={actions} />);

        expect(screen.queryByTestId("filter-query-input")).not.toBeInTheDocument();
        expect(screen.getByText("Project")).toBeInTheDocument();

        fireEvent.click(screen.getByLabelText("Only tasks with logged time"));
        expect(actions.set).toHaveBeenCalledWith("loggedTime", true);
    });

    it("adds and removes repeated project selections without losing state", () => {
        const onChange = jest.fn();
        const { rerender } = render(<ProjectsFilter projects={[]} onChange={onChange} />);

        fireEvent.click(screen.getByText("Any project"));
        fireEvent.click(screen.getByText("Website"));
        expect(onChange).toHaveBeenLastCalledWith(["project-1"]);
        expect(screen.getByRole("menuitem", { name: "Website" })).toBeInTheDocument();

        rerender(<ProjectsFilter projects={["project-1"]} onChange={onChange} />);
        fireEvent.click(screen.getByRole("button", { name: "Website" }));
        fireEvent.click(screen.getByRole("menuitem", { name: "Website" }));
        expect(onChange).toHaveBeenLastCalledWith([]);
    });
});
