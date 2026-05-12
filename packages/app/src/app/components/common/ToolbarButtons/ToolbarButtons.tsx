// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { ForwardRefRenderFunction, FunctionComponent, useImperativeHandle, useRef } from "react";
import { AnchorButton, Button, Intent, Placement, Popover, Tooltip, mergeRefs } from "@blueprintjs/core";
import classNames from "classnames";

import { HotkeyTooltip, Icon } from "app/components/common";

interface IToolbarDropdownButtonProps {
    tooltip: string | JSX.Element;
    children: string | JSX.Element | undefined;
    icon: string;
    iconColor?: string;
    title?: string | React.ReactNode;
    placement?: Placement;
    dropdownPlacement?: Placement;
    tooltipPlacement?: Placement;
    onClose?: () => void;
    onOpen?: () => void;
}
const ToolbarDropdownButtonPure: ForwardRefRenderFunction<
    HTMLButtonElement | null,
    IToolbarDropdownButtonProps
> = (
    {
        tooltip,
        children,
        icon,
        iconColor,
        title,
        placement,
        dropdownPlacement,
        tooltipPlacement,
        onClose,
        onOpen,
    },
    ref
) => {
    const buttonRef = useRef<HTMLButtonElement | null>(null);
    useImperativeHandle(ref, () => buttonRef.current!, []);

    return (
        <Popover
            content={children}
            placement={dropdownPlacement || placement}
            renderTarget={({ isOpen: isPopoverOpen, ref: ref1, ...popoverProps }) => (
                <Tooltip
                    content={tooltip}
                    placement={tooltipPlacement || placement}
                    disabled={isPopoverOpen}
                    openOnTargetFocus={false}
                    renderTarget={({ isOpen, ref: ref2, ...tooltipProps }) => (
                        <Button
                            {...popoverProps}
                            {...tooltipProps}
                            minimal
                            small
                            icon={<Icon icon={icon} color={iconColor} />}
                            active={isPopoverOpen}
                            ref={mergeRefs(ref1, ref2, buttonRef)}
                            text={title}
                        />
                    )}
                />
            )}
            onClosed={onClose}
            onOpening={onOpen}
        />
    );
};

interface IToolbarButtonProps {
    title?: string | React.ReactNode;
    icon?: string;
    iconColor?: string;
    iconSize?: number;
    tooltip?: string | React.ReactNode | undefined;
    placement?: Placement;
    keys?: string[];
    active?: boolean;
    badge?: boolean;
    outlined?: boolean;
    intent?: Intent;
    disabled?: boolean;
    id?: string;
    minimal?: boolean;
    loading?: boolean;
    spin?: boolean;
    onClick?: (event: React.MouseEvent) => void;
}
export const ToolbarButton: FunctionComponent<IToolbarButtonProps> = ({
    title,
    icon,
    iconColor,
    iconSize,
    tooltip,
    placement,
    keys,
    active,
    badge,
    outlined,
    intent,
    disabled,
    id,
    minimal,
    loading,
    spin,
    onClick,
}) => {
    if (tooltip) {
        return (
            <HotkeyTooltip title={tooltip} placement={placement} keys={keys}>
                <AnchorButton
                    id={id}
                    minimal={minimal != null ? minimal : true}
                    small
                    icon={
                        icon ? <Icon icon={icon} color={iconColor} size={iconSize} spin={spin} /> : undefined
                    }
                    text={title}
                    intent={intent || (active ? Intent.PRIMARY : Intent.NONE)}
                    outlined={outlined}
                    disabled={disabled}
                    onClick={onClick}
                    loading={loading}
                    className={classNames("toolbar-button", { badge })}
                />
            </HotkeyTooltip>
        );
    }
    return (
        <AnchorButton
            id={id}
            minimal={minimal != null ? minimal : true}
            small
            icon={icon ? <Icon icon={icon} size={iconSize} spin={spin} /> : undefined}
            text={title}
            outlined={outlined}
            intent={intent || (active ? Intent.PRIMARY : Intent.NONE)}
            disabled={disabled}
            loading={loading}
            onClick={onClick}
            className={classNames("toolbar-button", { badge })}
        />
    );
};

export const ToolbarDropdownButton = React.forwardRef(ToolbarDropdownButtonPure);
