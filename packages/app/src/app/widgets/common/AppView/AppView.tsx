// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HTMLDivProps } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent } from "react";

interface AppViewContentProps extends HTMLDivProps {
    children: React.ReactNode;
    padded?: boolean;
    relative?: boolean;
    transparent?: boolean;
}

export const AppViewContent: FunctionComponent<AppViewContentProps> = ({
    children,
    padded,
    relative,
    transparent,
    ...props
}) => {
    const { className, ...restProps } = props;

    return (
        <div
            className={classNames(
                "app-view__content",
                {
                    padded,
                    relative,
                    transparent,
                },
                className
            )}
            {...restProps}
        >
            {children}
        </div>
    );
};

interface AppViewProps extends HTMLDivProps {
    children: React.ReactNode;
    toolbar?: React.ReactNode;
    prepend?: React.ReactNode;
    append?: React.ReactNode;
    appViewProps?: React.HTMLAttributes<HTMLDivElement>;
    wrapperProps?: HTMLDivProps;
}

export const AppView: FunctionComponent<AppViewProps> = ({
    children,
    toolbar,
    prepend,
    append,
    appViewProps,
    wrapperProps,
    ...props
}) => {
    return (
        <div {...appViewProps} className={classNames("app-view", appViewProps?.className)} {...props}>
            {prepend}
            <div className="app-view__wrapper" {...wrapperProps}>
                {toolbar}
                {children}
            </div>
            {append}
        </div>
    );
};
