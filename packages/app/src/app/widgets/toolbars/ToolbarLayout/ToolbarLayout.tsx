// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import React, { forwardRef } from "react";

export interface MainToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
    single?: boolean;
}

export const MainToolbar = forwardRef<HTMLDivElement, MainToolbarProps>(
    ({ children, className, single, ...props }, ref) => (
        <div ref={ref} className={classNames("main-toolbar", { single }, className)} {...props}>
            {children}
        </div>
    )
);
MainToolbar.displayName = "MainToolbar";

export type SectionToolbarProps = React.HTMLAttributes<HTMLDivElement>;

export const SectionToolbar = ({ children, className, ...props }: SectionToolbarProps) => (
    <div className={classNames("section-toolbar", className)} {...props}>
        {children}
    </div>
);

export interface SectionToolbarSideProps extends React.HTMLAttributes<HTMLDivElement> {
    centered?: boolean;
    fixed?: boolean;
    padded?: boolean;
    side?: boolean;
}

export const SectionToolbarSide = ({
    centered,
    children,
    className,
    fixed,
    padded,
    side,
    ...props
}: SectionToolbarSideProps) => (
    <div
        className={classNames("section-toolbar-side", { centered, fixed, padded, side }, className)}
        {...props}
    >
        {children}
    </div>
);

export type SectionToolbarTitleProps = React.HTMLAttributes<HTMLDivElement>;

export const SectionToolbarTitle = ({ children, className, ...props }: SectionToolbarTitleProps) => (
    <div className={classNames("section-toolbar-title", className)} {...props}>
        {children}
    </div>
);

export type SectionToolbarOptionsProps = React.HTMLAttributes<HTMLDivElement>;

export const SectionToolbarOptions = ({ children, className, ...props }: SectionToolbarOptionsProps) => (
    <div className={classNames("section-toolbar-options", className)} {...props}>
        {children}
    </div>
);

export type SectionToolbarDividerProps = React.HTMLAttributes<HTMLSpanElement>;

export const SectionToolbarDivider = ({ className, ...props }: SectionToolbarDividerProps) => (
    <span className={classNames("section-toolbar-divider", className)} {...props} />
);
