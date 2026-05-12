// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Alert as BlueprintAlert, AlertProps, H5, IconName, Intent, Checkbox } from "@blueprintjs/core";
import React, { FunctionComponent, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
type AlertOptions = Omit<AlertProps, "isOpen" | "onClose"> & {
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    checkboxLabel?: string;
    intent?: Intent;
    onClose: (confirm: boolean, checkbox: boolean) => void;
};

const AlertService: FunctionComponent<AlertOptions> = ({
    title,
    description,
    confirmText,
    cancelText,
    checkboxLabel,
    intent,
    onClose,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isChecked, setIsChecked] = useState(false);
    const isConfirm = useRef(false);

    const handleClose = (confirm: boolean) => {
        isConfirm.current = confirm;
        setIsOpen(false);
    };

    const handleToggleCheckbox = () => {
        setIsChecked(!isChecked);
    };

    let icon: IconName = "info-sign";
    if (intent === Intent.DANGER) {
        icon = "error";
    } else if (intent === Intent.SUCCESS) {
        icon = "tick-circle";
    } else if (intent === Intent.WARNING) {
        icon = "warning-sign";
    }

    return (
        <BlueprintAlert
            icon={icon}
            cancelButtonText={cancelText ?? translate("No")}
            confirmButtonText={confirmText ?? translate("Yes")}
            intent={intent ?? Intent.PRIMARY}
            isOpen={isOpen}
            canEscapeKeyCancel
            onConfirm={() => handleClose(true)}
            onCancel={() => handleClose(false)}
            onClosed={() => onClose(isConfirm.current, isChecked)}
        >
            <>
                <H5 data-testid="confirm-dialog-title">{title}</H5>
                <p data-testid="confirm-dialog-description">{description}</p>
                {checkboxLabel != null ? (
                    <Checkbox checked={isChecked} onChange={handleToggleCheckbox} label={checkboxLabel} />
                ) : null}
            </>
        </BlueprintAlert>
    );
};

interface ConfirmOptions {
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    checkboxLabel?: string;
    intent?: Intent;
}

export interface ConfirmResponse {
    answer: boolean;
    checked: boolean;
}

export const Confirm = (props: ConfirmOptions): Promise<ConfirmResponse> => {
    return new Promise<ConfirmResponse>(resolve => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const root = createRoot(container);

        const handleResolve = (answer: boolean, checked: boolean) => {
            resolve({ answer, checked });
            root.unmount();
            document.body.removeChild(container);
        };

        root.render(<AlertService {...props} onClose={handleResolve} />);
    });
};
