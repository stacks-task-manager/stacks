// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import classNames from "classnames";
import { HTMLDivProps, ResizeSensor } from "@blueprintjs/core";

import { hasScrollbar } from "app/utils/dom";

interface IBodyProps extends HTMLDivProps {
    children?: React.ReactNode;
    noPadding?: boolean;
    flexed?: boolean;
    onClick?: () => void;
}

export const Body: React.FC<IBodyProps> = ({ children, noPadding, flexed, onClick, ...props }) => {
    const divEl = React.createRef<HTMLDivElement>();
    const id = `body-${Math.random().toString(36).substring(7)}`;

    const handleResize = () => {
        setHasScrollbars();
    };

    const setHasScrollbars = () => {
        if (divEl.current) {
            if (hasScrollbar(divEl.current)) {
                divEl.current.classList.add("has-scrollbar");
            } else {
                divEl.current.classList.remove("has-scrollbar");
            }
        }
    };

    return (
        <ResizeSensor onResize={handleResize}>
            <div
                {...props}
                id={id}
                ref={divEl}
                className={classNames("body custom-scrollbars", {
                    "no-padding": noPadding,
                    flexed: flexed,
                })}
                onClick={onClick}
            >
                {children}
            </div>
        </ResizeSensor>
    );
};
