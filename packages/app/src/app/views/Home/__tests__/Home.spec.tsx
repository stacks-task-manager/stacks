import { act, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import type { ICompany } from "@stacks/types";
import { MemoryRouter } from "react-router-dom";
import { PeopleActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { Home } from "../Home";

jest.mock("app/hooks", () => ({
    getDocument: jest.fn(),
    useMe: () => undefined,
    useStorage: () => [{ backgroundColor: "#fff", widgets: ["favoritePeopleCompanies"] }, jest.fn()],
}));
jest.mock("app/store/actions", () => ({
    HomeActions: { load: jest.fn() },
    PeopleActions: jest.requireActual("app/store/actions/people").PeopleActions,
}));
jest.mock("app/widgets", () => ({
    AppView: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    AppViewContent: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    Editor: () => null,
    HomeBackground: () => null,
    HomeCustomizer: () => null,
    HomeMyTasks: () => null,
    TagsWrapper: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
    TodoList: () => null,
}));

it("updates favorite companies when their favorite ids change", () => {
    PeopleStore.set({
        ...PeopleStore.get(),
        people: [],
        companies: [{ id: "company-1", title: "Favorite company" } as ICompany],
        favoritePeople: [],
        favoriteCompanies: ["company-1"],
    });

    render(
        <MemoryRouter>
            <Home />
        </MemoryRouter>
    );
    expect(screen.getByText("Favorite company")).toBeInTheDocument();

    act(() => PeopleActions.toggleFavoriteCompany("company-1"));

    expect(screen.queryByText("Favorite company")).not.toBeInTheDocument();
});
