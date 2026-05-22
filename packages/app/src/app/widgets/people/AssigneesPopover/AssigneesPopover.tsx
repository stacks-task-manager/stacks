// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import {
    Button,
    Classes,
    DefaultPopoverTargetHTMLProps,
    InputGroup,
    Intent,
    MaybeElement,
    Menu,
    MenuDivider,
    Popover,
    PopoverClickTargetHandlers,
    PopoverHoverTargetHandlers,
    PopoverTargetProps,
} from "@blueprintjs/core";
import { IPerson } from "@stacks/types";
import { PeopleStore } from "app/store/people";
import { Icon, BlankSlate, Scroller } from "app/components/common";
import Storage from "app/utils/storage";
import { useMe } from "app/hooks";
import { PersonItem } from "../PersonItem/PersonItem";
import { scrollIntoView } from "app/utils/dom";

const RECENTLY_SELECTED_PEOPLE = "recently-selected-people";

interface IAssigneesPopoverProps {
    value: string[];
    children?: React.ReactNode | MaybeElement;
    disabled?: boolean;
    dismissable?: boolean;
    disallowed?: string[];
    className?: string;
    renderTarget?: (
        props: PopoverTargetProps &
            PopoverHoverTargetHandlers<DefaultPopoverTargetHTMLProps> &
            PopoverClickTargetHandlers<DefaultPopoverTargetHTMLProps>
    ) => React.JSX.Element;
    onToggle: (personId: string) => void;
    onClear?: () => void;
    onPopupToggle?: (openState: boolean) => void;
}
export const AssigneesPopover: FunctionComponent<IAssigneesPopoverProps> = ({
    value,
    children,
    disabled,
    dismissable,
    disallowed,
    className,
    renderTarget,
    onToggle,
    onClear,
    onPopupToggle,
}) => {
    const me = useMe();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selected, setSelected] = useState<number | undefined>(undefined);
    const selectedRef = useRef<number | undefined>(undefined);
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const searchRef = useRef<HTMLInputElement>(null);
    const dismissRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        if (searchRef.current) {
            searchRef.current.focus();
        }

        if (!open) {
            selectedRef.current = undefined;
            setSelected(undefined);
        }
    }, [open]);

    const filteredPeople = useMemo(() => {
        const { people } = PeopleStore.get();
        if (!people) return [];

        if (query.length === 0) return people;

        if (query.length > 0) {
            return people.filter((person: IPerson) => {
                return (
                    (person.firstName && person.firstName.toLowerCase().includes(query.toLowerCase())) ||
                    (person.lastName && person.lastName.toLowerCase().includes(query.toLowerCase())) ||
                    (person.email && person.email.toLowerCase().includes(query.toLowerCase()))
                );
            });
        }

        return people.filter((person: IPerson) => value.includes(person.id));
    }, [query, open, value]);

    useEffect(() => {
        if (selected != null) {
            const person = filteredPeople[selected];
            if (person != null) {
                scrollIntoView(document.getElementById(`person-${person.id}`));
            }
        }
    }, [selected]);

    const recentPeople = useMemo(() => {
        const { people } = PeopleStore.get();

        if (!people || query.length > 0) {
            return me ? [me] : [];
        }

        const rencents = Storage.get<string[]>(RECENTLY_SELECTED_PEOPLE, true, []).filter(
            (personId: string) => !value.includes(personId)
        );

        const recentPeople = people.filter((person: IPerson) => {
            return rencents.includes(person.id);
        });

        if (me && !recentPeople.some(person => person.id === me?.id)) {
            recentPeople.unshift(me);
        }

        return recentPeople;
    }, [query, open, value, me]);

    const handleSetQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }
        const query = event.target.value;
        debounce.current = setTimeout(() => {
            setQuery(query);
        }, 300);
    };

    const gotoNextItem = () => {
        if (selectedRef.current == null) {
            selectedRef.current = 0;
        } else {
            selectedRef.current =
                selectedRef.current + 1 < recentPeople.length + filteredPeople.length
                    ? selectedRef.current + 1
                    : 0;
        }

        setSelected(selectedRef.current);
    };

    const gotoPrevItem = () => {
        if (selectedRef.current == null) {
            selectedRef.current = 0;
        } else {
            selectedRef.current =
                selectedRef.current - 1 < 0
                    ? recentPeople.length + filteredPeople.length - 1
                    : selectedRef.current - 1;
        }

        setSelected(selectedRef.current);
    };

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if (event.key === "ArrowDown") {
            gotoNextItem();
        } else if (event.key === "ArrowUp") {
            gotoPrevItem();
        } else if (event.key === "Enter") {
            selectActive();
        } else if (event.key === "Escape") {
            if (event.currentTarget.value.trim().length === 0) {
                if (dismissRef.current) {
                    dismissRef.current.click();
                }
            } else {
                setQuery("");
                selectedRef.current = undefined;
                setSelected(undefined);
                if (searchRef.current) {
                    searchRef.current.value = "";
                }
            }
        }
    };

    const handleToggleAssignee = (personId: string) => {
        onToggle(personId);

        const recentPeople = Storage.get(RECENTLY_SELECTED_PEOPLE, true, []);
        recentPeople.unshift(personId);
        Storage.set(RECENTLY_SELECTED_PEOPLE, [...new Set(recentPeople)].slice(0, 5));

        if (searchRef.current) {
            searchRef.current.focus();
        }
    };

    const selectActive = () => {
        if (selected != null) {
            handleToggleAssignee([...recentPeople, ...filteredPeople][selected].id);
        }
    };

    const handleClosed = () => {
        setOpen(false);
        setQuery("");
        onPopupToggle ? () => onPopupToggle(false) : undefined;
    };

    const handleClearAll = () => {
        if (searchRef.current) {
            searchRef.current.value = "";
        }
        if (dismissRef.current) {
            dismissRef.current.click();
        }
        if (onClear) {
            onClear();
        }
    };

    return (
        <Popover
            onOpening={onPopupToggle ? () => onPopupToggle(true) : undefined}
            onOpened={() => setOpen(true)}
            onClosed={handleClosed}
            captureDismiss
            className={className}
            content={
                <div className="search-list-popover">
                    <button
                        ref={dismissRef}
                        className={Classes.POPOVER_DISMISS}
                        style={{ display: "none" }}
                    />
                    <InputGroup
                        leftIcon={<Icon icon="search" />}
                        placeholder={translate("Search person")}
                        inputRef={searchRef}
                        onChange={handleSetQuery}
                        onKeyDown={handleOnKeyDown}
                        type="search"
                    />
                    <Scroller thin vertical>
                        <Menu>
                            {recentPeople.length > 0 && !query.length && <MenuDivider title="Recently selected" />}
                            {!query.length && recentPeople.map((person: IPerson, index: number) => {
                                return (
                                    <PersonItem
                                        key={person.id}
                                        person={person}
                                        selected={value.includes(person.id)}
                                        small
                                        dismissable={dismissable}
                                        me={me?.id === person.id}
                                        active={selected === index}
                                        disabled={disallowed && disallowed.includes(person.id)}
                                        onClick={() => handleToggleAssignee(person.id)}
                                    />
                                );
                            })}
                            {filteredPeople.length > 0 && (
                                <MenuDivider title={query.length > 0 ? "Found people" : "People"} />
                            )}

                            {query.length > 0 && !filteredPeople.length && (
                                <BlankSlate
                                    small
                                    title="No people found"
                                    icon="search"
                                />
                            )}

                            {filteredPeople.map((person: IPerson, index: number) => {
                                return (
                                    <PersonItem
                                        key={person.id}
                                        person={person}
                                        selected={value.includes(person.id)}
                                        small
                                        dismissable={dismissable}
                                        me={me?.id === person.id}
                                        active={selected === recentPeople.length + index}
                                        disabled={disallowed && disallowed.includes(person.id)}
                                        onClick={() => handleToggleAssignee(person.id)}
                                    />
                                );
                            })}
                        </Menu>
                    </Scroller>

                    {filteredPeople.length === 0 && recentPeople.length === 0 && (
                        <BlankSlate small title="Search a person" icon="search" />
                    )}

                    {!query.length && value.length > 0 && onClear && (
                        <Button
                            variant="minimal"
                            intent={Intent.DANGER}
                            size="small"
                            fill
                            icon={<Icon icon="users-x" />}
                            onClick={handleClearAll}
                        >
                            {translate("Clear all")}
                        </Button>
                    )}
                </div>
            }
            usePortal
            disabled={disabled}
            lazy
            renderTarget={renderTarget}
        >
            {children}
        </Popover>
    );
};
