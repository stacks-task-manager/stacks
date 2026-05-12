// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { MenuDivider, MenuItem } from "@blueprintjs/core";
interface IPermissionMenuItemProps {
    onClick: () => void;
}
export const PermissionsMenuItem: FunctionComponent<IPermissionMenuItemProps> = ({ onClick }) => {
    return (
        <React.Fragment>
            <MenuDivider />
            <MenuItem icon="lock" text={`${translate("Privacy and Permissions")}...`} onClick={onClick} />
        </React.Fragment>
    );
};
