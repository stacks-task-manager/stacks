// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useCallback, useEffect, useRef } from "react";
import { Button, Menu, MenuDivider, MenuItem, Popover, Tooltip } from "@blueprintjs/core";

import { Icon } from "app/components/common";
import classNames from "classnames";

interface ITableHeaderCellProps {
    name: string;
    title?: string;
    sortable?: boolean;
    sorting?: boolean;
    desc?: boolean;
    secondary?: boolean;
    width?: number | string;
    minWidth?: number;
    maxWidth?: number;
    resizable?: boolean;
    empty?: boolean;
    hasCheckbox?: boolean;
    checkboxTooltip?: string;
    isChecked?: boolean;
    defaultChecked?: boolean;
    children?: React.ReactNode;
    align?: "center" | "right";
    help?: string;
    onCheck?: () => void;
    onSort?: (name: string, desc: boolean) => void;
    onSortClear?: () => void;
    onResize?: (name: string, width: number) => void;
}
export const TableHeaderCell: FunctionComponent<ITableHeaderCellProps> = ({
    name,
    title,
    sortable,
    sorting,
    desc,
    secondary,
    width,
    minWidth,
    maxWidth,
    resizable,
    empty,
    hasCheckbox,
    checkboxTooltip,
    isChecked,
    defaultChecked,
    children,
    align,
    help,
    onCheck,
    onSort,
    onSortClear,
    onResize,
}) => {
    const resizeHandleRef = useRef<HTMLDivElement | null>(null);
    const posRef = useRef(0);
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const currentWidthRef = useRef<number | null>(null);

    // Initialize currentWidthRef with the provided width
    useEffect(() => {
        if (typeof width === 'number') {
            currentWidthRef.current = width;
        }
    }, [width]);

    useEffect(() => {
        if (resizeHandleRef.current && resizable) {
            resizeHandleRef.current.addEventListener("mousedown", handleMouseDown, false);
            document.addEventListener("mouseup", handleMouseUp, false);
        }

        return () => {
            document.removeEventListener("mouseup", handleMouseUp);
            document.removeEventListener("mousemove", resize);
            if (resizeHandleRef.current) {
                resizeHandleRef.current.removeEventListener("mousedown", handleMouseDown);
            }
        };
    }, [resizable]);

    const handleSetWidth = (width: number) => {
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }

        debounce.current = setTimeout(() => {
            onResize && onResize(name, width);
        }, 300);
    };

    const handleMouseDown = useCallback(
        (event: MouseEvent) => {
            posRef.current = event.x;
            document.addEventListener("mousemove", resize, false);
        },
        []
    );

    const handleMouseUp = () => {
        document.removeEventListener("mousemove", resize, false);
    };

    const resize = useCallback(
        (e: MouseEvent) => {
            if (resizeHandleRef.current) {
                const parent = resizeHandleRef.current.parentNode as HTMLElement;
                const dx = e.x - posRef.current;

                // Skip if no meaningful movement to prevent oscillation
                if (Math.abs(dx) < 1) {
                    return;
                }

                posRef.current = e.x;
                if (parent) {
                    // Use tracked width if available, otherwise get from DOM
                    const currentWidth = currentWidthRef.current ?? parseInt(getComputedStyle(parent, "").width);
                    let width = currentWidth + dx;

                    if (minWidth && width <= minWidth) {
                        width = minWidth;
                    } else if (maxWidth && width >= maxWidth) {
                        width = maxWidth;
                    }

                    // Only update if width actually changed
                    if (width !== currentWidth) {
                        parent.style.width = `${width}px`;
                        currentWidthRef.current = width; // Track the set width
                        handleSetWidth(width);
                    }
                }
            }
        },
        [minWidth, maxWidth, handleSetWidth]
    );

    const handleJumpResize = () => {
        if (resizeHandleRef.current) {
            const parent = resizeHandleRef.current.parentNode as HTMLElement;
            let width = parseInt(getComputedStyle(parent, "").width) + 200;
            if (maxWidth) {
                width = maxWidth;
            } else {
                if (minWidth && width <= minWidth) {
                    width = minWidth;
                } else if (maxWidth && width >= maxWidth) {
                    width = maxWidth;
                }
            }

            parent.style.width = `${width}px`;
            currentWidthRef.current = width;
            handleSetWidth(width);
        }
    };

    const handleSort = (desc: boolean) => {
        onSort && name && onSort(name, desc);
    };

    const handleClear = () => {
        onSortClear && onSortClear();
    }

    return (
        <th style={{ width, minWidth }}>
            {!empty && (
                <div className={classNames("table-header-cell", align ? `table-header-cell__align-${align}` : "", {
                    "table-header-cell__secondary": secondary
                })}>
                    <div className="table-header-cell__title">
                        {hasCheckbox && (
                            <Tooltip
                                content={checkboxTooltip}
                                disabled={checkboxTooltip == null}
                                placement="top"
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                renderTarget={({ isOpen, ...tooltipProps }) => (
                                    <input
                                        type="checkbox"
                                        defaultChecked={defaultChecked}
                                        checked={isChecked}
                                        onChange={onCheck}
                                        {...tooltipProps}
                                    />
                                )}
                            />
                        )}
                        {sorting && <Icon icon={desc ? "arrow-up" : "arrow-down"} size={14} />}
                        {children}
                        {title != null ? <div className="table-header-cell__title--box">{title}</div> : null}
                        {help && (
                            <Tooltip
                                content={help}
                                placement="top"
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                renderTarget={({ isOpen, ...props }) => <Icon icon="help-circle" size={14} {...props} style={{ marginLeft: 5 }} cursor="help" />} />
                        )}
                    </div>
                    {sortable && (
                        <span className="sort-menu">
                            <Popover
                                content={
                                    <SortMenu
                                        title={title}
                                        sortDesc={desc}
                                        sorting={sorting}
                                        onSort={handleSort}
                                        onClear={handleClear}
                                    />
                                }
                                placement="bottom-end"
                            >
                                <Button variant="minimal" size="small" icon={<Icon icon="chevron-down" />} />
                            </Popover>
                        </span>
                    )}
                </div>
            )}
            {resizable && (
                <div
                    className="table-header-cell__resize-handle"
                    ref={resizeHandleRef}
                    onDoubleClick={handleJumpResize}
                />
            )}
        </th>
    );
};

interface ISortMenuProps {
    title?: string;
    sortDesc?: boolean;
    sorting?: boolean;
    onSort?: (desc: boolean) => void;
    onClear?: () => void;
}
const SortMenu: FunctionComponent<ISortMenuProps> = ({ title, sortDesc, sorting, onSort, onClear }) => {
    const asc = () => onSort && onSort(false);
    const desc = () => onSort && onSort(true);
    const clear = () => onClear && onClear();

    return (
        <Menu>
            <MenuItem
                text={title && translate("Sort asc", { column: title })}
                icon="sort-asc"
                onClick={asc}
                labelElement={sorting && !sortDesc ? <Icon icon="check" /> : undefined}
            />
            <MenuItem
                text={title && translate("Sort desc", { column: title })}
                icon="sort-desc"
                onClick={desc}
                labelElement={sorting && sortDesc ? <Icon icon="check" /> : undefined}
            />
            {sorting ? (
                <>
                    <MenuDivider />
                    <MenuItem text="Clear sorting" icon="eraser" onClick={clear} />
                </>
            ) : null}
        </Menu>
    );
};
