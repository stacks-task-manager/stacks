// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { CSSProperties, FunctionComponent, useMemo } from "react";
import classNames from "classnames";

interface IGridProps extends React.HTMLProps<HTMLDivElement> {
    gap?: number;
    children?: React.ReactNode;
    padding?: number | [number, number];
    paddingTop?: number;
    paddingBottom?: number;
    align?: "center" | "left" | "right";
    id?: string;
    vertical?: boolean;
}
export const Grid: FunctionComponent<IGridProps> = ({
    gap,
    children,
    className,
    padding,
    paddingTop,
    paddingBottom,
    align,
    id,
    vertical,
    ...restProps
}) => {
    const styles: CSSProperties = useMemo(() => {
        const style: CSSProperties = {};

        if (gap != null) {
            style.gap = gap;
        }

        if (padding != null) {
            if (Array.isArray(padding)) {
                style.paddingTop = style.paddingBottom = padding.at(0);
                style.paddingLeft = style.paddingRight = padding.at(1);
            } else {
                style.padding = `${padding || 0}px 0`;
            }
        }

        if (paddingTop != null) {
            style.paddingTop = paddingTop;
        }

        if (paddingBottom != null) {
            style.paddingBottom = paddingBottom;
        }
        return style;
    }, [gap, padding, paddingTop, paddingBottom]);

    return (
        <div
            className={classNames("layout-grid", className, align, { vertical })}
            style={styles}
            id={id}
            {...restProps}
        >
            {children}
        </div>
    );
};
