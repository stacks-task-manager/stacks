import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { NewGeneric } from "../NewGeneric";

jest.mock("@stacks/translations", () => ({ translate: (key: string) => key }));
jest.mock("@blueprintjs/core", () => {
    const ReactModule = jest.requireActual("react");
    return {
        Classes: { POPOVER_DISMISS: "popover-dismiss", POPOVER_DISMISS_OVERRIDE: "popover-dismiss-override" },
        Intent: { PRIMARY: "primary" },
        Button: ({ children, onClick, ...props }: any) => (
            <button type="button" onClick={onClick} {...props}>
                {children}
            </button>
        ),
        InputGroup: ({ rightElement, onChange, onKeyDown, placeholder, value, ...props }: any) => (
            <div>
                <input
                    placeholder={placeholder}
                    value={value}
                    onChange={onChange}
                    onKeyDown={onKeyDown}
                    {...props}
                />
                {rightElement}
            </div>
        ),
        Popover: ({ children, content }: any) => {
            const [open, setOpen] = ReactModule.useState(false);
            return (
                <>
                    <button data-testid="popover-target" onClick={() => setOpen(true)}>
                        {children}
                    </button>
                    {open ? <div data-testid="popover-content">{content}</div> : null}
                </>
            );
        },
    };
});

// Type-level regressions: these invalid combinations must remain compile-time errors.
const invalidInline = (
    // @ts-expect-error Inline creation does not accept a popover trigger.
    <NewGeneric placeholder="Name" onAdd={jest.fn()}>
        Ignored trigger
    </NewGeneric>
);
// @ts-expect-error Popover creation requires a trigger.
const invalidPopover = <NewGeneric presentation="popover" placeholder="Name" onAdd={jest.fn()} />;
void invalidInline;
void invalidPopover;

describe("new generic characterization", () => {
    it("trims guard and commits inline input with Enter", () => {
        const onAdd = jest.fn();
        render(<NewGeneric placeholder="Name" onAdd={onAdd} />);
        const input = screen.getByPlaceholderText("Name");

        fireEvent.change(input, { target: { value: "  Team  " } });
        fireEvent.keyDown(input, { key: "Enter" });
        expect(onAdd).toHaveBeenCalledWith("  Team  ");

        fireEvent.change(input, { target: { value: "   " } });
        fireEvent.keyDown(input, { key: "Enter" });
        expect(onAdd).toHaveBeenCalledTimes(1);
    });

    it("commits popover input and preserves its stable test IDs", () => {
        const onAdd = jest.fn();
        render(
            <NewGeneric presentation="popover" placeholder="Company" onAdd={onAdd}>
                Add company
            </NewGeneric>
        );

        fireEvent.click(screen.getByTestId("popover-target"));
        const input = screen.getByTestId("popup-new-generic-input");
        fireEvent.change(input, { target: { value: "Acme" } });
        fireEvent.click(screen.getByTestId("popup-new-generic-button"));

        expect(onAdd).toHaveBeenCalledWith("Acme");
    });
});
