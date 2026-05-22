// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Collapse } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FC, FunctionComponent } from "react";

import { Icon, Scroller } from "app/components/common";

interface FiltersSidebarProps {
    children: React.ReactNode;
    header?: React.ReactNode;
    footer?: React.ReactNode;
    width?: number;
}
export const FiltersSidebar: FunctionComponent<FiltersSidebarProps> = ({
    children,
    header,
    footer,
    width,
}) => {
    return (
        <div className="filters-sidebar" style={{ maxWidth: width, minWidth: width }}>
            {header != null ? <div className="filters-sidebar-header">{header}</div> : null}
            <Scroller vertical className="filters-sidebar-filters" thin shadows>
                {children}
            </Scroller>
            {footer != null ? <div className="filters-sidebar-footer">{footer}</div> : null}
        </div>
    );
};

interface IFilterSectionProps {
    title: string;
    icon?: string;
    subtitle?: string;
    open?: boolean;
    padded?: boolean;
    main?: boolean;
    active?: boolean;
    accessory?: JSX.Element | undefined;
    children?: React.ReactNode;
    onToggle?: () => void;
}
export const FilterSection: FC<IFilterSectionProps> = ({
    title,
    icon,
    subtitle,
    open,
    padded,
    main,
    children,
    active,
    accessory,
    onToggle,
}) => {
    return (
        <div className={classNames("filters-sidebar-section", { open, main, active })}>
            <div className="filters-sidebar-section-header" onClick={onToggle}>
                <div className="filters-sidebar-section-title">
                    {icon && <Icon icon={icon} className="title-icon" />}
                    {title}
                </div>
                {accessory}
                {/* {!main && <Icon icon={open ? "minus" : "plus"} iconSize={13} />} */}
            </div>
            <Collapse isOpen={open}>
                <div className={classNames("filters-sidebar-section-content", { padded })}>
                    {children}
                    {subtitle && (
                        <div className={Classes.FORM_GROUP}>
                            <div className={Classes.FORM_HELPER_TEXT}>{subtitle}</div>
                        </div>
                    )}
                </div>
            </Collapse>
        </div>
    );
};
