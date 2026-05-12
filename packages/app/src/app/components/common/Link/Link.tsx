// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import classNames from "classnames";

import { RECORDTYPE } from "@stacks/types";
import { Icon } from "../Icon/Icon";

export interface ILinkProps {
    children: React.ReactNode | string;
    type: RECORDTYPE;
    id?: string;
    url?: string;
    showIcon?: boolean;
    underlined?: boolean;
    fill?: boolean;
    backgroundLocation?: Location;
    className?: string;
    minimal?: boolean;
}

export const Link: FunctionComponent<ILinkProps> = ({
    children,
    type,
    id,
    url,
    showIcon,
    underlined,
    fill,
    backgroundLocation,
    className,
    minimal,
}) => {
    const navigate = useNavigate();
    const location = useLocation();

    const handleOpenResource = () => {
        switch (type) {
            case RECORDTYPE.PERSON:
            case RECORDTYPE.TASK:
            case RECORDTYPE.COMPANY:
                navigate(`/${type}/${id}`, {
                    state: { backgroundLocation: backgroundLocation || location },
                });
                break;
            case RECORDTYPE.PROJECT:
            case RECORDTYPE.NOTEPAD:
                navigate(`/${type}/${id}`);
                break;
            case RECORDTYPE.URL:
                window.open(url, '_blank');
                break;
            default:
                break;
        }
    };

    if (minimal) {
        return (
            <a className={className} onClick={handleOpenResource}>
                {children}
            </a>
        );
    }

    return (
        <span
            className={classNames("router-link", className, { link: underlined, fill })}
            onClick={handleOpenResource}
        >
            <span>{children}</span>
            {showIcon ? <Icon icon="link-external-01" size={14} /> : null}
        </span>
    );
};
