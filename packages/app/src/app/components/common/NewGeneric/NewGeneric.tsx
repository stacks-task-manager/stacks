// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, InputGroup, Intent } from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
interface INewGenericProps {
    placeholder: string;
    buttonText?: string | React.ReactNode;
    large?: boolean;
    onAdd: (title: string) => void;
}
export const NewGeneric: FunctionComponent<INewGenericProps> = ({
    placeholder,
    buttonText,
    large,
    onAdd,
}) => {
    const [title, setTitle] = useState("");

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
    };

    return (
        <InputGroup
            placeholder={placeholder}
            value={title}
            onChange={handleTitleChange}
            onKeyDown={handleKeyDown}
            large={large}
            className={Classes.POPOVER_DISMISS_OVERRIDE}
            rightElement={
                <Button intent={Intent.PRIMARY} size={!large ? "small" : undefined} onClick={handleAdd}>
                    {buttonText ? buttonText : translate("Save")}
                </Button>
            }
            autoFocus
        />
    );
};
