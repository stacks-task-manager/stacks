// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { Classes } from "@blueprintjs/core";
import classNames from "classnames";

export const SidebarButtonSkelton = () => {
    return (
        <div className="sidebar-button-wrapper">
            <div className="sidebar-button">
                <div className="sidebar-button-title-wrapper" style={{ paddingLeft: 10 }}>
                    <span style={{ width: 18, height: 18 }} className={Classes.SKELETON} />
                    <span className={classNames("sidebar-button-title", Classes.SKELETON)}>
                        Lorem ipsum sit amet
                    </span>
                </div>
            </div>
        </div>
    );
};
