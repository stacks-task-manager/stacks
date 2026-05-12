// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import classNames from "classnames";
import { Classes } from "@blueprintjs/core";

interface ITaskDetailsSectionProps {
    title?: string | React.ReactNode;
    vertical?: boolean;
    centered?: boolean;
    align?: "center" | "right";
    children?: React.ReactNode;
    accessory?: React.ReactNode;
    gap?: number;
    width?: number;
    className?: string;
    isLoading?: boolean;
}
export const TaskDetailsSection: FunctionComponent<ITaskDetailsSectionProps> = ({
    title,
    vertical,
    centered,
    align,
    children,
    accessory,
    gap,
    width,
    className,
    isLoading,
}) => {
    return (
        <div className={classNames("task-details-section", { vertical }, className)}>
            <div
                className="task-details-section__title-wrapper"
                style={{ width: width || (vertical ? "100%" : 120) }}
            >
                <div
                    className={classNames("task-details-section__title", {
                        centered,
                        [Classes.SKELETON]: isLoading,
                    })}
                >
                    {title}
                </div>
                {accessory}
            </div>
            <div
                className={classNames("task-details-section__content", {
                    centered,
                    "align-right": align === "right",
                    "align-center": align === "center",
                })}
                style={{ gap: gap || 0 }}
            >
                {children}
            </div>
        </div>
    );
};
