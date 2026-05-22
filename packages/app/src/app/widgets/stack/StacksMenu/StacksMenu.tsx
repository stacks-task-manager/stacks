// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Colors, Intent, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useCallback, useEffect, useRef, useState } from "react";
import { IStack } from "@stacks/types";
import { BlankSlate, HotkeyChip, Icon, NewGeneric, Scroller } from "app/components/common";
import { StacksActions } from "app/store/actions";
import { scrollIntoView } from "app/utils/dom";
import { getCurrentProjectId, getStackTasks, useProjectStacks } from "app/hooks";

interface IStacksMenuProps {
    projectId: string;
    showTitle?: boolean;
    selected?: string;
    showAdd?: boolean;
    nested?: boolean;
    onClick: (stackId: string) => void;
    onAdded?: (stack: IStack) => void;
}
export const StacksMenu: FunctionComponent<IStacksMenuProps> = ({
    projectId,
    showTitle,
    selected,
    showAdd,
    nested,
    onClick,
    onAdded,
}) => {
    const stacks = useProjectStacks(projectId);
    const [selectedStack, setSelectedStack] = useState<number | undefined>();
    const btnRef = useRef<HTMLButtonElement | null>(null);

    const handleFocus = useCallback((stacksRef: HTMLDivElement | null) => {
        if (stacksRef) {
            stacksRef.focus();
        }
    }, []);

    useEffect(() => {
        if (selectedStack != null) {
            const stack = stacks[selectedStack - 1];
            if (stack) {
                const stackEl = document.getElementById(`stack-menuitem-${stack?.id}`);
                scrollIntoView(stackEl);
            }
        }
    }, [selectedStack]);

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            if (selectedStack == null || selectedStack + 1 > stacks.length) {
                setSelectedStack(0);
            } else {
                setSelectedStack(selectedStack + 1);
            }
        } else if (event.key === "ArrowUp") {
            if (selectedStack == null || selectedStack - 1 < 0) {
                setSelectedStack(stacks.length);
            } else {
                setSelectedStack(selectedStack - 1);
            }
        } else if (event.key === "Enter") {
            if (selectedStack != null && btnRef.current) {
                handleSelectStack(stacks.at(selectedStack)!.id);
                btnRef.current.click();
            }
        } else if (event.key === "Escape") {
            if (btnRef.current) {
                btnRef.current.click();
            }
        }
    };

    const handleCreateStack = async (title: string) => {
        const project = getCurrentProjectId();
        const newStack = await StacksActions.add({ title: title.trim(), project });

        if (newStack && onAdded != null) {
            onAdded(newStack);
        }
    };

    const handleSelectStack = (stackId: string) => {
        if (selected && selected === stackId) return;
        onClick(stackId);
    };

    return (
        <span tabIndex={0} ref={handleFocus} style={{ outline: "none" }} onKeyDown={handleOnKeyDown}>
            <button style={{ display: "none" }} className={Classes.POPOVER_DISMISS} ref={btnRef} />

            <Scroller maxHeight={400} vertical thin>
                <Menu className={classNames("stacks-menu", { "has-new": showAdd, nested })} data-testid="stack-select-menu">
                    {!stacks.length && (
                        <BlankSlate
                            title="No stacks"
                            icon="board-view"
                            description="You don't have any stacks yet in the selected project."
                            small
                            width={200}
                            testId="stack-select-blank-slate"
                        >
                            <Popover popoverClassName="popover-padded-small" content={<NewGeneric placeholder={translate("Untitled stack")} onAdd={handleCreateStack} />}>
                                <Button text="Add stack" intent={Intent.PRIMARY} data-testid="stack-select-add-button" />
                            </Popover>
                        </BlankSlate>
                    )}
                    {showTitle ? <MenuDivider title="Stacks" /> : null}
                    {stacks.map((stack, i) => {
                        const tasks = getStackTasks(stack.id);
                        return (
                            <MenuItem
                                key={stack.id}
                                id={`stack-menuitem-${stack.id}`}
                                text={stack.title}
                                icon={
                                    <Icon
                                        icon={
                                            selected === stack.id ? "check-square-filled" : "stop-filled"
                                        }
                                        color={stack.tint || Colors.GRAY5}
                                    />
                                }
                                labelElement={<HotkeyChip keys={[tasks.length]} />}
                                active={i + 1 === selectedStack}
                                onClick={() => handleSelectStack(stack.id)}
                            />
                        )
                    })}
                </Menu>
            </Scroller>
            {showAdd && stacks.length > 0 ? (
                <Menu className="new-stack-menu">
                    <MenuDivider />
                    <MenuItem text="Add new stack" icon={<Icon icon="plus" />} shouldDismissPopover={false}>
                        <NewGeneric placeholder={translate("Untitled stack")} onAdd={handleCreateStack} />
                    </MenuItem>
                </Menu>
            ) : null}
        </span>
    );
};
