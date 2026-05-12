// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Icon } from "app/components/common";
import classNames from "classnames";
import React, { FunctionComponent } from "react";

interface ColorButtonProps {
    color: string;
    isSelected?: boolean;
    onClick: (color: string | undefined) => void;
}
export const ColorButton: FunctionComponent<ColorButtonProps> = ({ color, isSelected, onClick }) => {
    const handleClick = () => {
        onClick(isSelected ? undefined : color);
    };
    return (
        <button
            className={classNames("color-button", { selected: isSelected })}
            style={{ backgroundColor: color }}
            onClick={handleClick}
            data-testid="color-button"
            data-color={color}
        >
            {isSelected && <Icon icon="check" />}
        </button>
    );
};
