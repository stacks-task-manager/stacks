// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useMemo, useState } from "react";

import { Button, Classes, Dialog, Tab, Tabs } from "@blueprintjs/core";
import classNames from "classnames";
import { ITag, TAGSECTION, TAGTYPE, UUID } from "@stacks/types";
import { Scroller, SettingRow } from "app/components/common";
import { useTags } from "app/hooks";
import { RecordActions } from "app/store/actions";
import { TagsOrderDialog } from "app/widgets";
import { NewTag } from "../NewTag/NewTag";
import { Statuses } from "../Statuses/Statuses";
import { Tags } from "../Tags/Tags";
import { TagsWrapper } from "../TagsWrapper/TagsWrapper";

interface TagsStatusesManagerProps {
    section: TAGSECTION;
    canUpdateTag?: boolean;
    canRemoveTag?: boolean;
    canUpdateStatus?: boolean;
    canRemoveStatus?: boolean;
    parentId?: UUID;
    onClose: () => void;
}

export const TagsStatusesManager: FunctionComponent<TagsStatusesManagerProps> = ({
    section,
    canUpdateTag,
    canRemoveTag,
    canUpdateStatus,
    canRemoveStatus,
    parentId,
    onClose,
}) => {
    const tagsList = useTags(section, TAGTYPE.TAG);
    const statusesList = useTags(section, TAGTYPE.STATUS);

    const [open, setOpen] = useState(true);
    const [tab, setTab] = useState("tags");
    const [showReorderTags, setShowReorderTags] = useState(false);
    const [showReorderStatuses, setShowReorderStatuses] = useState(false);

    const tags = useMemo(() => {
        return parentId != null
            ? tagsList.filter(tag => tag.parent === null || tag.parent === parentId)
            : tagsList;
    }, [parentId, tagsList]);

    const statuses = useMemo(() => {
        return parentId != null
            ? statusesList.filter(tag => tag.parent === null || tag.parent === parentId)
            : statusesList;
    }, [parentId, statusesList]);

    const handletSetActiveTab = (tabId: string) => {
        setTab(tabId);
    };

    const handleClose = () => {
        setOpen(false);
    };

    const onAddTag = (tag: Partial<ITag>) => {
        RecordActions.addTag({ ...tag, type: TAGTYPE.TAG, section });
    };

    const onAddStatus = (status: Partial<ITag>) => {
        RecordActions.addTag({ ...status, type: TAGTYPE.STATUS, section });
    };

    return (
        <Dialog isOpen={open} onClose={handleClose} onClosed={onClose}>
            <div className={classNames([Classes.DIALOG_HEADER, "has-tabs"])}>
                <h6 className={Classes.HEADING}>Manage Tags and Statuses</h6>

                <Tabs
                    animate
                    fill
                    defaultSelectedTabId="tags"
                    selectedTabId={tab}
                    onChange={handletSetActiveTab}
                >
                    <Tab id="tags" title="Tags" tagContent={tags.length > 0 ? tags.length : undefined} />
                    <Tab
                        id="statuses"
                        title="Statuses"
                        tagContent={statuses.length > 0 ? statuses.length : undefined}
                    />
                </Tabs>
                <div style={{ width: 10 }} />
                <Button
                    variant="minimal"
                    className={Classes.DIALOG_CLOSE_BUTTON}
                    icon="cross"
                    onClick={handleClose}
                />
            </div>

            <div className={Classes.DIALOG_BODY}>
                {tab === "tags" ? (
                    <>
                        <SettingRow
                            title="Tags"
                            description="Tags work like keywords or labels that make it easy to organize your work into clean, logical categories. You can easily filter and search your tasks that contain one or a more tags."
                        >
                            <Scroller maxHeight={500} thin>
                                <TagsWrapper gap={5}>
                                    <NewTag
                                        onAdd={onAddTag}
                                        label={translate("Add tags")}
                                        hasParent={parentId != null}
                                    />
                                    <Tags
                                        value={tags.map(t => t.id)}
                                        section={section}
                                        confirmRemove
                                        showParent
                                        onChange={canUpdateTag ? RecordActions.updateTag : undefined}
                                        onRemove={canRemoveTag ? RecordActions.removeTag : undefined}
                                    />
                                </TagsWrapper>
                            </Scroller>
                        </SettingRow>

                        {showReorderTags ? (
                            <TagsOrderDialog
                                items={tags}
                                onClose={() => setShowReorderTags(false)}
                                onReorder={RecordActions.orderTags}
                            />
                        ) : null}
                    </>
                ) : (
                    <>
                        <SettingRow
                            title="Statuses"
                            description="Statuses, like tags, allow you to better categorize your resources. Statuses vary from tags in that only one may be assigned to each resource."
                            last
                        >
                            <Scroller maxHeight={500} thin>
                                <TagsWrapper gap={5}>
                                    <NewTag
                                        isStatus
                                        onAdd={onAddStatus}
                                        hasParent={parentId != null}
                                        label={translate("Add status")}
                                    />
                                    <Statuses
                                        statuses={statuses}
                                        confirmRemove
                                        showParent
                                        onChange={canUpdateStatus ? RecordActions.updateTag : undefined}
                                        onRemove={canRemoveStatus ? RecordActions.removeTag : undefined}
                                    />
                                </TagsWrapper>
                            </Scroller>
                        </SettingRow>

                        {showReorderStatuses ? (
                            <TagsOrderDialog
                                items={statuses}
                                onClose={() => setShowReorderStatuses(false)}
                                onReorder={RecordActions.orderTags}
                            />
                        ) : null}
                    </>
                )}
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button size="small" onClick={handleClose}>
                        {translate("Close")}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
};
