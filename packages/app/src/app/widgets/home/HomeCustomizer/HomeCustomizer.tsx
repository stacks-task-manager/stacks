// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, Drawer, Menu, MenuItem, Switch } from "@blueprintjs/core";
import React, { FunctionComponent, useState } from "react";
import xor from "lodash/xor";

import { Grid, Icon, Scroller } from "app/components/common";
import { HOMEBACKGROUNDPATTERN, IHome } from "@stacks/types";
import { adjustColor, isLight } from "app/utils/colors";
import { TagsWrapper } from "app/widgets/common";

const BACKGROUND_COLORS = [
    "#5b073a",
    "#e2a039",
    "#aecf55",
    "#285b52",
    "#35b8b1",
    "#a8dcd8",
    "#4673d2",
    "#938ce1",
    "#ad7cc4",
    "#f6a0a3",
    "#e0dedc",
    "#ffffff",
];

interface IHomeCustomizerProps {
    value: IHome;
    onChange: (home: IHome) => void;
    onClose: () => void;
}
export const HomeCustomizer: FunctionComponent<IHomeCustomizerProps> = ({ value, onChange, onClose }) => {
    const [open, setOpen] = useState(true);

    const handleClose = () => {
        setOpen(false);
    };

    const handleSetColor = (backgroundColor: string) => {
        onChange({ ...value, backgroundColor });
    };

    const handleSetPattern = (backgroundPattern?: HOMEBACKGROUNDPATTERN) => {
        onChange({ ...value, backgroundPattern });
    };

    const handleToggleWidget = (widget: string) => {
        onChange({ ...value, widgets: xor(value.widgets, [widget]) });
    };

    return (
        <Drawer
            title={translate("Customize home")}
            isOpen={open}
            onClose={handleClose}
            onClosed={onClose}
            hasBackdrop={false}
            style={{ width: 380 }}
        >
            <Scroller thin vertical>
                <div className={Classes.DIALOG_BODY}>
                    <h4>{translate("Widgets")}</h4>

                    <Grid gap={5}>
                        <Switch
                            label="My tasks"
                            checked={value.widgets.includes("myTasks")}
                            onChange={() => handleToggleWidget("myTasks")}
                        />
                        <Switch
                            label={translate("Todos")}
                            checked={value.widgets.includes("todos")}
                            onChange={() => handleToggleWidget("todos")}
                        />
                        <Switch
                            label={translate("Private notes")}
                            checked={value.widgets.includes("notes")}
                            onChange={() => handleToggleWidget("notes")}
                        />
                        <Switch
                            label={translate("Favorite projects")}
                            checked={value.widgets.includes("favoriteProjects")}
                            onChange={() => handleToggleWidget("favoriteProjects")}
                        />
                        <Switch
                            label={translate("Favorite people companies")}
                            checked={value.widgets.includes("favoritePeopleCompanies")}
                            onChange={() => handleToggleWidget("favoritePeopleCompanies")}
                        />
                        <Switch
                            label={translate("Pinned bookmarks")}
                            checked={value.widgets.includes("pinnedBookmarks")}
                            onChange={() => handleToggleWidget("pinnedBookmarks")}
                        />
                    </Grid>

                    <h4>{translate("Background color")}</h4>

                    <TagsWrapper gap={12}>
                        {BACKGROUND_COLORS.map(color => (
                            <BackgroundButton
                                key={color}
                                color={color}
                                isSelected={value.backgroundColor === color}
                                onClick={handleSetColor}
                            />
                        ))}
                    </TagsWrapper>

                    <h4>{translate("Background type")}</h4>
                    <Menu className={Classes.ELEVATION_0}>
                        <MenuItem
                            text="None"
                            onClick={() => handleSetPattern(undefined)}
                            labelElement={value.backgroundPattern == null ? <Icon icon="check" /> : undefined}
                        />
                        <MenuItem
                            text="Waves"
                            onClick={() => handleSetPattern(HOMEBACKGROUNDPATTERN.WAVES)}
                            labelElement={
                                value.backgroundPattern === HOMEBACKGROUNDPATTERN.WAVES ? (
                                    <Icon icon="check" />
                                ) : undefined
                            }
                        />
                        <MenuItem
                            text="Tornado"
                            onClick={() => handleSetPattern(HOMEBACKGROUNDPATTERN.TORNADO)}
                            labelElement={
                                value.backgroundPattern === HOMEBACKGROUNDPATTERN.TORNADO ? (
                                    <Icon icon="check" />
                                ) : undefined
                            }
                        />
                        <MenuItem
                            text="Constellation"
                            onClick={() => handleSetPattern(HOMEBACKGROUNDPATTERN.CONSTELLATION)}
                            labelElement={
                                value.backgroundPattern === HOMEBACKGROUNDPATTERN.CONSTELLATION ? (
                                    <Icon icon="check" />
                                ) : undefined
                            }
                        />
                        <MenuItem
                            text="Rose"
                            onClick={() => handleSetPattern(HOMEBACKGROUNDPATTERN.ROSE)}
                            labelElement={
                                value.backgroundPattern === HOMEBACKGROUNDPATTERN.ROSE ? (
                                    <Icon icon="check" />
                                ) : undefined
                            }
                        />
                        <MenuItem
                            text="Lines"
                            onClick={() => handleSetPattern(HOMEBACKGROUNDPATTERN.LINES)}
                            labelElement={
                                value.backgroundPattern === HOMEBACKGROUNDPATTERN.LINES ? (
                                    <Icon icon="check" />
                                ) : undefined
                            }
                        />
                        <MenuItem
                            text="Sprinkle"
                            onClick={() => handleSetPattern(HOMEBACKGROUNDPATTERN.SPRINKLE)}
                            labelElement={
                                value.backgroundPattern === HOMEBACKGROUNDPATTERN.SPRINKLE ? (
                                    <Icon icon="check" />
                                ) : undefined
                            }
                        />
                        <MenuItem
                            text="Shiny"
                            onClick={() => handleSetPattern(HOMEBACKGROUNDPATTERN.SHINY)}
                            labelElement={
                                value.backgroundPattern === HOMEBACKGROUNDPATTERN.SHINY ? (
                                    <Icon icon="check" />
                                ) : undefined
                            }
                        />
                    </Menu>
                </div>
            </Scroller>
        </Drawer>
    );
};

interface IBackgroundButtonProps {
    color: string;
    isSelected?: boolean;
    onClick: (color: string) => void;
}
const BackgroundButton: FunctionComponent<IBackgroundButtonProps> = ({ color, isSelected, onClick }) => {
    return (
        <button
            className="background-circle-button"
            style={{
                backgroundColor: color,
                borderColor: adjustColor(color, -50),
            }}
            onClick={() => onClick(color)}
        >
            {isSelected ? <Icon icon="check" color={isLight(color) ? "#000" : "#fff"} size={24} /> : null}
        </button>
    );
};
