// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { Button, MaybeElement, Popover, Spinner } from "@blueprintjs/core";

import { Icon } from "app/components/common";
import classNames from "classnames";

interface ISidebarButtonProps {
    title: string;
    translatedTitle?: string | React.ReactNode;
    icon: string;
    depth?: number;
    children?: MaybeElement | MaybeElement[];
    menu?: MaybeElement;
    isActive?: boolean;
    isSelected?: boolean;
    isEditing?: boolean;
    isLoading?: boolean;
    disabled?: boolean;
    onClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onDoubleClick?: (event: React.MouseEvent<HTMLDivElement>) => void;
    onChange?: (newTitle: string, oldTitle: string) => void;
    [x: string]: unknown;
}
export const SidebarButton: FunctionComponent<ISidebarButtonProps> = ({
    title,
    translatedTitle,
    icon,
    depth,
    children,
    menu,
    isActive,
    isEditing,
    isSelected,
    isLoading,
    disabled,
    onClick,
    onDoubleClick,
    onChange,
    ...props
}) => {
    const [menuOpen, setMenuOpen] = useState(false);
    const inputRef = useRef<HTMLInputElement | null>(null);
    const oldNameRef = useRef("");

    useEffect(() => {
        if (isEditing && inputRef.current) {
            if (menuOpen) {
                setMenuOpen(false);
            }
            inputRef.current.focus();
            inputRef.current.setSelectionRange(0, inputRef.current.value.length);
            oldNameRef.current = inputRef.current.value;
        }
    }, [isEditing]);

    const handleBlur = () => {
        if (onChange) {
            onChange(inputRef.current ? inputRef.current.value : title, oldNameRef.current);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" || e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();

            if (inputRef.current) {
                if (e.key === "Escape") {
                    inputRef.current.value = title;
                }
                inputRef.current.blur();
            }
        }
    };

    if (isEditing) {
        return (
            <div className="sidebar-button-wrapper editing">
                <div className="sidebar-button">
                    <div
                        className="sidebar-button-title-wrapper"
                        style={{ marginLeft: (depth ? depth - 1 : 0) * 10 }}
                    >
                        <input
                            ref={inputRef}
                            defaultValue={title}
                            onKeyDown={handleKeyDown}
                            onBlur={handleBlur}
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            {...props}
            className={classNames("sidebar-button-wrapper", {
                active: isActive,
                selected: isSelected,
                menuOpen,
                disabled,
                hasMenu: Boolean(menu),
            })}
            role="treeitem"
            aria-label={title}
        >
            <div className="sidebar-button">
                <div
                    className="sidebar-button-title-wrapper"
                    style={{ paddingLeft: (depth || 1) * 10 }}
                    onClick={disabled ? undefined : onClick}
                    onDoubleClick={disabled ? undefined : onDoubleClick}
                >
                    {isLoading ? <Spinner size={16} /> : <Icon icon={icon} />}
                    <span className="sidebar-button-title">{translatedTitle || title}</span>
                </div>

                <span className="sidebar-button-toolbar">
                    <span className="sidebar-button-accessory">{children}</span>
                    {menu && (
                        <Popover
                            content={menu}
                            className="sidebar-button-menu"
                            onClosed={() => setMenuOpen(false)}
                            onOpening={() => setMenuOpen(true)}
                        >
                            <Button size="small" variant="minimal" data-testid="sidebar-button-context-button">
                                <Icon icon="dots-vertical" />
                            </Button>
                        </Popover>
                    )}
                </span>
            </div>
        </div>
    );
};
