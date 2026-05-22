// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import React, { CSSProperties, FunctionComponent, useEffect, useMemo, useRef } from "react";

interface IScrollerProps extends React.HTMLProps<HTMLDivElement> {
    minHeight?: number | string;
    minWidth?: number | string;
    maxHeight?: number | string;
    maxWidth?: number | string;
    horizontal?: boolean;
    vertical?: boolean;
    shadows?: boolean;
    thin?: boolean;
    parentClassName?: string;
    onScroll?: (event: React.UIEvent) => void;
}
export const Scroller: FunctionComponent<IScrollerProps> = ({
    minHeight,
    minWidth,
    maxHeight,
    maxWidth,
    horizontal,
    vertical,
    shadows,
    thin,
    className,
    parentClassName,
    onScroll,
    ...props
}) => {
    const scrollerRef = useRef<HTMLDivElement | null>(null);
    const parentRef = useRef<HTMLDivElement | null>(null);

    const setShadows = () => {
        if (!scrollerRef.current || !parentRef.current) return;

        const { scrollTop, scrollHeight, clientHeight } = scrollerRef.current;

        if (scrollTop > 0) {
            parentRef.current.classList.add("has-top-shadow");
        } else {
            parentRef.current.classList.remove("has-top-shadow");
        }

        if (scrollTop + clientHeight < scrollHeight) {
            parentRef.current.classList.add("has-bottom-shadow");
        } else {
            parentRef.current.classList.remove("has-bottom-shadow");
        }
    };

    useEffect(() => {
        if (!shadows) return;

        setShadows();
        if (scrollerRef.current) {
            scrollerRef.current.addEventListener("scroll", setShadows);
        }

        return () => {
            if (scrollerRef.current) {
                scrollerRef.current.removeEventListener("scroll", setShadows);
            }
        };
    }, [scrollerRef, shadows]);

    const styles: CSSProperties = useMemo(() => {
        const style: CSSProperties = {
            minHeight,
            minWidth,
            maxHeight,
            maxWidth,
        };

        return style;
    }, [minHeight, minWidth, maxHeight, maxWidth]);

    return (
        <div {...props} className={classNames(["scroller-parent", parentClassName])} ref={parentRef}>
            <div
                style={styles}
                className={classNames(["scroller", className], {
                    horizontal: horizontal && !vertical,
                    vertical: vertical && !horizontal,
                    thin,
                })}
                ref={scrollerRef}
                onScroll={onScroll}
            >
                {props.children}
            </div>
        </div>
    );
};
