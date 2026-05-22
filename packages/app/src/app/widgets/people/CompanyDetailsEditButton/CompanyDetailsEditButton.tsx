// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Tooltip } from "@blueprintjs/core";
import { Icon } from "app/components/common";
import { useMousetrap } from "app/hooks";
import React, { FunctionComponent } from "react";

interface CompanyDetailsEditButtonProps {
    onClick: () => void;
}
export const CompanyDetailsEditButton: FunctionComponent<CompanyDetailsEditButtonProps> = ({ onClick }) => {
    useMousetrap("shift+e", onClick);

    return (
        <Tooltip content="Edit company" placement="bottom">
            <Button size="small" variant="minimal" icon={<Icon icon="edit-05" />} onClick={onClick} />
        </Tooltip>
    );
};
