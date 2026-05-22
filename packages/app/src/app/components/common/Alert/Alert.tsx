// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Alert as BlueprintAlert,
    AlertProps as BlueprintAlertProps,
    Checkbox,
    H5,
    IconName,
    Intent,
} from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
import { createRoot } from "react-dom/client";
type AlertOptions = Omit<BlueprintAlertProps, "isOpen" | "onClose"> & {
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    confirmText?: string;
    checkboxLabel?: string;
    intent?: Intent;
    onClose: (checkbox: boolean) => void;
};

const AlertService: FunctionComponent<AlertOptions> = ({
    title,
    description,
    confirmText,
    checkboxLabel,
    intent,
    onClose,
}) => {
    const [isOpen, setIsOpen] = useState(true);
    const [isChecked, setIsChecked] = useState(false);

    const handleClose = () => {
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
            confirmButtonText={confirmText ?? translate("OK")}
            intent={intent ?? Intent.PRIMARY}
            isOpen={isOpen}
            canEscapeKeyCancel
            onConfirm={handleClose}
            onClosed={() => onClose(isChecked)}
        >
            <>
                <H5>{title}</H5>
                <p>{description}</p>
                {checkboxLabel != null ? (
                    <Checkbox checked={isChecked} onChange={handleToggleCheckbox} label={checkboxLabel} />
                ) : null}
            </>
        </BlueprintAlert>
    );
};

interface AlertProps {
    title: string | React.ReactNode;
    description: string | React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    checkboxLabel?: string;
    intent?: Intent;
}

export interface AlertResponse {
    checked: boolean;
}

export const Alert = (props: AlertProps): Promise<AlertResponse> => {
    return new Promise<AlertResponse>(resolve => {
        const container = document.createElement("div");
        document.body.appendChild(container);

        const root = createRoot(container);

        const handleResolve = (checked: boolean) => {
            resolve({ checked });
            root.unmount();
            document.body.removeChild(container);
        };

        root.render(<AlertService {...props} onClose={handleResolve} />);
    });
};
