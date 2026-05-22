// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Intent } from "@blueprintjs/core";
import { Icon } from "app/components/common";
import React, { FunctionComponent } from "react";

interface ButtonCheckboxProps {
    icon: string;
    checked?: boolean;
    intent?: Intent;
    onClick?: (event: React.MouseEvent) => void;
}
export const ButtonCheckbox: FunctionComponent<ButtonCheckboxProps> = ({
    icon,
    checked,
    intent,
    onClick,
}) => {
    return (
        <Button
            small
            minimal
            active={checked}
            intent={checked ? intent ?? Intent.SUCCESS : Intent.NONE}
            icon={<Icon icon={icon} />}
            onClick={onClick}
        />
    );
};
