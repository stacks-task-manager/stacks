// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { createRef, useEffect, useState } from "react";
import classnames from "classnames";
import { strictEqual } from "app/hooks/store";

import { GlobalStore } from "app/store/global";
import Storage from "app/utils/storage";

const MIN_WIDTH = 180;
const MAX_WIDTH = 400;

interface SplitViewProps {
    left: React.ReactElement;
    right: React.ReactElement;
    className?: string;
}

const LeftPane: React.FunctionComponent<{
    leftWidth: number | undefined;
    isSidebarVisible: boolean;
    setLeftWidth: (value: number) => void;
    children?: React.ReactNode;
}> = ({ children, leftWidth, isSidebarVisible, setLeftWidth }) => {
    const leftRef = createRef<HTMLDivElement>();

    useEffect(() => {
        if (leftRef.current) {
            if (!leftWidth) {
                setLeftWidth(leftRef.current.clientWidth);
                return;
            }
            leftRef.current.style.width = `${leftWidth}px`;
        }
    }, [leftRef, leftWidth, setLeftWidth]);

    return (
        <div
            className={classnames("leftPane", {
                closed: !isSidebarVisible,
            })}
            ref={leftRef}
        >
            {children}
        </div>
    );
};

const SplitViewPure: React.FunctionComponent<SplitViewProps> = ({ left, right, className }) => {
    const sidebarWidth = Storage.get<number | undefined>("sidebar-width", width => Number(width), undefined);
    const [leftWidth, setLeftWidth] = useState<undefined | number>(sidebarWidth);
    const [separatorXPosition, setSeparatorXPosition] = useState<undefined | number>(undefined);
    const [dragging, setDragging] = useState(false);
    const isSidebarVisible = GlobalStore.use(state => state.isSidebarVisible, strictEqual);

    const splitPaneRef = createRef<HTMLDivElement>();

    const handleLeftWidthChange = (width: number) => {
        if (width === leftWidth) return;
        setLeftWidth(width);
        Storage.set("sidebar-width", width);
    };

    const onMouseDown = (e: React.MouseEvent) => {
        setSeparatorXPosition(e.clientX);
        setDragging(true);
    };

    const onTouchStart = (e: React.TouchEvent) => {
        setSeparatorXPosition(e.touches[0].clientX);
        setDragging(true);
    };

    const onMove = (clientX: number) => {
        if (dragging && leftWidth && separatorXPosition) {
            const newLeftWidth = leftWidth + clientX - separatorXPosition;
            setSeparatorXPosition(clientX);

            if (newLeftWidth < MIN_WIDTH) {
                handleLeftWidthChange(MIN_WIDTH);
                return;
            }

            if (newLeftWidth > MAX_WIDTH) {
                handleLeftWidthChange(MAX_WIDTH);
                return;
            }

            if (splitPaneRef.current) {
                const splitPaneWidth = splitPaneRef.current.clientWidth;

                if (newLeftWidth > splitPaneWidth - MIN_WIDTH) {
                    handleLeftWidthChange(splitPaneWidth - MIN_WIDTH);
                    return;
                }
            }

            handleLeftWidthChange(newLeftWidth);
        }
    };

    const onMouseMove = (e: MouseEvent) => {
        // e.preventDefault();
        onMove(e.clientX);
    };

    const onTouchMove = (e: TouchEvent) => {
        onMove(e.touches[0].clientX);
    };

    const onMouseUp = () => {
        setDragging(false);
    };

    React.useEffect(() => {
        document.addEventListener("mousemove", onMouseMove);
        document.addEventListener("touchmove", onTouchMove);
        document.addEventListener("mouseup", onMouseUp);

        return () => {
            document.removeEventListener("mousemove", onMouseMove);
            document.removeEventListener("touchmove", onTouchMove);
            document.removeEventListener("mouseup", onMouseUp);
        };
    });

    return (
        <div className={`splitView ${className ?? ""}`} ref={splitPaneRef}>
            <LeftPane
                leftWidth={leftWidth}
                isSidebarVisible={isSidebarVisible}
                setLeftWidth={handleLeftWidthChange}
            >
                {left}
            </LeftPane>

            {isSidebarVisible && (
                <div
                    className="divider-hitbox"
                    onMouseDown={onMouseDown}
                    onTouchStart={onTouchStart}
                    onTouchEnd={onMouseUp}
                >
                    <div className={classnames("divider", { dragging })} />
                </div>
            )}

            <div className="rightPane">{right}</div>
        </div>
    );
};

export const SplitView = React.memo(SplitViewPure);
