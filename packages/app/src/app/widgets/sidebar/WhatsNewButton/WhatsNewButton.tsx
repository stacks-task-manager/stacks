// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Dialog, Intent, Tag } from "@blueprintjs/core";
import axios, { AxiosResponse } from "axios";
import classNames from "classnames";
import React, { FunctionComponent, useEffect, useState } from "react";
import { Grid, HotkeyTooltip, Icon, Scroller } from "app/components/common";
import { useStorage } from "app/hooks";
import toast from "app/utils/toast";

import { remote } from "electron";

export const WhatsNewButton = () => {
    const [open, setOpen] = useState(false);
    const [lastVersion, setLastVersion] = useStorage("last-version", false, "0");
    const [newVersion, setNewVersion] = useState(lastVersion !== remote.app.getVersion());

    if (!newVersion) return null;

    return (
        <>
            <HotkeyTooltip title={translate("What s new")} keys={[]} placement="right" horizontal small>
                <div
                    className={classNames("workspace-button", { hasBadge: newVersion })}
                    onClick={handleOpenChangelog}
                >
                    <Icon icon="gift-01" />
                </div>
            </HotkeyTooltip>

            {open ? <ChangelogDialog onClose={handleCloseDialog} /> : null}
        </>
    );

    function handleOpenChangelog() {
        setLastVersion(remote.app.getVersion());
        setOpen(true);
    }

    function handleCloseDialog() {
        setNewVersion(false);
        setOpen(false);
    }
};

interface IChangelog {
    added: string[];
    fixed: string[];
    improved: string[];
    changed: string[];
    hotfix: string[];
    body: string;
}

interface ChangelogDialogProps {
    onClose: () => void;
}
const ChangelogDialog: FunctionComponent<ChangelogDialogProps> = ({ onClose }) => {
    const [open, setOpen] = useState(true);
    const [changelog, setChangelog] = useState<IChangelog>();
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const version = remote.app.getVersion().split("-");
        axios
            .get(`https://getstacksapp.com/updates/version-${version.at(0)}/json`, {
                // .get(`https://getstacksapp.com/updates/version-2.4.3/json`, {
                timeout: 2000,
            })
            .then((response: AxiosResponse) => {
                if (response.data) {
                    function splitLogs(logs: string) {
                        return logs.split("\n").filter((log: string) => log.length > 0);
                    }

                    setChangelog({
                        added: splitLogs(response.data.added),
                        fixed: splitLogs(response.data.fixed),
                        improved: splitLogs(response.data.improved),
                        changed: splitLogs(response.data.changed),
                        hotfix: splitLogs(response.data.hotfix),
                        body: response.data.body,
                    });

                    setLoading(false);
                }
            })
            .catch(() => {
                toast.warn("Unable to show changelog for the current version");
                handleClosing();
            });
    }, []);

    return (
        <Dialog title="Changelog" isOpen={open} onClose={handleClosing} onClosed={onClose}>
            {loading ? (
                <div className={Classes.DIALOG_BODY}>
                    <Grid gap={10}>
                        <div>
                            <Tag large className={Classes.SKELETON}>
                                Lorem
                            </Tag>
                        </div>
                        <Grid gap={5}>
                            {Array.from(Array(5).keys()).map(key => (
                                <div key={key} className={Classes.SKELETON} style={{ height: 25 }}>
                                    Lorem ipsum sit amet
                                </div>
                            ))}
                        </Grid>
                    </Grid>
                </div>
            ) : (
                <>
                    {changelog?.body ? <p dangerouslySetInnerHTML={{ __html: changelog?.body }} /> : null}

                    <Scroller className={Classes.DIALOG_BODY} maxHeight={500} vertical thin>
                        <Grid>
                            {changelog?.added && changelog?.added.length ? (
                                <Changelog
                                    title={translate("Added")}
                                    icon="annotation-plus"
                                    intent={Intent.SUCCESS}
                                    logs={changelog?.added}
                                />
                            ) : null}

                            {changelog?.improved && changelog?.improved.length ? (
                                <Changelog
                                    title={translate("Improved")}
                                    icon="annotation-heart"
                                    intent={Intent.PRIMARY}
                                    logs={changelog?.improved}
                                />
                            ) : null}

                            {changelog?.changed && changelog?.changed.length ? (
                                <Changelog
                                    title={translate("Changed")}
                                    icon="annotation-alert"
                                    intent={Intent.WARNING}
                                    logs={changelog?.changed}
                                />
                            ) : null}

                            {changelog?.fixed && changelog?.fixed.length ? (
                                <Changelog
                                    title={translate("Fixed")}
                                    icon="annotation-check"
                                    intent={Intent.DANGER}
                                    logs={changelog?.fixed}
                                />
                            ) : null}

                            {changelog?.hotfix && changelog?.hotfix.length ? (
                                <Changelog
                                    title={translate("Hotfixes")}
                                    icon="annotation-x"
                                    intent={Intent.DANGER}
                                    logs={changelog?.hotfix}
                                />
                            ) : null}
                        </Grid>
                    </Scroller>
                </>
            )}
        </Dialog>
    );

    function handleClosing() {
        setOpen(false);
    }
};

interface ChangelogProps {
    title: string;
    icon: string;
    logs: string[];
    intent: Intent;
}
const Changelog: FunctionComponent<ChangelogProps> = ({ title, icon, logs, intent }) => {
    return (
        <div>
            <Tag intent={intent} large icon={<Icon icon={icon} />}>
                {title}
            </Tag>
            <ul className={Classes.MENU} style={{ padding: 0 }}>
                {logs.map((item, i) => (
                    <li className={Classes.MENU_ITEM} key={i} style={{ cursor: "default" }}>
                        <span className={Classes.MENU_ITEM_ICON}>
                            <Icon icon={icon} />
                        </span>
                        <div dangerouslySetInnerHTML={{ __html: item }} className={Classes.FILL}></div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
