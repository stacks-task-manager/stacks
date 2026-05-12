// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

import { Tag } from "@blueprintjs/core";
import { useRole } from "app/hooks";
import React from "react";

export const PersonRole = ({ roleId }: { roleId: string }) => {
    const role = useRole(roleId);
    if (role == null) return null;

    return (
        <Tag minimal round>
            {role.title}
        </Tag>
    )
}