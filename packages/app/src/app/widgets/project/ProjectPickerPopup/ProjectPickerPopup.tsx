// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, Popover } from "@blueprintjs/core";
import type { PopoverProps } from "@blueprintjs/core";
import React, { FunctionComponent, useMemo } from "react";

import { Icon } from "app/components/common/Icon/Icon";
import { getDocument } from "app/hooks";
import { ProjectPicker } from "../ProjectPicker/ProjectPicker";

interface ProjectPickerPopupBaseProps {
    children?: React.ReactNode;
    matchTargetWidth?: boolean;
    minimal?: boolean;
    placement?: PopoverProps["placement"];
    showProjectIcon?: boolean;
}

interface SingleProjectPickerPopupProps extends ProjectPickerPopupBaseProps {
    multiple?: false;
    value?: string;
    onChange: (projectId: string) => void;
}

interface MultipleProjectPickerPopupProps extends ProjectPickerPopupBaseProps {
    multiple: true;
    value?: string[];
    onChange: (projectIds: string[]) => void;
    showAnyProject?: boolean;
    children: React.ReactNode;
}

type ProjectPickerPopupProps = SingleProjectPickerPopupProps | MultipleProjectPickerPopupProps;

export const ProjectPickerPopup: FunctionComponent<ProjectPickerPopupProps> = props => {
    const project = useMemo(() => {
        if (props.multiple || !props.value) return;
        return getDocument(props.value);
    }, [props.multiple, props.value]);

    const picker = props.multiple ? (
        <ProjectPicker
            multiple
            value={props.value}
            onChange={props.onChange}
            shouldDismissPopover={false}
            showAnyProject={props.showAnyProject}
            showProjectIcon={props.showProjectIcon}
        />
    ) : (
        <ProjectPicker
            value={props.value}
            onChange={props.onChange}
            shouldDismissPopover
            showProjectIcon={props.showProjectIcon}
        />
    );

    return (
        <Popover
            content={picker}
            matchTargetWidth={props.matchTargetWidth}
            fill
            minimal={props.minimal ?? true}
            captureDismiss
            placement={props.placement ?? "bottom-start"}
        >
            {props.children ? (
                props.children
            ) : (
                <Button fill endIcon={<Icon icon="chevron-selector-vertical" />} alignText={Alignment.START}>
                    {project ? project.title.substring(0, 29) : " "}
                    {project && project.title.length > 29 ? "..." : ""}
                </Button>
            )}
        </Popover>
    );
};
