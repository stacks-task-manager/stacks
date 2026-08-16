// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { RecurringDeleteDialog } from "../RecurringDeleteDialog";

jest.mock("@blueprintjs/core", () => {
    const ReactModule = jest.requireActual("react");

    return {
        Button: ({ children, onClick, ...props }: any) => (
            <button type="button" onClick={onClick} {...props}>
                {children}
            </button>
        ),
        Dialog: ({ isOpen, onClose, onClosed, title, children }: any) => {
            ReactModule.useEffect(() => {
                if (!isOpen) {
                    onClosed?.();
                }
            }, [isOpen, onClosed]);

            if (!isOpen) return null;

            return (
                <div>
                    <div>{title}</div>
                    <button data-testid="recurring-delete-dismiss" type="button" onClick={onClose}>
                        Dismiss
                    </button>
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

        fireEvent.click(screen.getByTestId("recurring-delete-single"));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledWith("single");
        });
    });

    it("returns series when the entire series option is selected", async () => {
        const onClose = jest.fn();

        render(<RecurringDeleteDialog onClose={onClose} />);

        fireEvent.click(screen.getByTestId("recurring-delete-series"));

        await waitFor(() => {
            expect(onClose).toHaveBeenCalledWith("series");
        });
    });

    it("returns null when cancel is selected", async () => {
        const onClose = jest.fn();
        render(<RecurringDeleteDialog onClose={onClose} />);

        fireEvent.click(screen.getByTestId("recurring-delete-cancel"));

        await waitFor(() => expect(onClose).toHaveBeenCalledWith(null));
    });

    it("returns null when the dialog is dismissed", async () => {
        const onClose = jest.fn();
        render(<RecurringDeleteDialog onClose={onClose} />);

        fireEvent.click(screen.getByTestId("recurring-delete-dismiss"));

        await waitFor(() => expect(onClose).toHaveBeenCalledWith(null));
    });
});
