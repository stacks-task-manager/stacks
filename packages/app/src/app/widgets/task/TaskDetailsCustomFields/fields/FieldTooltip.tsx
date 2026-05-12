// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Icon } from "app/components/common";

interface FieldTooltipProps {
    description?: string;
}
export const FieldTooltip: FunctionComponent<FieldTooltipProps> = ({ description }) => {
    if (!description || (description != null && description.length === 0)) return null;

    return (
        <Tooltip content={description} placement="top">
            <Icon icon="info-circle" size={14} className={Classes.TEXT_DISABLED} cursor="help" />
        </Tooltip>
    );
};
