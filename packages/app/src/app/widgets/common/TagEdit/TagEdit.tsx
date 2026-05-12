// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Checkbox,
    Classes,
    Divider,
    InputGroup,
    Intent,
    Placement,
    Popover,
} from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useMemo, useState } from "react";
import { Col, Grid, Icon, Row } from "app/components/common";
import { TintPicker } from "app/components/project";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { StatusChip } from "../StatusChip/StatusChip";
import { TagChip } from "../TagChip/TagChip";
import { getCurrentProjectId } from "app/hooks";

export interface TagEditProps {
    hasParent?: boolean;
    tag?: ITag;
    defaultTitle?: string;
    shouldDismissPopover?: boolean;
    previewStatus?: boolean; // wether the preview should be formated as a status
    pickerPlacement?: Placement;
    onCancel?: () => void;
    onChange: (tag: Partial<ITag>) => void;
}
export const TagEdit: FunctionComponent<TagEditProps> = ({
    hasParent,
    tag,
    defaultTitle,
    shouldDismissPopover,
    previewStatus,
    pickerPlacement,
    onCancel,
    onChange,
}) => {
    const [color, setColor] = useState(tag?.color || "#f8da3f");
    const [title, setTitle] = useState(tag?.title || defaultTitle);
    const [parent, setParent] = useState(tag?.parent);

    const canSave = useMemo(() => {
        return title != null && title.trim().length > 0 && color != null;
    }, [title, color]);

    const handleChange = () => {
        if (!onChange) return;
        if (!title || !color) return;

        if (!canSave) return;

        onChange({
            ...tag,
            title,
            color,
            parent,
        });
    };

    const handleSetProject = () => {
        const projectId = getCurrentProjectId();
        setParent(parent != null ? undefined : projectId);
    };

    return (
        <div className="tag-edit">
            <Grid gap={10}>
                <InputGroup
                    value={title}
                    autoFocus
                    placeholder={translate("Type a name")}
                    rightElement={
                        <Popover
                            content={
                                <TintPicker
                                    value={color}
                                    onChange={(c: string | undefined) => setColor(c ?? "#f8da3f")}
                                />
                            }
                            popoverClassName="popover-padded-small"
                            placement={pickerPlacement || "right-start"}
                        >
                            <Button variant="minimal" icon={<Icon icon="palette-filled" />} />
                        </Popover>
                    }
                    onChange={event => setTitle(event.currentTarget.value)}
                />

                <div className="preview-box">
                    <span className={classNames([Classes.TEXT_MUTED, Classes.TEXT_SMALL])}>
                        {translate("Preview")}
                    </span>

                    {previewStatus ? (
                        <StatusChip
                            tag={{
                                id: "preview",
                                parent: "",
                                section: TAGSECTION.PROJECTS,
                                type: TAGTYPE.STATUS,
                                title: title || translate("Untitled status"),
                                color,
                            }}
                        />
                    ) : (
                        <TagChip
                            tag={{
                                title: title || translate("Untitled tag"),
                                color,
                                id: "preview",
                                type: TAGTYPE.TAG,
                                section: TAGSECTION.PROJECTS,
                                parent: "",
                            }}
                        />
                    )}
                </div>

                <Grid gap={5}>
                    {hasParent && (
                        <>
                            <div style={{ padding: "0 5px" }}>
                                <Checkbox
                                    label="Project specific"
                                    checked={parent != null}
                                    onChange={handleSetProject}
                                    className="no-margins"
                                />
                            </div>

                            <Divider compact />
                        </>
                    )}

                    <Row>
                        <Col>
                            <Button
                                size="small"
                                className={classNames({ [Classes.POPOVER_DISMISS]: shouldDismissPopover })}
                                onClick={onCancel}
                            >
                                {translate("Cancel")}
                            </Button>
                        </Col>
                        <Col justify="right">
                            <Button
                                size="small"
                                intent={Intent.PRIMARY}
                                onClick={handleChange}
                                className={classNames({ [Classes.POPOVER_DISMISS]: shouldDismissPopover })}
                                disabled={!canSave}
                            >
                                {translate(tag ? "Update" : "Save")}
                            </Button>
                        </Col>
                    </Row>
                </Grid>
            </Grid>
        </div>
    );
};
