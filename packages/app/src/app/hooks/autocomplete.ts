// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Autocomplete hooks and selectors.
 */
import { translate } from "@stacks/translations";
import { Classes, Colors, IconName } from "@blueprintjs/core";
import { addDays, addMonths, addWeeks, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import emoji, { Emoji } from "node-emoji";
import { useMemo, useRef } from "react";
import Tribute, { TributeCollection, TributeItem } from "tributejs";

import {
    APPICONS,
    IPerson,
    ISearchResult,
    ITag,
    PRIORITY,
    PRIORITYICON,
    TAGSECTION,
    TAGTYPE,
} from "@stacks/types";
import { SearchAPI } from "app/api";
import sprites from "app/icons/sprites.svg";
import { PeopleStore } from "app/store/people";
import { PreferencesStore } from "app/store/preferences";
import { stripMd } from "app/utils/string";
import { getTags } from "./tags";

interface ITributeItem<T> {
    icon?: IconName;
    image?: string;
    color?: string;
    item?: T;
    trigger?: string;
    type?: string;
}

export interface IAutocompleteSelectedItem<T> {
    item: T;
    value: string;
    key: string;
    type: string;
}

interface ITributeEvent<T> extends CustomEvent {
    detail: {
        item: TributeItem<{
            item: T;
            value: string;
            key: string;
            trigger: string;
            type: string;
        }>;
    };
}

export interface IAutocompelteDate {
    type: string;
    date: Date;
}

export const useAutocompleteBase = <T extends object>() => {
    const darkMode = PreferencesStore.get().darkMode;
    const tributeRef = useRef<Tribute<ITributeItem<T>> | null>(null);
    const onSelectRef = useRef<((selectedItem: IAutocompleteSelectedItem<T>) => void) | null>(null);
    const isSelectedRef = useRef<((selectedItem: ITributeItem<T>) => boolean) | null>(null);

    const onSelect = (callback: (selectedItem: IAutocompleteSelectedItem<T>) => void) => {
        onSelectRef.current = callback;
    };

    const isSelected = (callback: (selectedItem: ITributeItem<T>) => boolean) => {
        isSelectedRef.current = callback;
    };

    const handleSelect = (e: Event) => {
        const event = e as ITributeEvent<T>;

        const selectedItem: IAutocompleteSelectedItem<T> = {
            value: event.detail.item.original.key,
            item: event.detail.item.original.item,
            key: `${event.detail.item.original.trigger}${event.detail.item.original.value}`,
            type: event.detail.item.original.type,
        };

        if (onSelectRef.current) onSelectRef.current(selectedItem);
    };

    const checkIsSelected = (item: ITributeItem<T>) => {
        if (isSelectedRef.current) return isSelectedRef.current(item);
        return false;
    };

    const show = (
        inputRef: HTMLTextAreaElement | HTMLInputElement | null,
        collection: Array<TributeCollection<{ [key: string]: unknown }>>
    ) => {
        if (inputRef) {
            tributeRef.current = new Tribute<ITributeItem<T>>({
                collection: collection.map(c => {
                    return {
                        menuShowMinLength: 1,
                        requireLeadingSpace: true,
                        ...c,
                        containerClass: `autocomplete-container scroller vertical thin ${Classes.POPOVER} ${
                            darkMode ? Classes.DARK : ""
                        }`,
                        searchOpts: {
                            pre: "<strong>",
                            post: "</strong>",
                            skip: false,
                        },
                        itemClass: Classes.MENU_ITEM,
                        selectClass: Classes.ACTIVE,
                        menuItemTemplate: (item: TributeItem<ITributeItem<T>>) => {
                            return (
                                (item.original.icon != null
                                    ? `<span class="${Classes.MENU_ITEM_ICON} autocomplete-icon" style="color: ${item.original.color};"><span class="${Classes.ICON}"><svg width="16" height="16" style="stroke: currentcolor;"><use href="${sprites}#${item.original.icon}"></use></svg></span></span>`
                                    : "") +
                                (item.original.image != null
                                    ? `<div class="avatar small"><div class="avatar__profile-pic"><img src="${item.original.image}"></div></div>`
                                    : "") +
                                `<div>${item.string}</div>` +
                                (checkIsSelected(item.original)
                                    ? `<span class="${Classes.MENU_ITEM_LABEL}"><span class="${Classes.ICON}"><svg width="16" height="16" style="stroke: currentcolor;"><use href="${sprites}#check"></use></svg></span></span>`
                                    : "")
                            );
                        },
                    };
                }),
            });
            tributeRef.current.attach(inputRef);
            inputRef.addEventListener("tribute-replaced", handleSelect);
        }
    };

    const hide = (inputRef: HTMLTextAreaElement | HTMLInputElement | null) => {
        if (tributeRef.current && inputRef) {
            inputRef.removeEventListener("tribute-replaced", handleSelect);
            tributeRef.current.detach(inputRef);
        }

        tributeRef.current = null;
    };

    const setMenuItems = (items: Array<ITributeItem<T>>) => {
        if (tributeRef.current) {
            tributeRef.current.append(0, items, true);
        }
    };

    return { show, hide, onSelect, setMenuItems, isSelected };
};

export const useAutocomplete = (options: {
    tags?: true;
    assignees?: true;
    emojis?: true;
    documents?: true;
    priority?: true;
    statuses?: true;
    dates?: true;
    tagsSelectTemplate?: (item: TributeItem<object>) => string;
    statusesSelectTemplate?: (item: TributeItem<object>) => string;
    emojisSelectTemplate?: (item: TributeItem<object>) => string;
    assigneesSelectTemplate?: (item: TributeItem<object>) => string;
    documentsSelectTemplate?: (item: TributeItem<object>) => string;
}) => {
    const emojiDebounce = useRef<NodeJS.Timeout | null>(null);
    const assigneesDebounce = useRef<NodeJS.Timeout | null>(null);

    const tagsItems = useMemo(() => {
        const tags = getTags(TAGSECTION.PROJECTS, TAGTYPE.TAG);
        return tags.map((tag: ITag) => ({
            key: tag.title,
            value: tag.title.replace(/\s+/g, ""),
            color: tag.color,
            icon: "tag-filled",
            item: tag,
            trigger: "#",
            type: "tag",
        }));
    }, []);

    const statusesItems = useMemo(() => {
        const statuses = getTags(TAGSECTION.PROJECTS, TAGTYPE.STATUS);
        return statuses
            .filter(tag => tag.type === TAGTYPE.STATUS)
            .map((status: ITag) => ({
                key: status.title,
                value: status.title.replace(/\s+/g, ""),
                color: status.color,
                icon: "circle-filled",
                item: status,
                trigger: "%",
                type: "status",
            }));
    }, []);

    const { show: attach, hide, onSelect } = useAutocompleteBase<ITag>();

    const show = async (inputRef: HTMLTextAreaElement | HTMLInputElement | null) => {
        const collections = [];

        if (options.priority) {
            collections.push({
                values: [
                    {
                        key: translate("Critical"),
                        value: "high",
                        icon: PRIORITYICON.CRITICAL,
                        trigger: "!",
                        color: Colors.RED2,
                        type: "priority",
                        item: PRIORITY.CRITICAL,
                    },
                    {
                        key: translate("High"),
                        value: "high",
                        icon: PRIORITYICON.HIGH,
                        trigger: "!",
                        color: Colors.RED2,
                        type: "priority",
                        item: PRIORITY.HIGH,
                    },
                    {
                        key: translate("Medium"),
                        value: "medium",
                        icon: PRIORITYICON.MEDIUM,
                        trigger: "!",
                        color: Colors.ORANGE2,
                        type: "priority",
                        item: PRIORITY.MEDIUM,
                    },
                    {
                        key: translate("Low"),
                        value: "low",
                        icon: PRIORITYICON.LOW,
                        trigger: "!",
                        color: Colors.GREEN2,
                        type: "priority",
                        item: PRIORITY.LOW,
                    },
                ],
                trigger: "!",
                menuShowMinLength: 0,
                selectTemplate: options.tagsSelectTemplate,
            });
        }

        if (options.tags) {
            collections.push({
                values: tagsItems,
                trigger: "#",
                menuShowMinLength: 0,
                selectTemplate: options.tagsSelectTemplate,
            });
        }

        if (options.statuses) {
            collections.push({
                values: statusesItems,
                trigger: "%",
                menuShowMinLength: 0,
                selectTemplate: options.statusesSelectTemplate,
            });
        }

        if (options.emojis) {
            collections.push({
                values: (text: string, cb: (results: Array<{ key: string; value: string }>) => void) => {
                    if (emojiDebounce.current) {
                        clearTimeout(emojiDebounce.current);
                        emojiDebounce.current = null;
                    }

                    if (text.startsWith(":") || text.length === 0) {
                        cb([]);
                        return;
                    }

                    emojiDebounce.current = setTimeout(() => {
                        cb(
                            emoji.search(text).map((emojiObj: Emoji) => {
                                return {
                                    key: `${emojiObj.emoji} :${emojiObj.key}:`,
                                    value: `${emojiObj.key}:`,
                                };
                            })
                        );
                    }, 200);
                },
                trigger: ":",
                selectTemplate: options.emojisSelectTemplate,
                menuShowMinLength: 1,
            });
        }

        if (options.assignees) {
            collections.push({
                values: (text: string, cb: (results: Array<{ key: string; value: string }>) => void) => {
                    if (assigneesDebounce.current) {
                        clearTimeout(assigneesDebounce.current);
                        assigneesDebounce.current = null;
                    }

                    assigneesDebounce.current = setTimeout(() => {
                        const people = PeopleStore.get().people;
                        cb(
                            people
                                .filter((person: IPerson) => {
                                    return (
                                        person.firstName?.toLowerCase().includes(text.toLowerCase()) ||
                                        person.lastName?.toLowerCase().includes(text.toLowerCase())
                                    );
                                })
                                .map((person: IPerson) => {
                                    return {
                                        key: `${person.firstName} ${person.lastName}`,
                                        value: `#/person/${person.id}`,
                                        icon: person.avatar ? undefined : APPICONS.PERSON,
                                        image: person.avatar,
                                        item: {
                                            id: person.id,
                                            name: `${person.firstName} ${person.lastName}`,
                                            avatar: false,
                                        },
                                        trigger: "@",
                                        type: "assignee",
                                    };
                                })
                        );
                    }, 200);
                },
                trigger: "@",
                selectTemplate: options.assigneesSelectTemplate,
            });
        }

        if (options.documents) {
            collections.push({
                values: (text: string, cb: (results: Array<{ key: string; value: string }>) => void) => {
                    SearchAPI.search(text).then((results: ISearchResult[]) => {
                        cb(
                            results.map((result: ISearchResult) => {
                                return {
                                    key: stripMd(result.title),
                                    value: result.url,
                                    icon: APPICONS[
                                        result.type.toUpperCase() as unknown as keyof typeof APPICONS
                                    ] as IconName,
                                };
                            })
                        );
                    });
                },
                allowSpaces: true,
                trigger: "[[",
                selectTemplate: options.documentsSelectTemplate,
            });
        }

        if (options.dates) {
            collections.push({
                values: [
                    {
                        key: "Starts today",
                        value: "startsToday",
                        icon: "calendar-plus-02",
                        trigger: "^",
                        color: Colors.GREEN2,
                        type: "dates",
                        item: {
                            type: "start",
                            date: new Date(),
                        },
                    },
                    {
                        key: "Starts tomorrow",
                        value: "startsTomorrow",
                        icon: "calendar-plus-02",
                        trigger: "^",
                        color: Colors.GREEN2,
                        type: "dates",
                        item: {
                            type: "start",
                            date: addDays(new Date(), 1),
                        },
                    },
                    {
                        key: "Starts next week",
                        value: "startsNextWeek",
                        icon: "calendar-plus-02",
                        trigger: "^",
                        color: Colors.GREEN2,
                        type: "dates",
                        item: {
                            type: "start",
                            date: startOfWeek(addWeeks(new Date(), 1)),
                        },
                    },
                    {
                        key: "Starts in 2 weeks",
                        value: "startsInTwoWeeks",
                        icon: "calendar-plus-02",
                        trigger: "^",
                        color: Colors.GREEN2,
                        type: "dates",
                        item: {
                            type: "start",
                            date: startOfWeek(addWeeks(new Date(), 2)),
                        },
                    },
                    {
                        key: "Starts next month",
                        value: "startsNextMonth",
                        icon: "calendar-plus-02",
                        trigger: "^",
                        color: Colors.GREEN2,
                        type: "dates",
                        item: {
                            type: "start",
                            date: startOfMonth(addMonths(new Date(), 1)),
                        },
                    },
                    {
                        key: "Due today",
                        value: "dueToday",
                        icon: "calendar-minus-02",
                        trigger: "^",
                        color: Colors.ORANGE2,
                        type: "dates",
                        item: {
                            type: "due",
                            date: new Date(),
                        },
                    },
                    {
                        key: "Due tomorrow",
                        value: "dueTomorrow",
                        icon: "calendar-minus-02",
                        trigger: "^",
                        color: Colors.ORANGE2,
                        type: "dates",
                        item: {
                            type: "due",
                            date: addDays(new Date(), 1),
                        },
                    },
                    {
                        key: "Due next week",
                        value: "dueNextWeek",
                        icon: "calendar-minus-02",
                        trigger: "^",
                        color: Colors.ORANGE2,
                        type: "dates",
                        item: {
                            type: "due",
                            date: endOfWeek(addWeeks(new Date(), 1)),
                        },
                    },
                    {
                        key: "Due in 2 weeks",
                        value: "dueTwoWeeks",
                        icon: "calendar-minus-02",
                        trigger: "^",
                        color: Colors.ORANGE2,
                        type: "dates",
                        item: {
                            type: "due",
                            date: endOfWeek(addWeeks(new Date(), 2)),
                        },
                    },
                    {
                        key: "Due next month",
                        value: "dueNextMonth",
                        icon: "calendar-minus-02",
                        trigger: "^",
                        color: Colors.ORANGE2,
                        type: "dates",
                        item: {
                            type: "due",
                            date: endOfMonth(addMonths(new Date(), 1)),
                        },
                    },
                    {
                        key: "Do today",
                        value: "doToday",
                        icon: "calendar-check-02",
                        trigger: "^",
                        color: Colors.BLUE2,
                        type: "dates",
                        item: {
                            type: "do",
                            date: new Date(),
                        },
                    },
                    {
                        key: "Do tomorrow",
                        value: "doTomorrow",
                        icon: "calendar-check-02",
                        trigger: "^",
                        color: Colors.BLUE2,
                        type: "dates",
                        item: {
                            type: "do",
                            date: addDays(new Date(), 1),
                        },
                    },
                    {
                        key: "Do next week",
                        value: "doNextWeek",
                        icon: "calendar-check-02",
                        trigger: "^",
                        color: Colors.BLUE2,
                        type: "dates",
                        item: {
                            type: "do",
                            date: startOfWeek(addWeeks(new Date(), 1)),
                        },
                    },
                    {
                        key: "Do in 2 weeks",
                        value: "doTwoWeeks",
                        icon: "calendar-check-02",
                        trigger: "^",
                        color: Colors.BLUE2,
                        type: "dates",
                        item: {
                            type: "do",
                            date: startOfWeek(addWeeks(new Date(), 2)),
                        },
                    },
                    {
                        key: "Do next month",
                        value: "doNextMonth",
                        icon: "calendar-check-02",
                        trigger: "^",
                        color: Colors.BLUE2,
                        type: "dates",
                        item: {
                            type: "do",
                            date: startOfMonth(addMonths(new Date(), 1)),
                        },
                    },
                ],
                trigger: "^",
                menuShowMinLength: 0,
            });
        }

        attach(inputRef, collections);
    };

    return { show, hide, onSelect };
};
