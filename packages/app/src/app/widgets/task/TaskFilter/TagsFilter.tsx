// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alignment, Button, Colors, FormGroup, Intent, Popover } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { ITag, TAGSECTION } from "@stacks/types";
import { Icon } from "app/components/common/Icon/Icon";
import { TagsMenu } from "app/components/project/TagsMenu/TagsMenu";
import { Tags } from "app/widgets/common/Tags/Tags";
import { TagsWrapper } from "app/widgets/common/TagsWrapper/TagsWrapper";
import React, { FunctionComponent, memo, useCallback, useMemo } from "react";

interface ITagsFilterProps {
    tags: string[];
    availableTags: ITag[];
    onChange: (tags: string[]) => void;
}

export const TagsFilter: FunctionComponent<ITagsFilterProps> = memo(function TagsFilter({
    tags,
    availableTags,
    onChange,
}) {
    const selectedTag = useMemo(
        () => (tags.length === 1 ? availableTags.find(tag => tag.id === tags[0]) : undefined),
        [availableTags, tags]
    );

    const label = useMemo(() => {
        if (tags.length === 0) return translate("All tags");
        if (tags.length === 1) return selectedTag?.title;
        return translate("Multiple tags");
    }, [selectedTag, tags.length]);

    const icon = useMemo(() => {
        if (tags.length === 0) return "tags";
        if (tags.length === 1) return "tag-filled";
        return "tags-filled";
    }, [tags.length]);

    const color = useMemo(() => {
        if (tags.length === 0) return undefined;
        if (tags.length === 1) return selectedTag?.color;
        return Colors.BLUE3;
    }, [selectedTag, tags.length]);

    const handleToggleTag = useCallback(
        (tag?: ITag) => {
            if (!tag) {
                onChange([]);
                return;
            }
            const selected = new Set(tags);
            if (selected.has(tag.id)) {
                selected.delete(tag.id);
            } else {
                selected.add(tag.id);
            }
            onChange([...selected]);
        },
        [onChange, tags]
    );

    const handleRemoveTag = useCallback(
        (tagId: string) => onChange(tags.filter(tag => tag !== tagId)),
        [onChange, tags]
    );

    return (
        <FormGroup label={translate("Tags")}>
            <Popover
                content={
                    <TagsMenu
                        value={tags}
                        onChange={handleToggleTag}
                        shouldDismiss={false}
                        section={TAGSECTION.PROJECTS}
                    />
                }
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon={icon} color={color} />}
                    endIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.START}
                    intent={tags.length > 0 ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>

            {tags.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    <TagsWrapper>
                        <Tags
                            value={tags}
                            tags={availableTags.filter(tag => tags.includes(tag.id))}
                            section={TAGSECTION.PROJECTS}
                            onRemove={handleRemoveTag}
                        />
                    </TagsWrapper>
                </div>
            )}
        </FormGroup>
    );
});
