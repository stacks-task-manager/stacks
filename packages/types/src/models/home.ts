// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export enum HOMEBACKGROUNDPATTERN {
    WAVES = "waves",
    TORNADO = "tornado",
    CONSTELLATION = "constellation",
    ROSE = "rose",
    LINES = "lines",
    SPRINKLE = "sprinkle",
    SHINY = "shiny",
}

export interface IHome {
    backgroundColor: string;
    backgroundPattern?: HOMEBACKGROUNDPATTERN;
    widgets: string[];
}

export const defaultHome: IHome = {
    backgroundColor: "#e0dedc",
    backgroundPattern: HOMEBACKGROUNDPATTERN.WAVES,
    widgets: ["myTasks", "todos", "notes", "favoriteProjects", "favoritePeopleCompanies", "pinnedBookmarks"],
};
