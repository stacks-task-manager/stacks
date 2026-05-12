// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

interface ICounterProps {
    total?: number;
    totalTooltip?: string;
    success?: number;
    successTooltip?: string;
    warning?: number;
    warningTooltip?: string;
    danger?: number;
    dangerTooltip?: string;
}
export const Counter: FunctionComponent<ICounterProps> = ({
    total,
    totalTooltip,
    success,
    successTooltip,
    warning,
    warningTooltip,
    danger,
    dangerTooltip,
}) => {
    return (
        <div className="counter">
            {Boolean(danger) && (
                <Tooltip content={dangerTooltip} placement="top" className="danger" fill>
                    {danger}
                </Tooltip>
            )}
            {Boolean(warning) && (
                <Tooltip content={warningTooltip} placement="top" className="warning" fill>
                    {warning}
                </Tooltip>
            )}
            {Boolean(success) && (
                <Tooltip content={successTooltip} placement="top" className="success" fill>
                    {success}
                </Tooltip>
            )}
            {Boolean(total) && (
                <Tooltip content={totalTooltip} placement="top" className="total" fill>
                    {total}
                </Tooltip>
            )}
        </div>
    );
};
