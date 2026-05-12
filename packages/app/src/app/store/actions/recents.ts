// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Recently opened resources.
 */
import { produce } from "immer";

import { IRecentsStore, RecentsStore } from "../recents";
import { getStorage, setStorage } from "app/utils/storage";
import { IRecentItem } from "@stacks/types";
import { nav } from "app/hooks";
import { stripMd } from "app/utils/string";

const load = () => {
    const recentItems = getStorage("recents", true, []);

    RecentsStore.set(
        produce((state: IRecentsStore) => {
            state.items = recentItems;
        })
    );
};

const add = (item: IRecentItem) => {
    RecentsStore.set(
        produce((state: IRecentsStore) => {
            let title = stripMd(item.title);
            title = title.length > 30 ? `${title.substring(0, 30)}...` : title;

            state.items.unshift({
                ...item,
                title,
            });
            state.items = state.items.filter((itm, i) => {
                if (i > 0) {
                    if (itm.url === item.url) return false;
                }

                return true;
            });
            state.items = state.items.slice(0, 10);
        })
    );

    setStorage("recents", RecentsStore.get().items);
};

const addVerbose = (title: string, url: string, type: string) => {
    let icon = "close";

    switch (type) {
        case "project":
            icon = "check-circle-broken";
            break;
        case "notepad":
            icon = "book-closed";
            break;
    }

    add({
        url,
        title,
        icon,
    });
};

const clear = () => {
    RecentsStore.set(
        produce((state: IRecentsStore) => {
            state.items = [];
        })
    );

    setStorage("recents", RecentsStore.get().items);
};

const getLastItem = () => {
    const recentItems = getStorage<IRecentItem[]>("recents", true, []);

    for (const item of recentItems) {
        if (!item.url.startsWith("/task")) {
            return item;
        }
    }

    return null;
};

const goToLastItem = () => {
    const lastItem = getLastItem();

    if (lastItem) {
        // check if the current URL match the last viewed item
        if (window.location.hash.replace("#", "") !== lastItem.url) {
            nav(lastItem.url);
        }
    }
};

const removeItem = (id: string) => {
    const item = RecentsStore.get().items.find(item => item.url.includes(id));
    if (!item) return;

    RecentsStore.set(
        produce((state: IRecentsStore) => {
            state.items = state.items.filter((item: IRecentItem) => !item.url.includes(id));
        })
    );

    setStorage("recents", RecentsStore.get().items);
};

export const RecentsActions = {
    load,
    add,
    addVerbose,
    clear,
    getLastItem,
    goToLastItem,
    removeItem,
};
