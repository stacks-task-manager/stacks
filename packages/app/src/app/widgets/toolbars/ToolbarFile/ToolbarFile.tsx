// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Menu, MenuDivider, Popover } from "@blueprintjs/core";
import React from "react";
import { useParams } from "react-router-dom";

import { Icon } from "app/components/common";
import { DocumentTintMenuItem, ToolbarTitle } from "app/widgets";

export const ToolbarFile = () => {
    const params = useParams<{ id: string }>();

    return (
        <div className="main-toolbar single">
            <div className="section-toolbar">
                <div className="section-toolbar-side side">
                    <div className="section-toolbar-title">
                        <ToolbarTitle documentId={params.id} />
                    </div>
                    <div className="section-toolbar-options">
                        <Popover
                            content={
                                <Menu>
                                    {params.id && <DocumentTintMenuItem documentId={params.id} />}
                                    <MenuDivider />
                                </Menu>
                            }
                            placement="bottom"
                        >
                            <Button size="small" variant="minimal" icon={<Icon icon="chevron-down" />} />
                        </Popover>
                    </div>
                </div>
                <div className="section-toolbar-side fixed">&nbsp;</div>
            </div>
        </div>
    );
};
