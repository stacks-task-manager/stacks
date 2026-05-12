// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { Icon } from "app/components/common";
import { useMousetrap } from "app/hooks";

interface PersonDetailsEditButtonProps {
    onClick: () => void;
}
export const PersonDetailsEditButton: FunctionComponent<PersonDetailsEditButtonProps> = ({ onClick }) => {
    useMousetrap("shift+e", onClick);

    return (
        <Tooltip content={translate("Edit person")} placement="bottom">
            <Button size="small" variant="minimal" icon={<Icon icon="user-edit" />} onClick={onClick} />
        </Tooltip>
    );
};
