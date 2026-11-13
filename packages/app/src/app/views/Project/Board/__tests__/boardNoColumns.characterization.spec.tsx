import { render, screen } from "@testing-library/react";
import React from "react";

import { BoardNoColumns } from "../Board";

jest.mock("@stacks/translations", () => ({ translate: (key: string) => key }));
jest.mock("app/components/common", () => ({
    BlankSlate: ({ action }: { action: React.ReactNode }) => <>{action}</>,
    Grid: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
    NewGeneric: ({
        children,
        presentation,
    }: React.PropsWithChildren<{ presentation?: "inline" | "popover" }>) => (
        <div data-testid="new-generic" data-presentation={presentation ?? "inline"}>
            {children}
        </div>
    ),
}));
jest.mock("app/components/draggable", () => ({
    Container: ({ children }: React.PropsWithChildren) => <div>{children}</div>,
}));
jest.mock("app/components/project", () => ({ NewStack: () => null, Stack: () => null }));
jest.mock("app/hooks", () => ({
    getCurrentProjectId: jest.fn(),
    getHashPathname: jest.fn(),
    getProjectIdFromHashPath: jest.fn(),
    useMousetrap: jest.fn(),
    useNav: jest.fn(),
}));
jest.mock("app/hooks/router", () => ({ snapshotTaskModalBackground: jest.fn() }));
jest.mock("app/hooks/stacks", () => ({ useStacksIds: () => [] }));
jest.mock("app/store/actions", () => ({ StacksActions: { add: jest.fn() }, TasksActions: {} }));
jest.mock("app/store/navigation", () => ({
    NavigationStore: { get: jest.fn() },
    cancelSelection: jest.fn(),
    copySelection: jest.fn(),
    navigateNextStack: jest.fn(),
    navigateNextTask: jest.fn(),
    navigatePrevStack: jest.fn(),
    navigatePrevTask: jest.fn(),
}));
jest.mock("app/store/preferences", () => ({ PreferencesStore: { get: jest.fn() } }));
jest.mock("app/utils/dom", () => ({ scrollIntoView: jest.fn() }));

describe("empty board characterization", () => {
    it("keeps the add-stack action in a popover", () => {
        render(<BoardNoColumns />);

        expect(screen.getByTestId("new-generic")).toHaveAttribute("data-presentation", "popover");
        expect(screen.getByTestId("board-no-columns-blank-slate-add-button")).toBeInTheDocument();
    });
});
