// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, InputGroup, Intent, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
import { Icon } from "app/components/common";

interface URLPickerMenuItemProps {
    onAdd: (url: string) => void;
    onFocus?: (focused: true | undefined) => void;
}

export const URLPickerMenuItem: FunctionComponent<URLPickerMenuItemProps> = ({ onAdd, onFocus }) => {
    const [url, setUrl] = useState("");
    const [validUrl, setValidUrl] = useState(true);

    const handleAddUrl = () => {
        onAdd(url);
    };

    const handleSetUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.currentTarget.value);

        try {
            new URL(event.currentTarget.value);
            setValidUrl(true);
        } catch (_) {
            setValidUrl(false);
        }
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === "Enter") {
            event.preventDefault();
            handleAddUrl();
        } else if (event.key === "Escape") {
            onFocus && onFocus(undefined);
        }
    };

    return (
        <InputGroup
            value={url}
            placeholder="https://"
            fill
            style={{ width: 250 }}
            rightElement={
                <Button
                    small
                    intent={Intent.PRIMARY}
                    onClick={handleAddUrl}
                    disabled={url.length === 0 || !validUrl}
                    className={Classes.POPOVER_DISMISS}
                >
                    {translate("Add")}
                </Button>
            }
            onChange={handleSetUrl}
            onKeyDown={handleKeyDown}
            onFocus={() => onFocus && onFocus(true)}
            onBlur={() => onFocus && onFocus(undefined)}
        />
    );
};

interface FromUrlMenuItemProps {
    onUrlAdd: (url: string) => void;
}

export const FromUrlMenuItem: FunctionComponent<FromUrlMenuItemProps> = ({ onUrlAdd }) => {
    const [open, setOpen] = useState<undefined | true>(undefined);
    return (
        <MenuItem
            text="From URL"
            icon={<Icon icon="compass-03" />}
            shouldDismissPopover={false}
            popoverProps={{ isOpen: open }}
        >
            <URLPickerMenuItem onAdd={onUrlAdd} onFocus={setOpen} />
        </MenuItem>
    );
};
