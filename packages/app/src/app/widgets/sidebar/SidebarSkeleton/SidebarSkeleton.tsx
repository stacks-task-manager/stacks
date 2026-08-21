// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

import { Classes } from "@blueprintjs/core";
import classNames from "classnames";

export const SidebarSkeleton = () => {
    return (
        <div className="sidebar-skeleton">
            <div className="item">
                <div className={classNames("icon", Classes.SKELETON)} />
                <div className={classNames("text", Classes.SKELETON)}>&nbsp;</div>
            </div>
            <div className="item">
                <div className={classNames("icon", Classes.SKELETON)} />
                <div className={classNames("text", Classes.SKELETON)}>&nbsp;</div>
            </div>
            <div className="item">
                <div className={classNames("icon", Classes.SKELETON)} />
                <div className={classNames("text", Classes.SKELETON)}>&nbsp;</div>
            </div>
            <div className="item">
                <div className={classNames("icon", Classes.SKELETON)} />
                <div className={classNames("text", Classes.SKELETON)}>&nbsp;</div>
            </div>
            <div className="item">
                <div className={classNames("icon", Classes.SKELETON)} />
                <div className={classNames("text", Classes.SKELETON)}>&nbsp;</div>
            </div>
        </div>
    );
};
