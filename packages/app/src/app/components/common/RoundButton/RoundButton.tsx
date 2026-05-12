// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Intent, MaybeElement, Placement, Tooltip } from "@blueprintjs/core";
import classnames from "classnames";

import { Icon } from "app/components/common";

interface IRoundButtonProps {
    title?: string | React.ReactNode;
    tooltip?: string | JSX.Element;
    placement?: Placement;
    disabled?: boolean;
    dashed?: boolean;
    minimal?: boolean;
    active?: boolean;
    icon?: string;
    iconSize?: number;
    children?: MaybeElement;
    count?: number;
    intent?: Intent;
    large?: boolean;
    small?: boolean;
    hasBackground?: boolean;
    id?: string;
    testId?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
}
export const RoundButton: FunctionComponent<IRoundButtonProps> = ({
    title,
    tooltip,
    placement,
    disabled,
    dashed,
    minimal,
    active,
    icon,
    iconSize,
    children,
    count,
    intent,
    large,
    small,
    id,
    testId,
    onClick,
}) => {
    return (
        <Tooltip
            content={tooltip}
            placement={placement || "top"}
            className="round-button-tooltip"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...props }) => (
                <button
                    {...props}
                    className={classnames("round-button", intent, {
                        large,
                        dashed,
                        minimal,
                        active,
                        small,
                        interactive: !disabled && onClick !== undefined,
                    })}
                    id={id}
                    disabled={disabled}
                    onClick={onClick}
                    data-testid={testId}
                >
                    <span>
                        {count ? count : <Icon
                            icon={disabled ? icon ?? "minus" : icon ?? "plus"}
                            size={minimal ? iconSize || undefined : iconSize || 12}
                        />}
                    </span>
                    {title}
                    {children}
                </button>
            )}
        />
    );
};
