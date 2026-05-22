// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { CSSProperties, FunctionComponent, useCallback, useEffect, useMemo, useState } from "react";
import classnames from "classnames";
import { HTMLDivProps, Placement, Tooltip } from "@blueprintjs/core";

import { getInitials } from "app/utils/string";
import { stringToColour } from "app/utils/colors";
import { IPerson } from "@stacks/types";
import { Icon } from "app/components/common";
import classNames from "classnames";

interface IAvatarProps extends HTMLDivProps {
    person: IPerson;
    showTooltip?: boolean;
    placement?: Placement;
    hasBorder?: boolean;
    narrow?: boolean;
    small?: boolean;
    large?: boolean;
    huge?: boolean;
    interractive?: boolean;
    selected?: boolean;
}
export const Avatar: FunctionComponent<IAvatarProps> = ({
    person,
    showTooltip,
    placement,
    hasBorder,
    narrow,
    small,
    large,
    huge,
    interractive,
    selected,
    onClick,
    ...rest
}) => {
    const [avatarImageFailed, setAvatarImageFailed] = useState(false);

    useEffect(() => {
        setAvatarImageFailed(false);
    }, [person.avatar]);

    const renderTooltip = useCallback(
        (node: React.ReactNode) => {
            if (!showTooltip) return node;

            return (
                <Tooltip content={`${person.firstName} ${person.lastName}`} placement={placement || "top"}>
                    {node}
                </Tooltip>
            );
        },
        [showTooltip]
    );

    const initials = useMemo(() => {
        if (person.avatar && !avatarImageFailed)
            return (
                <div className="avatar__profile-pic">
                    <img
                        src={`${person.avatar}?size=small`}
                        title={`${person.firstName} ${person.lastName}`}
                        onError={() => setAvatarImageFailed(true)}
                    />
                </div>
            );
        return getInitials(`${person.firstName} ${person.lastName}`);
    }, [person.firstName, person.lastName, person.avatar, avatarImageFailed]);

    const styles: CSSProperties = useMemo(
        () => ({
            backgroundColor: stringToColour(person.id),
        }),
        [person.id]
    );

    const badgeSize = small ? 6 : large ? 14 : 9;

    return (
        <div
            {...rest}
            className={classnames("avatar", {
                hasBorder,
                small,
                large,
                huge,
                narrow,
                clickable: Boolean(onClick) || interractive,
            })}
            style={styles}
            onClick={onClick}
            tabIndex={-1}
            title={`${person.firstName} ${person.lastName}`}
        >
            {renderTooltip(initials)}
            {selected && (
                <div className="avatar__badge">
                    <Icon icon="check" size={badgeSize} />
                </div>
            )}
            <div className={classNames("avatar__badge", person.onlineStatus)} />
        </div>
    );
};
