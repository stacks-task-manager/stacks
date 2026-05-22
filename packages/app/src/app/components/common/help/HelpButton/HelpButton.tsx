// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Menu, MenuItem, Popover } from "@blueprintjs/core";
import Mousetrap from "mousetrap";
import React, { useEffect, useRef, useState } from "react";
import { HotkeyTooltip, Icon } from "app/components/common";
import { HotkeysDialog } from "../HotkeysDialog/HotkeysDialog";

export const HelpButton = () => {
    const [hotkeysVisible, setHotkeysVisible] = useState(false);
    const btnRef = useRef<HTMLDivElement | null>(null);

    const toggleHetkeysDialog = () => {
        setHotkeysVisible(!hotkeysVisible);
    };

    useEffect(() => {
        Mousetrap.bind(["command+/", "ctrl+/"], toggleHetkeysDialog);

        return () => {
            Mousetrap.unbind(["command+/", "ctrl+/"]);
        };
    }, []);

    const handleGoToLink = (linkSegment: string) => {
        console.log("MISSING handle go to link", linkSegment);
    };

    const openChangelog = () => {
        handleGoToLink("updates");
    };

    const openSupport = () => {
        handleGoToLink("support");
    };

    const handleGoToDocs = () => {
        console.log("MISSSING go to docks", "https://docs.getstacksapp.com");
    };

    return (
        <>
            <Popover
                content={
                    <Menu data-testid="help-menu">
                        <MenuItem
                            text={translate("Help docs")}
                            icon={<Icon icon="book-open-01" />}
                            onClick={handleGoToDocs}
                        />
                        <MenuItem
                            text={translate("Support center")}
                            icon={<Icon icon="life-buoy-01" />}
                            onClick={openSupport}
                        />
                        <MenuItem
                            text={translate("Keyboard shortcuts")}
                            icon={<Icon icon="keyboard-02" />}
                            onClick={toggleHetkeysDialog}
                        />
                        <MenuItem
                            text={translate("What s new")}
                            icon={<Icon icon="rocket-02" />}
                            onClick={openChangelog}
                        />
                    </Menu>
                }
                placement="right-end"
            >
                <HotkeyTooltip title={translate("Help")} keys={[]} placement="right" horizontal small>
                    <div className="workspace-button" ref={btnRef} data-testid="help-button">
                        <Icon icon="help-circle" />
                    </div>
                </HotkeyTooltip>
            </Popover>

            {hotkeysVisible && <HotkeysDialog onClose={() => setHotkeysVisible(false)} />}
        </>
    );
};
