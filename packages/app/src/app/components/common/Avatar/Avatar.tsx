// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, {
    CSSProperties,
    FunctionComponent,
    KeyboardEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import classNames from "classnames";
import { HTMLDivProps, Placement, Tooltip } from "@blueprintjs/core";

import { getInitials } from "app/utils/string";
import { stringToColour } from "app/utils/colors";
import { IPerson } from "@stacks/types";
import { Icon } from "app/components/common";

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
/**
 * Renders a person avatar (photo or colored-initials). When `onClick` or
 * `interractive` is set, the root becomes keyboard-activatable
 * (`role="button"`, `tabIndex=0`) and fires `onClick` on Enter/Space.
 *
 * Caveat: an interactive avatar must not be nested inside another interactive
 * element (e.g. a parent `<button>` or clickable row) — that would produce
 * nested interactive roles and confusing keyboard behavior.
 */
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
        [showTooltip, person.firstName, person.lastName, placement]
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
    const clickable = Boolean(onClick) || interractive;

    // Keyboard activation mirrors button semantics: Enter/Space invoke `onClick`.
    // `onClick` is typed to receive a MouseEvent (the shared `HTMLDivProps`
    // surface), but keyboard activation yields a KeyboardEvent, so the event is
    // coerced — it is only used for its `preventDefault` side effect here, never
    // for mouse-specific data.
    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (!onClick) return;
        if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onClick(event as unknown as React.MouseEvent<HTMLDivElement>);
        }
    };

    return (
        <div
            {...rest}
            className={classNames("avatar", {
                hasBorder,
                small,
                large,
                huge,
                narrow,
                clickable,
            })}
            style={styles}
            onClick={onClick}
            onKeyDown={handleKeyDown}
            role={clickable ? "button" : undefined}
            tabIndex={clickable ? 0 : -1}
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
