// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors, Popover, Tag } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";

import { Icon } from "app/components/common";
import { useStack } from "app/hooks";
import { StacksMenu } from "../StacksMenu/StacksMenu";

interface IStackSelectProps {
    stackId: string | undefined;
    projectId: string;
    disabled?: boolean;
    onChange: (stackId: string) => void;
}
export const StackSelect: FunctionComponent<IStackSelectProps> = ({ stackId, projectId, disabled, onChange }) => {
    const stack = useStack(stackId);

    const isDisabled = useMemo(() => {
        return !projectId || disabled;
    }, [projectId, disabled]);

    const handleSelectStack = (stack: string) => {
        if (stack === stackId) return;
        onChange(stack);
    };

    return (
        <Popover
            disabled={isDisabled}
            content={
                <StacksMenu
                    projectId={projectId}
                    selected={stackId ?? undefined}
                    onClick={handleSelectStack}
                    showAdd
                />
            }
            lazy
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...rest }) => (
                <Tag
                    minimal
                    icon={<Icon icon="stop-filled" size={12} color={stack?.tint || Colors.GRAY3} />}
                    interactive={!isDisabled}
                    data-testid="stack-select-button"
                    {...rest}
                >
                    {stack?.title ?? "Select stack"}
                </Tag>
            )}
        />

    );
};

