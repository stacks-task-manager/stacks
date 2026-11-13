import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";

import { TimeInput, generateTimeSlots } from "../TimeInput";

jest.mock("@blueprintjs/core", () => {
    const ReactModule = jest.requireActual("react");
    return {
        Intent: { PRIMARY: "primary", NONE: "none" },
        Menu: ({ children }: any) => <div>{children}</div>,
        MenuItem: ({ text, onClick }: any) => (
            <button data-testid={`time-option-${text}`} onClick={onClick}>
                {text}
            </button>
        ),
        Popover: ({ renderTarget, content, onOpened }: any) => {
            const [open, setOpen] = ReactModule.useState(false);
            ReactModule.useEffect(() => {
                if (open) onOpened?.();
            }, [open]);
            const target = renderTarget({ isOpen: open, ref: () => undefined });
            return (
                <>
                    <div
                        onFocus={() => setOpen(true)}
                        onBlur={() => setOpen(false)}
                        data-testid="time-popover-target"
                    >
                        {target}
                    </div>
                    {open ? <div data-testid="time-popover">{content}</div> : null}
                </>
            );
        },
        InputGroup: ({ inputRef, leftIcon, onChange, onKeyDown, onFocus, onBlur, ...props }: any) => (
            <input
                ref={inputRef}
                data-has-left-icon={Boolean(leftIcon)}
                onChange={onChange}
                onKeyDown={onKeyDown}
                onFocus={onFocus}
                onBlur={onBlur}
                {...props}
            />
        ),
    };
});
jest.mock("app/components/common", () => ({
    Icon: () => null,
    Scroller: ({ children }: any) => <div>{children}</div>,
}));
jest.mock("app/utils/dom", () => ({ scrollIntoView: jest.fn() }));

describe("time input characterization", () => {
    it("generates 12-hour slots in the existing format", () => {
        expect(generateTimeSlots(false, 30, "09:00", "09:30")).toEqual(["9:00 AM", "9:30 AM"]);
    });

    it("filters options by 12-hour min/max boundaries and span", () => {
        const onChange = jest.fn();
        render(<TimeInput value="11:30 PM" span={30} min="10:00 PM" max="11:30 PM" onChange={onChange} />);
        fireEvent.focus(screen.getByPlaceholderText("12:00"));

        expect(screen.getByTestId("time-option-10:00 PM")).toBeInTheDocument();
        expect(screen.getByTestId("time-option-10:30 PM")).toBeInTheDocument();
        expect(screen.getByTestId("time-option-11:00 PM")).toBeInTheDocument();
        expect(screen.queryByTestId("time-option-9:30 PM")).not.toBeInTheDocument();
        expect(screen.queryByTestId("time-option-12:00 AM")).not.toBeInTheDocument();
    });

    it("commits the first slot when Enter follows keyboard selection", () => {
        const onChange = jest.fn();
        render(<TimeInput value="" onChange={onChange} />);
        const input = screen.getByPlaceholderText("12:00");

        fireEvent.focus(input);
        fireEvent.keyDown(input, { key: "ArrowDown" });
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).toHaveBeenCalledWith("12:00 AM");
    });

    it("keeps a valid current time that is outside the generated slots", () => {
        const onChange = jest.fn();
        render(<TimeInput value="9:07 AM" onChange={onChange} />);
        const input = screen.getByPlaceholderText("12:00");

        fireEvent.focus(input);
        fireEvent.keyDown(input, { key: "Enter" });

        expect(onChange).toHaveBeenCalledWith("9:07 AM");
    });

    it("normalizes a typed partial time on blur", () => {
        const onChange = jest.fn();
        render(<TimeInput value="9:30 AM" onChange={onChange} />);
        const input = screen.getByPlaceholderText("12:00");

        fireEvent.focus(input);
        fireEvent.change(input, { target: { value: "9:30" } });
        fireEvent.blur(input);

        expect(onChange).toHaveBeenCalledWith("9:30 AM");
    });
});
