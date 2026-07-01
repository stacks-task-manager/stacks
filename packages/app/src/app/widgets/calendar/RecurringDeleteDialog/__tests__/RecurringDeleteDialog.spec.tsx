// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { RecurringDeleteDialog } from "../RecurringDeleteDialog";

jest.mock("@blueprintjs/core", () => {
    // Use React from the module scope since imports can't be inside the jest mock factory function

    return {
        Button: ({ children, onClick, ...props }: any) => (
            <button type="button" onClick={onClick} {...props}>
                {children}
            </button>
        ),
        Dialog: ({ isOpen, onClosed, title, children }: any) => {
            React.useEffect(() => {
                if (!isOpen) {
                    onClosed?.();
                }
            }, [isOpen, onClosed]);

            if (!isOpen) return null;

            return (
                <div>
                    <div>{title}</div>
                    {children}
                </div>
            );
        },
        Classes: {
            DIALOG_BODY: "dialog-body",
            DIALOG_FOOTER: "dialog-footer",
            DIALOG_FOOTER_ACTIONS: "dialog-footer-actions",
        },
        Intent: {
            DANGER: "danger",
        },
    };
});

describe("RecurringDeleteDialog", () => {
    it("returns single when the single occurrence option is selected", async () => {
        const onClose = jest.fn();

        render(<RecurringDeleteDialog onClose={onClose} />);

        fireEvent.click(screen.getByText("Only this event"));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledWith("single");
        });
    });

    it("returns series when the entire series option is selected", async () => {
        const onClose = jest.fn();

        render(<RecurringDeleteDialog onClose={onClose} />);

        fireEvent.click(screen.getByText("Entire series"));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledWith("series");
        });
    });
});
