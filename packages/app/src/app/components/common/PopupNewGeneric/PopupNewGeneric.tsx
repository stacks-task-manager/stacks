// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { InputGroup, Button, Intent, Popover, Classes, Placement } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo, useRef, useState } from "react";
interface IPopupNewGenericProps {
    placeholder: string;
    children: React.ReactNode;
    buttonText?: string | React.ReactNode;
    placement?: Placement;
    matchTargetWidth?: boolean;
    fill?: boolean;
    onAdd: (title: string) => void;
}
export const PopupNewGeneric: FunctionComponent<IPopupNewGenericProps> = ({
    placeholder,
    children,
    buttonText,
    placement,
    matchTargetWidth,
    fill,
    onAdd,
}) => {
    const [title, setTitle] = useState("");
    const boxRef = useRef<HTMLDivElement>(null);

    const canSave = useMemo(() => title.trim().length > 0, [title]);

    const handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(event.currentTarget.value);
    };

    const handleAdd = () => {
        if (title.trim().length === 0) return;
        onAdd(title);
        setTitle("");
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.keyCode === 27) {
            setTitle("");
        }

        if (event.keyCode === 13) {
            handleAdd();
        }

        if ((event.keyCode === 27 || event.keyCode === 13) && boxRef.current) {
            boxRef.current.click();
        }
    };

    return (
        <Popover
            fill={fill}
            content={
                <InputGroup
                    placeholder={placeholder}
                    value={title}
                    onChange={handleTitleChange}
                    onKeyDown={handleKeyDown}
                    size="large"
                    rightElement={
                        <Button
                            intent={Intent.PRIMARY}
                            className={Classes.POPOVER_DISMISS}
                            onClick={handleAdd}
                            disabled={!canSave}
                            data-testid="popup-new-generic-button"
                        >
                            {buttonText ? buttonText : translate("Save")}
                        </Button>
                    }
                    autoFocus
                    data-testid="popup-new-generic-input"
                />
            }
            popoverClassName="popover-padded-medium"
            matchTargetWidth={matchTargetWidth}
            placement={placement || "bottom"}
        >
            <span ref={boxRef}>{children}</span>
        </Popover>
    );
};
