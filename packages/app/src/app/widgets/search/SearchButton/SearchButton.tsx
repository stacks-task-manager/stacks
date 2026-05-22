// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useState } from "react";
import { HotkeyTooltip, Icon } from "app/components/common";
import { Search } from "../Search/Search";

export const SearchButton = () => {
    const [isOpen, setIsOpen] = useState(false);

    const handleToggleVisibility = () => {
        setIsOpen(!isOpen);
    };

    return (
        <>
            <HotkeyTooltip
                title={translate("Search")}
                keys={["meta", "K"]}
                placement="right"
                horizontal
                small
            >
                <div
                    className="workspace-button"
                    onClick={handleToggleVisibility}
                    data-testid="global-search-button"
                >
                    <Icon icon="search" />
                </div>
            </HotkeyTooltip>
            {isOpen && <Search onClose={handleToggleVisibility} />}
        </>
    );
};
