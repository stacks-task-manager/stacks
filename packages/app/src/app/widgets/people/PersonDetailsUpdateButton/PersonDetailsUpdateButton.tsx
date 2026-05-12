// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Intent } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { Icon } from "app/components/common";
import { useElementHotkey } from "app/hooks";

interface PersonDetailsUpdateButtonProps {
    disabled?: boolean;
    onClick: () => void;
}
export const PersonDetailsUpdateButton: FunctionComponent<PersonDetailsUpdateButtonProps> = ({
    disabled,
    onClick,
}) => {
    useElementHotkey("shift+e", "pd-update");

    return (
        <Button
            fill
            intent={Intent.PRIMARY}
            icon={<Icon icon="user-check-01" />}
            disabled={disabled}
            id="pd-update"
            onClick={onClick}
        >
            {translate("Update person")}
        </Button>
    );
};
