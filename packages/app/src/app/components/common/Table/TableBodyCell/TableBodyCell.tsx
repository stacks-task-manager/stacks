// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Checkbox, Classes, Popover, Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";

interface ITableBodyCellProps {
    children?: React.ReactNode;
    align?: "center" | "right";
    menu?: React.ReactNode;
    secondary?: boolean;
    hasCheckbox?: boolean;
    isChecked?: boolean;
    // defaultChecked?: boolean;
    checkboxTooltip?: string | JSX.Element;
    gap?: number;
    span?: number;
    width?: number | string;
    className?: string;
    paddingLeft?: number;
    paddingRight?: number;
    dragHandle?: React.ReactNode;
    levelIndicator?: React.ReactNode;
    onCheck?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onClick?: (event: React.MouseEvent<HTMLTableCellElement>) => void;
}
export const TableBodyCell: FunctionComponent<ITableBodyCellProps> = ({
    children,
    align,
    menu,
    secondary,
    hasCheckbox,
    isChecked,
    // defaultChecked,
    checkboxTooltip,
    gap,
    span,
    width,
    className,
    paddingLeft,
    paddingRight,
    dragHandle,
    levelIndicator,
    onCheck,
    onClick,
}) => {
    const handleCheck = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (onCheck) onCheck(event);
    };

    const handleClick = (event: React.MouseEvent<HTMLTableCellElement>) => {
        const target = event.target as HTMLElement;
        if (hasCheckbox && target.classList.contains(Classes.CONTROL_INDICATOR)) return;
        if (onClick) onClick(event);
    };

    if (menu) {
        return (
            <td className="with-menu" width={width}>
                <Popover
                    placement="left"
                    content={<>{menu}</>}
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <Button
                            variant="minimal"
                            size="small"
                            icon={<Icon icon="dots-horizontal" size={14} />}
                            ref={ref}
                            active={isOpen}
                            {...props}
                            className="table-menu-button"
                        />
                    )}
                />
            </td>
        );
    }

    return (
        <td
            onMouseDown={handleClick}
            className={classNames(["table-td", className, {
                secondary
            }], { interactive: Boolean(onClick) })}
            colSpan={span}
            width={width}
        >
            {levelIndicator}
            {dragHandle}

            <div
                className={classNames("table-body-cell", {
                    center: align === "center",
                    right: align === "right",
                })}
                style={{
                    gap,
                    paddingLeft,
                    paddingRight
                }}
            >
                {hasCheckbox && (
                    <Tooltip content={checkboxTooltip} placement="top" disabled={checkboxTooltip == null}>
                        <Checkbox
                            type="checkbox"
                            // defaultChecked={defaultChecked}
                            checked={isChecked}
                            onChange={handleCheck}
                        />
                    </Tooltip>
                )}
                {children}
            </div>
        </td>
    );
};
