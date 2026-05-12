// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Menu, MenuItem, Popover } from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useMemo } from "react";
import { BlankSlate, Col, Grid, Icon, Row, Scroller } from "app/components/common";
import { useNav, useProjectTasks } from "app/hooks";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { useLinksQuery } from "app/hooks/projectFilters";
import { APPICONS, IExtendedLink, ILink, ITask } from "@stacks/types";
import { PreferencesStore } from "app/store/preferences";
import { formatDate } from "app/utils/date";
import { stripMd } from "app/utils/string";
import toast from "app/utils/toast";
import { flatten } from "lodash";
import { useParams } from "react-router-dom";
import { setClipboard } from "app/utils/browser";

export const Links = () => {
    const { id } = useParams();
    const query = useLinksQuery();
    const tasks = useProjectTasks(id ?? "");

    const links: IExtendedLink[] = flatten(
        tasks
            .filter(task => (task.links ?? []).length > 0)
            .map(task => task.links!.map(link => ({ ...link, task })))
    );

    const filteredLinks = useMemo(() => {
        return links
            .sort((a, b) => a.title.localeCompare(b.title))
            .filter(
                link =>
                    link.title.toLowerCase().includes(query.toLowerCase()) ||
                    link.url.toLowerCase().includes(query.toLowerCase())
            );
    }, [links, query]);

    if (links.length === 0) {
        return (
            <Grid vertical>
                <BlankSlate
                    icon={APPICONS.URL}
                    title={translate("No links")}
                    description={translate(
                        "This project does not contain any tasks with links Open any task details to add the first link"
                    )}
                />
            </Grid>
        );
    }

    return (
        <Scroller id="links-view" vertical className={Classes.ELEVATION_1}>
            <Menu>
                {filteredLinks.map(link => (
                    <Link key={link.id} link={link} />
                ))}
            </Menu>
        </Scroller>
    );
};

interface LinkProps {
    link: IExtendedLink;
}
const Link: FunctionComponent<LinkProps> = ({ link }) => {
    const navigate = useNav();

    const handleOpenTask = (task: ITask) => {
        if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${task.project}/${task.id}`);
        } else {
            navigate(`/task/${task.id}`, {
                state: {
                    backgroundLocation: snapshotTaskModalBackground(),
                },
            });
        }
    };

    const handleOpenLink = () => {
        window.open(link.url, "_blank");
    };

    const handleCopyLink = () => {
        setClipboard(link.url);
        toast.success(translate("Link copied to your clipboard"));
    };

    const handlePreventLinkOpen = (event: React.MouseEvent) => {
        event.stopPropagation();
    };

    return (
        <li key={link.id}>
            <div className={classNames("link-menu-item", Classes.MENU_ITEM)} onClick={handleOpenLink}>
                <LinkPreview link={link} />

                <div className={Classes.FILL} style={{ minWidth: 0 }}>
                    <Row gutter={10}>
                        <Col unshrinkable width="auto">
                            <strong>{link.title}</strong>
                        </Col>
                        <Col>
                            <small
                                className={classNames(Classes.TEXT_DISABLED, Classes.TEXT_OVERFLOW_ELLIPSIS)}
                                style={{ display: "inline-block" }}
                            >
                                {link.url}
                            </small>
                        </Col>
                    </Row>

                    <span onClick={handlePreventLinkOpen}>
                        <a
                            className={classNames(Classes.TEXT_OVERFLOW_ELLIPSIS, Classes.TEXT_SMALL)}
                            style={{ display: "block" }}
                            onClick={() => handleOpenTask(link.task)}
                        >
                            <Icon icon={APPICONS.TASK} size={12} /> {stripMd(link.task.title)}
                        </a>
                    </span>
                </div>

                <span className={Classes.MENU_ITEM_LABEL} onClick={handlePreventLinkOpen}>
                    <Popover
                        popoverClassName="popover-padded-medium"
                        content={
                            <Grid className={Classes.TEXT_MUTED} gap={10}>
                                <div>
                                    {translate("Created on")} <strong>{formatDate(link.created)}</strong>
                                </div>
                                {link.updated != null ? (
                                    <div>
                                        {translate("Updated on")} <strong>{formatDate(link.updated)}</strong>
                                    </div>
                                ) : null}
                            </Grid>
                        }
                        placement="bottom-end"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref, ...props }) => (
                            <Button
                                {...props}
                                ref={ref}
                                size="small"
                                variant="minimal"
                                icon={<Icon icon="info-circle" />}
                            />
                        )}
                    />
                    <Popover
                        content={
                            <Menu>
                                <MenuItem
                                    text={translate("Open task...")}
                                    icon={<Icon icon={APPICONS.TASK} />}
                                    onClick={() => handleOpenTask(link.task)}
                                />
                                <MenuItem
                                    text={translate("Open link...")}
                                    icon={<Icon icon="link-external-01" />}
                                    onClick={handleOpenLink}
                                />
                                <MenuItem
                                    text={translate("Copy url...")}
                                    icon={<Icon icon="copy" />}
                                    onClick={handleCopyLink}
                                />
                            </Menu>
                        }
                        placement="bottom-end"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref, ...props }) => (
                            <Button
                                {...props}
                                ref={ref}
                                size="small"
                                variant="minimal"
                                icon={<Icon icon="dots-vertical" />}
                            />
                        )}
                    />
                </span>
            </div>
        </li>
    );
};

interface LinkPreviewProps {
    link: ILink;
}
const LinkPreview: FunctionComponent<LinkPreviewProps> = ({ link }) => {
    if (link.preview == null) {
        return (
            <div className="link-preview">
                <Icon icon={link.url.startsWith("http") ? "link-01" : "file"} />
            </div>
        );
    }

    return (
        <div className="link-preview">
            <Popover
                content={<img src={link.preview} width={300} />}
                interactionKind="hover"
                popoverClassName="popover-padded-medium"
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...props }) => <img {...props} src={link.preview} width={50} />}
            />
        </div>
    );
};
