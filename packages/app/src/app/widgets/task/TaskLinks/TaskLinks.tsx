// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Menu, MenuItem, Popover, Tooltip } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";

import { Icon, RoundButton, Scroller } from "app/components/common";
import { ILink } from "@stacks/types";

interface TaskLinksProps {
    links: ILink[];
    asTag?: boolean;
}
export const TaskLinks: FunctionComponent<TaskLinksProps> = ({ links, asTag }) => {
    if (!links) return null;

    const handleOpenLink = (link: ILink) => {
        window.open(link.url, '_blank');
    };

    return (
        <Popover
            content={
                <Scroller thin vertical maxHeight={400} maxWidth={300}>
                    <Menu>
                        {links.map((link: ILink) => (
                            <Tooltip
                                key={link.id}
                                content={link.url}
                                placement="right"
                                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                renderTarget={({ isOpen, ref, ...props }) => (
                                    <MenuItem
                                        className="location-menu-item"
                                        icon={
                                            <Icon icon={link.url.startsWith("http") ? "link-01" : "file"} />
                                        }
                                        text={link.title}
                                        onClick={() => handleOpenLink(link)}
                                        ref={ref}
                                        {...props}
                                    />
                                )}
                            ></Tooltip>
                        ))}
                    </Menu>
                </Scroller>
            }
            placement="bottom"
        >
            <Tooltip content={`This task has ${links.length} links`} placement="top">
                {!asTag && (
                    <button>
                        <Icon icon="link-01" /> {links.length}
                    </button>
                )}

                {asTag && <RoundButton icon="link-01" title={links.length} minimal />}
            </Tooltip>
        </Popover>
    );
};
