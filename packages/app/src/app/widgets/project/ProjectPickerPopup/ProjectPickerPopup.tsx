// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, Popover } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";

import { Icon } from "app/components/common";
import { getDocument } from "app/hooks";
import { ProjectPicker } from "../ProjectPicker/ProjectPicker";

interface ProjectPickerPopupProps {
    value?: string;
    children?: React.ReactNode;
    matchTargetWidth?: boolean;
    onChange: (projectId: string) => void;
}
export const ProjectPickerPopup: FunctionComponent<ProjectPickerPopupProps> = ({
    value,
    children,
    matchTargetWidth,
    onChange,
}) => {
    const project = useMemo(() => {
        if (!value) return;
        return getDocument(value);
    }, [value]);

    return (
        <Popover
            content={<ProjectPicker value={value} onChange={onChange} shouldDismissPopover />}
            matchTargetWidth={matchTargetWidth}
            fill
            minimal
            captureDismiss
            placement="bottom-start"
        >
            {children ? (
                children
            ) : (
                <Button fill endIcon={<Icon icon="chevron-selector-vertical" />} alignText={Alignment.START}>
                    {project ? project.title.substring(0, 29) : " "}
                    {project && project.title.length > 29 ? "..." : ""}
                </Button>
            )}
        </Popover>
    );
};
