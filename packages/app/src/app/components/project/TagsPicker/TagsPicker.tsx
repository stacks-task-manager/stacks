// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, InputGroup, Intent, Menu, MenuDivider, MenuItem, Tooltip } from "@blueprintjs/core";
import classnames from "classnames";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { BlankSlate, Icon, Scroller } from "app/components/common";
import { getCurrentProjectId, useTags } from "app/hooks";
import { RecordActions } from "app/store/actions";
import { scrollIntoView } from "app/utils/dom";
import { TagEdit } from "app/widgets";

export interface TagsPickerProps {
    section: TAGSECTION;
    value: string[];
    contained?: boolean;
    shouldDismissPopover?: boolean;
    type: TAGTYPE;
    tags?: ITag[];
    onAdd?: (tag: Partial<ITag>) => void;
    onToggle: (tag: ITag, event: React.MouseEvent | React.KeyboardEvent) => void;
}
export const TagsPicker: FunctionComponent<TagsPickerProps> = ({
    section,
    value,
    contained,
    shouldDismissPopover,
    type,
    tags,
    onAdd,
    onToggle,
}) => {
    const tagsFromHook = useTags(section, type);
    const items = tags ?? tagsFromHook;
    const [query, setQuery] = useState("");
    const [newVisible, setNewVisible] = useState(false);
    const [selected, setSelected] = useState<number | undefined>(undefined);
    const searchRef = useRef<HTMLInputElement | null>(null);
    const dismissRef = useRef<HTMLButtonElement | null>(null);
    const projectId = getCurrentProjectId();

    const handleFocus = useCallback((elRef: HTMLInputElement | null) => {
        if (elRef) {
            elRef.focus();
        }

        searchRef.current = elRef;
    }, []);

    const filteredTags = useMemo(() => {
        if (query.trim().length === 0) {
            return items.filter((tag: ITag) => !tag.parent || tag.parent === projectId);
        }
        return items.filter((tag: ITag) => {
            return tag.title.toLowerCase().includes(query.toLowerCase().trim()) &&
                (!tag.parent || tag.parent === projectId);
        });
    }, [query, items, projectId]);

    useEffect(() => {
        if (selected == null) return;
        const selectedTag = filteredTags[selected];
        if (selectedTag) {
            const tagEl = document.getElementById(`tag-${selectedTag.id}`);
            if (tagEl) {
                scrollIntoView(tagEl);
            }
        }
    }, [selected, filteredTags]);

    const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.currentTarget.value);
    };

    const handleToggleShowNew = () => {
        setNewVisible(!newVisible);
        if (newVisible) {
            setQuery("");
        }
    };

    const handleAddNewTag = async (tag: Partial<ITag>) => {
        if (onAdd) {
            onAdd(tag);
        } else {
            await RecordActions.addTag({ ...tag, section, type });
        }

        setQuery("");
        setNewVisible(false);
    };

    const handleToggleTag = (tag: ITag, event: React.MouseEvent | React.KeyboardEvent) => {
        if (searchRef.current) {
            searchRef.current.focus();
        }
        onToggle(tag, event);
    };

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            if (selected == null || (selected != null && selected + 1 > filteredTags.length - 1)) {
                setSelected(0);
            } else {
                setSelected(selected + 1);
            }
        } else if (event.key === "ArrowUp") {
            if (selected == null || (selected != null && selected - 1 < 0)) {
                setSelected(filteredTags.length - 1);
            } else {
                setSelected(selected - 1);
            }
        } else if (event.key === "Enter") {
            if (selected != null) {
                handleToggleTag(filteredTags[selected], event);
            }
        } else if (event.key === "Escape") {
            if (event.currentTarget.value.trim().length === 0) {
                if (dismissRef.current) {
                    dismissRef.current.click();
                }
            } else {
                setQuery("");
                setSelected(undefined);
                if (searchRef.current) {
                    searchRef.current.value = "";
                }
            }
        }
    };

    return (
        <div className={classnames("tags-picker", { contained })}>
            {!newVisible && (
                <>
                    <div className="tag-form">
                        <button
                            ref={dismissRef}
                            className={Classes.POPOVER_DISMISS}
                            style={{ display: "none" }}
                        />
                        <InputGroup
                            leftIcon={<Icon icon="search" />}
                            placeholder={`${translate("Search")}...`}
                            autoFocus
                            type="search"
                            inputRef={handleFocus}
                            onKeyDown={handleOnKeyDown}
                            onChange={handleQueryChange}
                        />
                    </div>

                    {filteredTags.length > 0 && (
                        <>
                            <Scroller maxWidth={200} maxHeight={200} vertical thin>
                                <Menu>
                                    {filteredTags.map((tag: ITag, i) => {
                                        const isActive = value.includes(tag.id);
                                        return (
                                            <MenuItem
                                                key={tag.id}
                                                id={`tag-${tag.id}`}
                                                icon={
                                                    <Icon
                                                        icon={type === TAGTYPE.STATUS ? "circle-filled" : "tag-filled"}
                                                        color={tag.color}
                                                    />
                                                }
                                                text={tag.title}
                                                active={selected === i}
                                                shouldDismissPopover={shouldDismissPopover || false}
                                                labelElement={(<>
                                                    {tag.section === TAGSECTION.PROJECTS && tag.parent == null && (
                                                        <Tooltip content="Global tag" placement="right">
                                                            <Icon icon="globe-03" />
                                                        </Tooltip>
                                                    )}
                                                    <Icon icon={isActive ? "check" : undefined} />
                                                </>)}
                                                onClick={(event: React.MouseEvent) =>
                                                    handleToggleTag(tag, event)
                                                }
                                            />
                                        );
                                    })}
                                </Menu>
                            </Scroller>
                            <Menu>
                                <MenuDivider />
                                <MenuItem
                                    text={translate("Create new")}
                                    icon={<Icon icon="plus" />}
                                    shouldDismissPopover={false}
                                    onClick={handleToggleShowNew}
                                />
                            </Menu>
                        </>
                    )}

                    {filteredTags.length === 0 && (
                        <BlankSlate
                            small
                            title={`No ${type === TAGTYPE.STATUS ? "statuses" : "tags"} found`}
                            description={`There are ${type === TAGTYPE.STATUS ? "statuses" : "tags"
                                } matching the current search query`}
                            icon="search"
                        >
                            <Button
                                size="small"
                                icon={<Icon icon="plus" />}
                                intent={Intent.PRIMARY}
                                onClick={handleToggleShowNew}
                            >
                                {translate("Add new")}
                            </Button>
                        </BlankSlate>
                    )}
                </>
            )}

            {newVisible ? (
                <TagEdit
                    hasParent={section === TAGSECTION.PROJECTS}
                    defaultTitle={query}
                    previewStatus={type === TAGTYPE.STATUS}
                    onChange={handleAddNewTag}
                    onCancel={handleToggleShowNew}
                />
            ) : null}
        </div>
    );
};
