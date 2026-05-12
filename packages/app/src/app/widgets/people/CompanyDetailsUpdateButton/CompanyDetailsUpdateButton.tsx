// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Button, Intent } from "@blueprintjs/core";

import { Icon } from "app/components/common";
import { useElementHotkey } from "app/hooks";

interface CompanyDetailsUpdateButtonProps {
    disabled?: boolean;
    onClick: () => void;
}
export const CompanyDetailsUpdateButton: FunctionComponent<CompanyDetailsUpdateButtonProps> = ({
    disabled,
    onClick,
}) => {
    useElementHotkey("shift+e", "cd-update");

    return (
        <Button
            fill
            intent={Intent.PRIMARY}
            icon={<Icon icon="users-check" />}
            id="cd-update"
            disabled={disabled}
            onClick={onClick}
        >
            Update company
        </Button>
    );
};
