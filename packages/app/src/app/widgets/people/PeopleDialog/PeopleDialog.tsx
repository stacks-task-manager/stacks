// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Dialog,
    InputGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover
} from "@blueprintjs/core";
import Mousetrap from "mousetrap";
import React, { FunctionComponent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IPerson } from "@stacks/types";
import { Col, Grid, HotkeyChip, Icon, Row, Scroller } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { useStorage } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { PeopleActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { scrollIntoView } from "app/utils/dom";
import { Assignees } from "../Assignees/Assignees";
import { PersonItem } from "../PersonItem/PersonItem";

interface IPeopleGroup {
    title: string;
    people: IPerson[];
}

interface IPeopleDialogProps {
    value?: string[];
    single?: boolean;
    onClose?: (people: string[]) => void;
    onClosed?: () => void;
}
export const PeopleDialog: FunctionComponent<IPeopleDialogProps> = ({ value, single, onClose, onClosed }) => {
    const [open, setOpen] = useState(true);
    const [query, setQuery] = useState("");
    const [selectedPeople, setSelectedPeople] = useState<IPerson[]>([]);
    const [selectedGroup, setSelectedGroup] = useState<number | undefined>(undefined);
    const [selectedPerson, setSelectedPerson] = useState<number | undefined>(undefined);
    const selectedGroupRef = useRef<number | undefined>(undefined);
    const selectedPersonRef = useRef<number | undefined>(undefined);
    const searchRef = useRef<HTMLInputElement>(null);
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const [groupBy, setGroupBy] = useStorage<"company" | "role" | "ungrouped">(
        "people-picker-group",
        false,
        "ungrouped"
    );
    const [orderBy, setOrderBy] = useStorage<"asc" | "desc">("people-picker-order", false, "asc");
    const { people, me } = PeopleStore.use(state => ({ people: state.people, me: state.me }), shallowEqual);

    const filteredPeople: IPerson[] = useMemo(() => {
        if (!people) return [];

        return people
            .filter((person: IPerson) => {
                if (query.trim().length === 0) return true;
                const lq = query.toLowerCase();
                return (
                    `${person.firstName} ${person.lastName}`.toLowerCase().includes(lq) ||
                    (person.email && person.email.toLowerCase().includes(lq))
                );
            })
            .sort((pA: IPerson, pB: IPerson) => {
                return orderBy === "asc"
                    ? `${pA.firstName} ${pA.lastName}`.localeCompare(`${pB.firstName} ${pB.lastName}`)
                    : `${pB.firstName} ${pB.lastName}`.localeCompare(`${pA.firstName} ${pA.lastName}`);
            })
            .sort((pA: IPerson, pB: IPerson) => {
                if (pA.id === me) return -1;
                if (pB.id === me) return 1;
                return 0;
            });
    }, [query, value, orderBy]);

    const orderGroup = useCallback(
        (groupA: IPeopleGroup, groupB: IPeopleGroup) => {
            return orderBy === "asc"
                ? groupA.title.localeCompare(groupB.title)
                : groupB.title.localeCompare(groupA.title);
        },
        [orderBy]
    );

    const groupedPeople: IPeopleGroup[] = useMemo(() => {
        if (groupBy === "company") {
            const companies = PeopleStore.get()
                .companies.map(company => {
                    return {
                        title: company.title,
                        people: PeopleActions.getCompanyPeople(company.id),
                    };
                })
                .filter((group: IPeopleGroup) => group.people.length > 0)
                .sort(orderGroup);

            companies.push({
                title: "No company",
                people: PeopleActions.getNoCompanyPeople(),
            });

            return companies;
        } else if (groupBy === "role") {
            const grouped = filteredPeople.reduce(
                (groups: { [title: string]: IPerson[] }, person: IPerson) => {
                    const role = person.role;
                    return {
                        ...groups,
                        [role]: [...(groups[role] || []), person],
                    };
                },
                {}
            );

            return Object.keys(grouped)
                .map((title: string) => ({
                    title,
                    people: grouped[title],
                }))
                .sort(orderGroup);
        }

        // ungrouped
        return [
            {
                title: "People",
                people: [...filteredPeople],
            },
        ];
    }, [filteredPeople, groupBy]);

    // watcher for setting the selected people
    useEffect(() => {
        setSelectedPeople(filteredPeople.filter(person => (value || []).includes(person.id)));
    }, [value]);

    // key binding for focusing the search box
    useEffect(() => {
        handleSearch();
        // focus the search input
        Mousetrap.bind("meta+f", handleSearch);
        Mousetrap.bind(["up", "down"], () => {
            if (searchRef.current) searchRef.current.focus();
        });

        return () => {
            Mousetrap.unbind("meta+f");
            Mousetrap.unbind(["up", "down"]);
        };
    }, []);

    useEffect(() => {
        handleSearch();
    }, [searchRef.current]);

    // scroll menu when activating a menu item
    useEffect(() => {
        if (selectedPerson !== undefined && selectedGroup !== undefined) {
            const personMenuItem = document.getElementById(
                `person-${groupedPeople[selectedGroup].people[selectedPerson].id}`
            );
            if (personMenuItem) {
                scrollIntoView(personMenuItem, { behavior: "smooth", block: "center" });
            }
        }
    }, [selectedPerson, selectedGroup]);

    const handleSearch = () => {
        if (searchRef.current) {
            searchRef.current.focus();
        }
    };

    const handleSave = (event: React.MouseEvent) => {
        event.stopPropagation();
        handleClose();
    };

    const handleClose = () => {
        setOpen(false);
        onClose && onClose(selectedPeople.map((person: IPerson) => person.id) || []);
    };

    const handleClosed = () => {
        setQuery("");
        setSelectedPeople([]);
        onClosed && onClosed();
    };

    const handleSetQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }
        const query = event.target.value;
        debounce.current = setTimeout(() => {
            setSelectedGroup(undefined);
            setSelectedPerson(undefined);
            selectedGroupRef.current = undefined;
            selectedPersonRef.current = undefined;
            setQuery(query);
        }, 300);
    };

    const gotoNextItem = () => {
        if (selectedGroupRef.current === undefined || selectedPersonRef.current === undefined) {
            selectedGroupRef.current = 0;
            selectedPersonRef.current = 0;
        } else {
            if (selectedPersonRef.current + 1 < groupedPeople[selectedGroupRef.current].people.length) {
                selectedPersonRef.current = selectedPersonRef.current + 1;
            } else {
                selectedPersonRef.current = 0;
                if (selectedGroupRef.current + 1 > groupedPeople.length - 1) {
                    selectedGroupRef.current = 0;
                } else {
                    selectedGroupRef.current = selectedGroupRef.current + 1;
                }
            }
        }
        setSelectedGroup(selectedGroupRef.current);
        setSelectedPerson(selectedPersonRef.current);
    };

    const gotoPrevItem = () => {
        if (selectedGroupRef.current === undefined || selectedPersonRef.current === undefined) {
            selectedGroupRef.current = 0;
            selectedPersonRef.current = 0;
        } else {
            if (selectedPersonRef.current - 1 < 0) {
                if (selectedGroupRef.current - 1 < 0) {
                    selectedGroupRef.current = groupedPeople.length - 1;
                } else {
                    selectedGroupRef.current = selectedGroupRef.current - 1;
                }
                selectedPersonRef.current = groupedPeople[selectedGroupRef.current].people.length - 1;
            } else {
                selectedPersonRef.current = selectedPersonRef.current - 1;
            }
        }

        setSelectedGroup(selectedGroupRef.current);
        setSelectedPerson(selectedPersonRef.current);
    };

    const selectActive = () => {
        if (selectedPerson != null && selectedGroup != null) {
            const selected = groupedPeople[selectedGroup].people[selectedPerson];
            if (single) {
                setSelectedPeople([selected]);
            } else {
                if (selectedPeople.includes(selected)) {
                    setSelectedPeople(selectedPeople.filter(person => person.id !== selected.id));
                } else {
                    setSelectedPeople([...selectedPeople, selected]);
                }
            }
        }
    };

    const handleOnKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        event.stopPropagation();
        if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
        }

        if ((event.metaKey || event.ctrlKey) && event.key === "s") {
            handleClose();
            return;
        }

        if (event.key === "ArrowDown") {
            gotoNextItem();
        } else if (event.key === "ArrowUp") {
            gotoPrevItem();
        } else if (event.key === "Enter") {
            selectActive();
        } else if (event.key === "Escape") {
            if (event.currentTarget.value.trim().length === 0) {
                handleClose();
            } else {
                setQuery("");
                selectedGroupRef.current = undefined;
                selectedPersonRef.current = undefined;
                setSelectedGroup(undefined);
                setSelectedPerson(undefined);

                if (searchRef.current) {
                    searchRef.current.value = "";
                }
            }
        }
    };

    const handleSelect = (person: IPerson) => {
        if (single) {
            setSelectedPeople([person]);
        } else {
            if (selectedPeople.includes(person)) {
                setSelectedPeople(selectedPeople.filter(p => p.id !== person.id));
            } else {
                setSelectedPeople([...selectedPeople, person]);
            }
        }

        if (searchRef.current) {
            searchRef.current.focus();
        }
    };

    const handleRemovePerson = (personId: string) => {
        setSelectedPeople(selectedPeople.filter(person => person.id !== personId));
    };

    const handleClear = () => {
        setSelectedPeople([]);
    };

    return (
        <Dialog isOpen={open} onClose={handleClose} onClosed={handleClosed} lazy className="people-dialog"
            aria-labelledby="people-dialog"
        >
            <Row padding={10}>
                <Col>
                    <Grid gap={20}>
                        <h2 className="text-center">Select people</h2>
                        <Row padding={10}>
                            <Col justify="between" align="center" gap={5}>
                                <InputGroup
                                    fill
                                    leftElement={<Icon icon="search" />}
                                    rightElement={<HotkeyChip keys={["meta", "F"]} />}
                                    placeholder="Filter people by name, email or nickname"
                                    inputRef={searchRef}
                                    tabIndex={0}
                                    autoFocus
                                    data-test-id="people-dialog-search-input"
                                    onChange={handleSetQuery}
                                    onKeyDown={handleOnKeyDown}
                                />

                                <Popover
                                    placement="bottom-end"
                                    content={
                                        <Menu>
                                            <MenuItem
                                                text="Order asc."
                                                onClick={() => setOrderBy("asc")}
                                                labelElement={orderBy === "asc" && <Icon icon="check" />}
                                            />
                                            <MenuItem
                                                text="Order desc."
                                                onClick={() => setOrderBy("desc")}
                                                labelElement={orderBy === "desc" && <Icon icon="check" />}
                                            />
                                            <MenuDivider />
                                            <MenuItem
                                                text="Ungroupped"
                                                onClick={() => setGroupBy("ungrouped")}
                                                labelElement={
                                                    groupBy === "ungrouped" && <Icon icon="check" />
                                                }
                                            />
                                            <MenuItem
                                                text="Group by company"
                                                onClick={() => setGroupBy("company")}
                                                labelElement={groupBy === "company" && <Icon icon="check" />}
                                            />

                                            <MenuItem
                                                text="Group by role"
                                                onClick={() => setGroupBy("role")}
                                                labelElement={groupBy === "role" && <Icon icon="check" />}
                                            />
                                        </Menu>
                                    }
                                >
                                    <Button icon={<Icon icon="dots-vertical" />} tabIndex={0} />
                                </Popover>
                            </Col>
                        </Row>
                        <Scroller maxHeight={300} minHeight={300} thin>
                            <Menu tabIndex={-1} data-testid="people-dialog-assignees-menu">
                                {groupedPeople.map((group: IPeopleGroup, i: number) => {
                                    return (
                                        <React.Fragment key={i}>
                                            <MenuDivider title={group.title} />
                                            {group.people.map((person: IPerson, j: number) => {
                                                return (
                                                    <PersonItem
                                                        key={person.id}
                                                        person={person}
                                                        selected={selectedPeople.includes(person)}
                                                        active={selectedGroup === i && selectedPerson === j}
                                                        me={me === person.id}
                                                        onClick={() => handleSelect(person)}
                                                    />
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </Menu>
                        </Scroller>
                    </Grid>
                </Col>
            </Row>
            <div className={Classes.DIALOG_FOOTER}>
                <Row>
                    <Col justify="between" align="bottom">
                        {selectedPeople.length > 0 ? (
                            <TaskDetailsSection title="Selected people" vertical>
                                {selectedPeople.length > 0 && (
                                    <Row>
                                        <Col gap={10}>
                                            <Assignees
                                                assignees={selectedPeople}
                                                max={3}
                                                onRemove={handleRemovePerson}
                                                testId="people-dialog-selected-assignees"
                                            />
                                            <Button
                                                size="small"
                                                variant="minimal"
                                                intent={Intent.DANGER}
                                                tabIndex={0}
                                                onClick={handleClear}
                                                data-testid="people-dialog-clear-all-button"
                                            >
                                                {translate("Clear all")}
                                            </Button>
                                        </Col>
                                    </Row>
                                )}
                                {selectedPeople.length === 0 && (
                                    <span className={Classes.TEXT_MUTED}>Nobody</span>
                                )}
                            </TaskDetailsSection>
                        ) : (
                            <span />
                        )}

                        <Button
                            intent={Intent.PRIMARY}
                            tabIndex={0}
                            onClick={handleSave}
                            endIcon={<HotkeyChip keys={["meta", "S"]} />}
                            data-testid="people-dialog-save-button"
                            style={{ flexShrink: 0 }}
                        >
                            {translate("Save")}
                        </Button>
                    </Col>
                </Row>
            </div>
        </Dialog>
    );
};
