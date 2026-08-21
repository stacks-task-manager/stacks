// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { Icon, Scroller } from "app/components/common";
import { useTags } from "app/hooks";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import React, { FunctionComponent } from "react";

interface ITagSectionMenuProps {
    type: TAGTYPE;
    value: string[];
    shouldDismiss?: boolean;
    section: TAGSECTION;
    onChange: (tag?: ITag) => void;
}
/** Shared tag/status section menu. Both TagsMenu and StatusesMenu delegate here. */
export const TagSectionMenu: FunctionComponent<ITagSectionMenuProps> = ({
    type,
    value,
    shouldDismiss,
    section,
    onChange,
}) => {
    const items = useTags(section, type);
    const isStatus = type === TAGTYPE.STATUS;
    const allLabel = isStatus ? translate("All statuses") : translate("All tags");
    const allTestId = isStatus ? "statuses-menu-all" : "tags-menu-all";
    const itemTestId = isStatus ? "statuses-menu-item" : "tags-menu-item";

    return (
        <Scroller maxHeight={300} thin>
            <Menu>
                <MenuItem
                    text={allLabel}
                    icon={
                        isStatus ? (
                            <Icon icon="circle-filled" color={Colors.GRAY3} />
                        ) : (
                            <Icon icon="tags-filled" />
                        )
                    }
                    onClick={() => onChange(undefined)}
                    shouldDismissPopover={shouldDismiss}
                    data-testid={allTestId}
                />
                <MenuDivider />
                {items.map((t: ITag) => {
                    const isSelected = value.includes(t.id);
                    return (
                        <MenuItem
                            icon={
                                isStatus ? (
                                    <Icon icon="circle-filled" color={t.color} />
                                ) : (
                                    <Icon icon="tag-filled" color={t.color} />
                                )
                            }
                            text={t.title}
                            key={t.id}
                            labelElement={isSelected ? <Icon icon="check" /> : undefined}
                            onClick={() => onChange(t)}
                            shouldDismissPopover={shouldDismiss}
                            data-testid={`${itemTestId}-${t.id}`}
                        />
                    );
                })}
            </Menu>
        </Scroller>
    );
};
