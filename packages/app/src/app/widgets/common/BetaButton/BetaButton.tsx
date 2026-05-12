// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Tooltip } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent } from "react";
interface BetaButtonProps {
    ml?: boolean;
    mr?: boolean;
}
export const BetaButton: FunctionComponent<BetaButtonProps> = ({ ml, mr }) => {
    return (
        <Tooltip
            content={translate("This feature is in beta which means it is intended for testing purposes only and things might not work as planned just yet")}
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, className, ...props }) => (
                <span className={classNames("beta-button", className, { ml, mr })} {...props}>
                    {translate("Beta")}
                </span>
            )}
        />
    );
};
