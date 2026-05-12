// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ROLE_SECTIONS } from "@stacks/types";
import { useCanAccess } from "app/hooks";
import { FunctionComponent } from "react";
import { BlankSlate } from "../BlankSlate/BlankSlate";
import React from "react";
import { Grid } from "../Layout";

interface AccessGateProps {
    children: React.ReactNode;
    section: ROLE_SECTIONS;
    fallback?: boolean | React.ReactElement | null;
    fullscreen?: boolean;
    small?: boolean;
}

export const AccessGate: FunctionComponent<AccessGateProps> = ({
    section,
    children,
    fallback = true,
    fullscreen = true,
    small = true,
}) => {
    const { read } = useCanAccess(section);
    if (!read) {
        if (fallback === true) {
            return (
                <Grid vertical={fullscreen}>
                    <BlankSlate
                        title="Access denied"
                        description="The content you are trying to access it not allowed for your current role."
                        icon="lock-01"
                        small={small} />
                </Grid>
            );
        }

        return fallback === false ? null : fallback;
    }
    return <>{children}</>;
};