import { act, fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { PeopleStore } from "app/store/people";
import { Assignees } from "../Assignees";

const people = [
    { id: "person-1", firstName: "Ada", lastName: "Lovelace" },
    { id: "person-2", firstName: "Grace", lastName: "Hopper" },
    { id: "person-3", firstName: "Linus", lastName: "Torvalds" },
] as never[];

jest.mock("app/components/common/Avatar/Avatar", () => ({
    Avatar: ({ person, onClick, small }: any) => (
        <button data-testid={`avatar-${person.id}`} data-small={String(Boolean(small))} onClick={onClick}>
            {person.firstName}
        </button>
    ),
}));
describe("assignees characterization", () => {
    beforeEach(() => {
        PeopleStore.set({ ...PeopleStore.get(), people });
    });

    afterEach(() => {
        PeopleStore.init();
    });

    it("renders direct people, overflow count, and removal callbacks", () => {
        const onRemove = jest.fn();
        render(<Assignees assignees={people} max={2} small onRemove={onRemove} />);

        expect(screen.getByTestId("avatar-person-1")).toHaveAttribute("data-small", "true");
        expect(screen.getByText("+1")).toBeInTheDocument();
        fireEvent.click(screen.getByTestId("avatar-person-1"));
        expect(onRemove).toHaveBeenCalledWith("person-1");
    });

    it("updates resolved IDs when the people store changes", () => {
        render(<Assignees hideWhenEmpty assignees={["person-4"]} />);
        expect(screen.queryByText("Katherine")).not.toBeInTheDocument();

        act(() => {
            PeopleStore.set({
                ...PeopleStore.get(),
                people: [...people, { id: "person-4", firstName: "Katherine", lastName: "Johnson" } as never],
            });
        });

        expect(screen.getByText("Katherine")).toBeInTheDocument();
    });

    it("resolves IDs and hides empty sync assignees", () => {
        const { rerender } = render(<Assignees hideWhenEmpty assignees={["person-2"]} />);
        expect(screen.getByText("Grace")).toBeInTheDocument();

        rerender(<Assignees hideWhenEmpty assignees={[]} />);
        expect(screen.queryByText("Grace")).not.toBeInTheDocument();
    });
});
