// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes } from "@blueprintjs/core";
import { adjustColor } from "app/utils/colors";
import classNames from "classnames";
import React, { FunctionComponent } from "react";

interface ColoredCheckboxProps {
    text: string | React.ReactNode;
    color?: string;
    checked?: boolean;
    defaultChecked?: boolean;
    disabled?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}
export const ColoredCheckbox: FunctionComponent<ColoredCheckboxProps> = ({
    text,
    color,
    checked,
    defaultChecked,
    disabled,
    onChange,
}) => {
    return (
        <label className={classNames(Classes.CONTROL, Classes.CHECKBOX, { [Classes.DISABLED]: disabled })}>
            <input
                type="checkbox"
                checked={checked}
                defaultChecked={defaultChecked}
                disabled={disabled}
                onChange={onChange}
            />
            <span
                className={Classes.CONTROL_INDICATOR}
                style={{
                    backgroundColor: color,
                    boxShadow: color != null ? `inset 0 0 0 1px ${adjustColor(color, -50)}` : undefined,
                }}
            />
            {text}
        </label>
    );
};
