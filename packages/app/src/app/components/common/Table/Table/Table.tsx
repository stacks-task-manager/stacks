// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useState } from "react";
import classnames from "classnames";
import { useCallback } from "react";
import { Scroller } from "../../Scroller/Scroller";

interface ITableProps {
    children: React.ReactNode;
    sticky?: boolean;
}
export const Table: FunctionComponent<ITableProps> = ({ children, sticky }) => {
    const [scrolled, setScrolled] = useState(false);

    const handleScroll = useCallback(
        (event: React.UIEvent) => {
            if (!sticky) return;
            if (event.target && (event.target as HTMLElement).scrollLeft > 0 && scrolled === false) {
                setScrolled(true);
            } else if (event.target && (event.target as HTMLElement).scrollLeft <= 0 && scrolled === true) {
                setScrolled(false);
            }
        },
        [scrolled]
    );

    return (
        <Scroller
            thin
            parentClassName={classnames("table-wrapper", { scrolled, sticky })}
            onScroll={handleScroll}
        >
            <table className="custom-html-table">{children}</table>
        </Scroller>
    );
};
