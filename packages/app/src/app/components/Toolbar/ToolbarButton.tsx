// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Button, ButtonProps } from "@blueprintjs/core";

export const ToolbarButton: React.FC<ButtonProps> = props => {
    return (
        <div className="toolbar-item">
            <Button {...props} />
        </div>
    );
};
