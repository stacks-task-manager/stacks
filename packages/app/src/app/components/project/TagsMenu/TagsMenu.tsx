// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { Icon, Scroller } from "app/components/common";
import { getTags } from "app/hooks";
import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";

interface ITagsMenuProps {
    value: string[];
    shouldDismiss?: boolean;
    section: TAGSECTION;
    onChange: (tag?: ITag) => void;
}
export const TagsMenu: FunctionComponent<ITagsMenuProps> = ({ value, shouldDismiss, section, onChange }) => {
    const tags = getTags(section, TAGTYPE.TAG);

    return (
        <Scroller maxHeight={300} thin>
            <Menu>
                <MenuItem
                    text={translate("All tags")}
                    icon={<Icon icon="tags-filled" />}
                    onClick={() => onChange(undefined)}
                    shouldDismissPopover={shouldDismiss}
                />
                <MenuDivider />
                {tags.map((t: ITag) => {
                    const isSelected = value.includes(t.id);
                    return (
                        <MenuItem
                            icon={<Icon icon="tag-filled" color={t.color} />}
                            text={t.title}
                            key={t.id}
                            labelElement={isSelected ? <Icon icon="check" /> : undefined}
                            onClick={() => onChange(t)}
                            shouldDismissPopover={shouldDismiss}
                        />
                    );
                })}
            </Menu>
        </Scroller>
    );
};
