// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Colors, Menu, MenuDivider, MenuItem } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { ITag, TAGSECTION, TAGTYPE } from "@stacks/types";
import { Icon, Scroller } from "app/components/common";
import { useTags } from "app/hooks";
import { translate } from "@stacks/translations";

interface IStatusesMenuProps {
    value: ITag[];
    shouldDismiss?: boolean;
    section: TAGSECTION;
    onChange: (status?: ITag) => void;
}
export const StatusesMenu: FunctionComponent<IStatusesMenuProps> = ({
    value,
    shouldDismiss,
    section,
    onChange,
}) => {
    const statuses = useTags(section, TAGTYPE.STATUS);

    return (
        <Scroller maxHeight={300} thin>
            <Menu>
                <MenuItem
                    text={translate("All statuses")}
                    icon={<Icon icon="circle-filled" color={Colors.GRAY3} />}
                    onClick={() => onChange(undefined)}
                    shouldDismissPopover={shouldDismiss}
                />
                <MenuDivider />
                {statuses.map((t: ITag) => {
                    const isSelected = value.some((status: ITag) => status.id === t.id);
                    return (
                        <MenuItem
                            icon={<Icon icon="circle-filled" color={t.color} />}
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
