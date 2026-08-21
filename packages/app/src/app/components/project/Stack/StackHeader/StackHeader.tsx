// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Colors, Intent, Popover, Tooltip } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { Icon } from "app/components/common";
import { TintPicker } from "app/components/project";
import { usePreferences, useStackMenu } from "app/hooks";
import { StacksActions } from "app/store/actions";
import { adjustColor, isLight } from "app/utils/colors";
import classnames from "classnames";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { StackHeaderMenu } from "./StackHeaderMenu";

interface IStackHeaderProps {
    stackId: string;
    isCollapsed: boolean;
    index: number;
    onShowNew: () => void;
}
export const StackHeader: FunctionComponent<IStackHeaderProps> = ({
    stackId,
    isCollapsed,
    index,
    onShowNew,
}) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const stackMenu = useStackMenu(stackId);
    const [isEditing, setIsEditing] = useState(false);
    const { showStackProgress, biggerStackHeader } = usePreferences([
        "showStackProgress",
        "biggerStackHeader",
    ]);

    useEffect(() => {
        if (isEditing && inputRef.current) {
            inputRef.current.focus();
            inputRef.current.setSelectionRange(0, inputRef.current.value.length);
        }
    }, [isEditing]);

    const largeHeader = useMemo(() => biggerStackHeader && stackMenu != null, [biggerStackHeader, stackMenu]);
    const textColor = useMemo(() => {
        if (!largeHeader) return undefined;
        const backgroundColor = stackMenu!.tint || Colors.GRAY3;
        return isLight(backgroundColor, 227) ? Colors.DARK_GRAY5 : "#fff";
    }, [largeHeader, stackMenu]);

    const headerStyles = useMemo(() => {
        if (!largeHeader) return {};
        return {
            backgroundColor: stackMenu!.tint || Colors.GRAY3,
            borderColor: adjustColor(stackMenu!.tint ?? Colors.GRAY3, -20),
            textShadow: `0 1px 1px ${adjustColor(stackMenu!.tint ?? Colors.GRAY3, -50)}`,
            color: textColor,
        };
    }, [largeHeader, stackMenu, textColor]);

    if (!stackMenu) return null;

    const { title, progress, completedCount, uncompleteCount, tasksCount, maxTasks, tint, limit, sorting } =
        stackMenu;

    const handleSetEditing = () => {
        if (isCollapsed) {
            StacksActions.toggleCollapse(stackId);
            return;
        }

        setIsEditing(true);
    };

    const handleToggleCollapse = () => {
        StacksActions.toggleCollapse(stackId);
    };

    const handleBlur = () => {
        if (inputRef.current && inputRef.current.value !== title) {
            StacksActions.setTitle(stackId, inputRef.current.value);
        }
        setIsEditing(false);
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

    return (
        <div
            className={classnames("stack-header", {
                large: largeHeader,
                "draggable-stack": !isEditing,
            })}
            style={headerStyles}
            data-testid="column-header"
        >
            {limit && (
                <Tooltip
                    content={`This stack reached the set limit of ${maxTasks} uncompleted tasks`}
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ...props }) => (
                        <span {...props} className="stack-limit" data-testid="task-stack-limit-indicator">
                            !
                        </span>
                    )}
                />
            )}

            {!isEditing && !biggerStackHeader && (
                <Popover
                    content={
                        <TintPicker
                            value={tint}
                            canClear
                            onChange={(color: string | undefined) => StacksActions.setTint(stackId, color)}
                        />
                    }
                    popoverClassName="popover-padded-medium"
                    placement="bottom"
                >
                    <div
                        className="stack-tint"
                        style={{ backgroundColor: tint || Colors.LIGHT_GRAY1 }}
                        data-testid="column-header-tint-button"
                    />
                </Popover>
            )}

            {showStackProgress && <div className="stack-header-progress">{progress || 0}%</div>}
            <div
                className={classnames("stack-header-title-wrapper", {
                    isEditing,
                })}
                data-testid="column-header-wrapper"
                onDoubleClick={handleSetEditing}
            >
                {!isEditing && (
                    <span className="stack-header-title" data-testid="column-header-title">
                        {title}
                    </span>
                )}
                {isEditing && !isCollapsed && (
                    <input
                        defaultValue={title}
                        ref={inputRef}
                        onKeyDown={handleKeyDown}
                        onBlur={handleBlur}
                        data-testid="column-header-title-input"
                    />
                )}
                {!isEditing && (
                    <Tooltip
                        content={`${completedCount} completed out of ${tasksCount}`}
                        placement="top"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ...props }) => (
                            <span
                                {...props}
                                className="stack-header-counter"
                                data-testid="columns-task-counter"
                            >
                                {completedCount + uncompleteCount}
                            </span>
                        )}
                    />
                )}
            </div>
            {!isEditing && (
                <div className="stack-options">
                    {/* {maxTasks > 0 && (
                        <span className="stack-max-tasks">
                            {uncompleteCount}/{maxTasks}
                        </span>
                    )} */}

                    <Tooltip
                        content={translate(isCollapsed ? "Uncollapse stack" : "Collapse stack")}
                        className="stack-header-toggle"
                        placement="top"
                    >
                        <Button
                            icon={
                                <Icon
                                    icon={isCollapsed ? "chevron-right" : "chevron-left"}
                                    color={textColor}
                                />
                            }
                            variant="minimal"
                            size="small"
                            intent={Intent.NONE}
                            onClick={handleToggleCollapse}
                            data-testid="column-header-collapse-button"
                        />
                    </Tooltip>

                    {!isCollapsed && (
                        <Popover
                            content={
                                <StackHeaderMenu
                                    title={title}
                                    stackId={stackId}
                                    hasTasks={completedCount + uncompleteCount > 0}
                                    maxTasks={maxTasks}
                                    tint={tint}
                                    isColumn={true}
                                    isCollapsed={isCollapsed}
                                    isOwner={true}
                                    index={index}
                                    completedCount={completedCount}
                                    sorting={sorting}
                                    onAdd={onShowNew}
                                />
                            }
                            placement="bottom-end"
                            autoFocus={false}
                            className="stack-header-menu"
                        >
                            <Button
                                icon={<Icon icon="dots-vertical" color={textColor} />}
                                variant="minimal"
                                size="small"
                                data-testid="column-header-menu-button"
                            />
                        </Popover>
                    )}

                    {!isCollapsed && (
                        <Tooltip content={translate("Add a task on top")} placement="top">
                            <Button
                                icon={<Icon icon="plus" color={textColor} />}
                                variant="minimal"
                                size="small"
                                onClick={onShowNew}
                                data-testid="column-header-add-button"
                            />
                        </Tooltip>
                    )}
                </div>
            )}
        </div>
    );
};
