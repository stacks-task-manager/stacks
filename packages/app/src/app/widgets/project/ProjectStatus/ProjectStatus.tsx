// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";

import { getTag } from "app/hooks";
import { StatusChip } from "app/widgets/common";

interface ProjectStatusProps {
    status: string | null;
    interactive?: boolean;
    disabled?: boolean;
    id?: string;
    onRemove?: () => void;
}
export const ProjectStatus: FunctionComponent<ProjectStatusProps> = ({
    status,
    interactive,
    disabled,
    id,
    onRemove,
}) => {
    const currentStatus = useMemo(() => {
        if (!status) return null;
        return getTag(status);
    }, [status]);


    if (!currentStatus) return null;

    return (
        <StatusChip
            tag={currentStatus}
            tagId={id}
            interactive={interactive}
            disabled={disabled}
            onRemove={onRemove}
        />
    );
};
