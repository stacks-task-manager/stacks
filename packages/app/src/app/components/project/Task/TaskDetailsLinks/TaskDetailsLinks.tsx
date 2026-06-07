// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    FormGroup,
    InputGroup,
    Intent,
    Menu,
    MenuItem,
    Popover,
    Tooltip,
    mergeRefs,
} from "@blueprintjs/core";
import classNames from "classnames";
import React, { FunctionComponent, useMemo, useState } from "react";
import { BlankSlate, Col, Grid, Icon, RoundButton, Row } from "app/components/common";
import { APPICONS, IElectronDialog, ILink } from "@stacks/types";
import { TasksActions } from "app/store/actions";
import { formatDate } from "app/utils/date";
import Dialog from "app/utils/dialog";
import { uuidv4 } from "app/utils/uuid";
import { URLPickerMenuItem } from "app/widgets";

import { path } from "electron";

interface ITaskDetailsLinksProps {
    taskId: string;
    links?: ILink[];
    disabled?: boolean;
}
export const TaskDetailsLinks: FunctionComponent<ITaskDetailsLinksProps> = ({ taskId, links, disabled }) => {
    const handleSaveLink = (link: ILink) => {
        TasksActions.addLink(taskId, { ...link, id: uuidv4() });
    };

    const handleRemoveLink = (event: React.MouseEvent, link: ILink) => {
        event.stopPropagation();
        TasksActions.removeLink(taskId, link.id);
    };

    const handleOpenLink = (link: ILink) => {
        window.open(link.url, "_blank");
    };

    if (links == null || (links != null && links.length === 0)) {
        return (
            <Row>
                <Col justify="center">
                    <BlankSlate
                        icon={APPICONS.URL}
                        title={translate("No links")}
                        description={translate(
                            "This task does not have any links yet Click the button below to add the first one"
                        )}
                        small
                        maxWidth={250}
                    >
                        {disabled ? null : <LinkPicker onAdd={handleSaveLink} />}
                    </BlankSlate>
                </Col>
            </Row>
        );
    }

    return (
        <Grid padding={[0, 30]}>
            <Menu className={Classes.ELEVATION_0}>
                {links.map((link: ILink) => (
                    <a
                        key={link.id}
                        className={classNames("location-menu-item", Classes.MENU_ITEM)}
                        onClick={() => handleOpenLink(link)}
                    >
                        <span className="">
                            {link.preview ? (
                                <Popover
                                    content={<img src={link.preview} width={300} />}
                                    interactionKind="hover"
                                    popoverClassName="popover-padded-medium"
                                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                                    renderTarget={({ isOpen, ...props }) => (
                                        <img
                                            {...props}
                                            src={link.preview}
                                            style={{ width: 50, height: 35, objectFit: "cover" }}
                                        />
                                    )}
                                />
                            ) : (
                                <Icon icon={link.url.startsWith("http") ? "link-01" : "file"} />
                            )}
                        </span>
                        <div className={Classes.FILL}>
                            <Tooltip
                                fill
                                content={
                                    <>
                                        {translate("Created on")} {formatDate(link.created, "PPPp")}
                                    </>
                                }
                                hoverOpenDelay={1000}
                                placement="top"
                            >
                                {link.title}
                            </Tooltip>
                            {link.url !== link.title ? (
                                <small className={Classes.TEXT_DISABLED}>{link.url}</small>
                            ) : null}
                        </div>
                        <div style={{ alignSelf: "center" }} onClick={e => e.stopPropagation()}>
                            <Button
                                small
                                minimal
                                icon={<Icon icon="trash" />}
                                intent={Intent.DANGER}
                                onClick={event => handleRemoveLink(event, link)}
                            />
                            <LinkUpdateButton link={link} taskId={taskId} />
                        </div>
                    </a>
                ))}
            </Menu>

            <div>
                <LinkPicker disabled={disabled} onAdd={handleSaveLink} />
            </div>
        </Grid>
    );
};

interface LinkPickerProps {
    disabled?: boolean;
    onAdd: (link: ILink) => void;
}

const LinkPicker: FunctionComponent<LinkPickerProps> = ({ disabled, onAdd }) => {
    const handleSaveLink = async (url: string) => {
        if (!url?.trim().length) return;

        const link: ILink = {
            id: uuidv4(),
            url,
            title: url,
            created: new Date(),
            updated: new Date(),
        };

        let html = null;
        try {
            const response = await fetch(url);
            const body = await response.text();
            html = new DOMParser().parseFromString(body, "text/html");

            if (html != null) {
                link.title = html.title;

                const ogImage = html.querySelector("meta[property='og:image']")?.getAttribute("content");
                if (ogImage != null) {
                    link.preview = ogImage;
                }
            }
        } catch (e) {
            // eslint-disable-next-line no-console
            console.warn(e);
        }

        onAdd(link);
    };

    const handleSelectFile = async () => {
        const info: IElectronDialog = await Dialog.showOpenDialog({
            title: "Select file",
            buttonLabel: "Select",
            properties: ["openFile"],
        });

        if (!info.canceled && info.filePaths.length) {
            const filePath = info.filePaths.at(0);
            onAdd({
                id: uuidv4(),
                url: filePath!,
                title: path.basename(filePath),
                created: new Date(),
                updated: new Date(),
            });
        }
    };

    return (
        <Popover
            disabled={disabled}
            content={
                <Menu>
                    <MenuItem text={translate("Link from URL")}>
                        <URLPickerMenuItem onAdd={handleSaveLink} />
                    </MenuItem>
                </Menu>
            }
            placement="top"
        >
            <RoundButton disabled={disabled} minimal title={translate("Add link")} icon="link-01" />
        </Popover>
    );
};

interface LinkUpdateButtonProps {
    link: ILink;
    taskId: string;
}
const LinkUpdateButton: FunctionComponent<LinkUpdateButtonProps> = ({ link, taskId }) => {
    const [title, setTitle] = useState(link.title);
    const [url, setUrl] = useState(link.url);

    const canSave = useMemo(() => {
        return title.trim().length > 0 && url.trim().length > 0;
    }, [title, url]);

    const handleSetTitle = (event: React.ChangeEvent<HTMLInputElement>) => {
        setTitle(event.currentTarget.value);
    };

    const handleSetUrl = (event: React.ChangeEvent<HTMLInputElement>) => {
        setUrl(event.currentTarget.value);
    };

    const handleUpdateLink = () => {
        TasksActions.updateLink(taskId, {
            ...link,
            title,
            url,
            updated: new Date(),
        });
    };

    return (
        <Popover
            popoverClassName="popover-padded-medium"
            content={
                <div style={{ minWidth: 250 }}>
                    <FormGroup label={translate("Title")}>
                        <InputGroup
                            value={title}
                            placeholder={translate("Placeholder text")}
                            defaultValue={link.title}
                            onChange={handleSetTitle}
                        />
                    </FormGroup>
                    {link.url.startsWith("http") ? (
                        <FormGroup label={translate("URL")}>
                            <InputGroup
                                value={url}
                                placeholder={translate("Placeholder text")}
                                type="url"
                                defaultValue={link.url}
                                onChange={handleSetUrl}
                            />
                        </FormGroup>
                    ) : null}
                    <Button
                        size="small"
                        intent={Intent.SUCCESS}
                        disabled={!canSave}
                        onClick={handleUpdateLink}
                    >
                        {translate("Update link")}
                    </Button>
                </div>
            }
            renderTarget={({ isOpen, ref: popoverRef, ...popoverProps }) => (
                <Tooltip
                    content={translate("Rename link")}
                    placement="top"
                    disabled={isOpen}
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen: tooltipOpen, ref: tooltipRef, ...tooltipProps }) => (
                        <Button
                            {...tooltipProps}
                            {...popoverProps}
                            ref={mergeRefs(popoverRef, tooltipRef)}
                            small
                            minimal
                            active={isOpen}
                            icon={<Icon icon="text-input" />}
                        />
                    )}
                />
            )}
        />
    );
};
