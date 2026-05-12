// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";

import { useStackNavigation } from "app/hooks";

interface IStackSelectedProps {
    stackId: string;
}
export const StackSelected: FunctionComponent<IStackSelectedProps> = ({ stackId }) => {
    const isSelected = useStackNavigation(stackId);
    if (!isSelected) return null;

    return <div className="stack-selected" />;
};
