// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";

import { StatusChip } from "app/components";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { useTags } from "app/hooks";

interface StatusProps {
    status: string;
    section: TAGSECTION;
}
export const Status: FunctionComponent<StatusProps> = ({ status, section }) => {
    const statuses = useTags(section, TAGTYPE.STATUS);
    const currentStatus = useMemo(() => statuses.find((s: ITag) => s.id === status), [status, statuses]);

    if (currentStatus == null) return null;

    return <StatusChip tag={currentStatus} />;
};
