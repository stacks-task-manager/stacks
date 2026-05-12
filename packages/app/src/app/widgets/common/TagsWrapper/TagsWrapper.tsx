// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import classnames from "classnames";

interface ITagsWrapperProps {
    gap?: number;
    children?: React.ReactNode;
    nowrap?: boolean;
    vertical?: boolean;
}
export const TagsWrapper: React.FunctionComponent<ITagsWrapperProps> = ({
    gap,
    children,
    nowrap,
    vertical,
}) => {
    return (
        <div className={classnames("tags-wrapper", { nowrap, vertical })} style={{ gap }}>
            {children}
        </div>
    );
};
