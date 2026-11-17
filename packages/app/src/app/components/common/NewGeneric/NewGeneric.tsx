// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, InputGroup, Intent, Placement, Popover } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo, useRef, useState } from "react";

interface NewGenericBaseProps {
    placeholder: string;
    buttonText?: string | React.ReactNode;
    large?: boolean;
    onAdd: (title: string) => void;
}

interface InlineNewGenericProps extends NewGenericBaseProps {
    presentation?: "inline";
    children?: never;
    placement?: never;
    matchTargetWidth?: never;
    fill?: never;
}

interface PopoverNewGenericProps extends NewGenericBaseProps {
    presentation: "popover";
    children: React.ReactNode;
    placement?: Placement;
    matchTargetWidth?: boolean;
    fill?: boolean;
}

type INewGenericProps = InlineNewGenericProps | PopoverNewGenericProps;

export const NewGeneric: FunctionComponent<INewGenericProps> = ({
    placeholder,
    buttonText,
    large,
    presentation = "inline",
    placement,
    matchTargetWidth,
    fill,
    children,
    onAdd,
}) => {
    const [title, setTitle] = useState("");
    const boxRef = useRef<HTMLSpanElement>(null);
    const canSave = useMemo(() => title.trim().length > 0, [title]);
    const isPopover = presentation === "popover";

    const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(event.currentTarget.value);
    };

    const handleAdd = () => {
        if (!canSave) return;
        onAdd(title);
        setTitle("");
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Escape") {
            setTitle("");
            if (isPopover) boxRef.current?.click();
        }

        if (event.key === "Enter") {
            handleAdd();
            if (isPopover) boxRef.current?.click();
        }
    };

    const input = (
        <InputGroup
            placeholder={placeholder}
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            size={large || isPopover ? "large" : undefined}
            className={isPopover ? undefined : Classes.POPOVER_DISMISS_OVERRIDE}
            rightElement={
                <Button
                    intent={Intent.PRIMARY}
                    size={!large && !isPopover ? "small" : undefined}
                    className={isPopover ? Classes.POPOVER_DISMISS : undefined}
                    onClick={handleAdd}
                    disabled={isPopover && !canSave}
                    data-testid={isPopover ? "popup-new-generic-button" : "new-generic-button"}
                >
                    {buttonText ? buttonText : translate("Save")}
                </Button>
            }
            autoFocus
            data-testid={isPopover ? "popup-new-generic-input" : "new-generic-input"}
        />
    );

    if (!isPopover) return input;

    return (
        <Popover
            fill={fill}
            content={input}
            popoverClassName="popover-padded-medium"
            matchTargetWidth={matchTargetWidth}
            placement={placement || "bottom"}
        >
            <span ref={boxRef}>{children}</span>
        </Popover>
    );
};
