// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Colors,
    Dialog,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Spinner,
    Tag,
    Tooltip,
} from "@blueprintjs/core";
import classNames from "classnames";
import xor from "lodash/xor";
import { format } from "date-fns";
import Mousetrap from "mousetrap";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { SearchAPI } from "app/api";
import { Col, Grid, HotkeyChip, Icon, Row, Scroller } from "app/components/common";
import { PriorityChip } from "app/components/project";
import { useNav, useStorage } from "app/hooks";
import { APPICONS, IBookmark, ISearchResult, ITask, RECORDTYPE, TAGSECTION } from "@stacks/types";
import { scrollIntoView } from "app/utils/dom";
import { ProjectStatus, Tags, TagsWrapper } from "app/widgets";
import { AssigneesSync } from "app/widgets/people/Assignees/Assignees";

interface Counters {
    [key: string]: number;
}

interface ISearchType {
    id: string;
    title: string;
    icon: string;
}

const searchTypes: ISearchType[] = [
    { icon: APPICONS.TASK, title: "Tasks", id: "task" },
    { icon: APPICONS.PEOPLE, title: "People", id: "person" },
    { icon: APPICONS.NOTEPAD, title: "Notepads", id: "notepad" },
    { icon: APPICONS.FILE, title: "Files", id: "file" },
    { icon: APPICONS.BOOKMARK, title: "Bookmarks", id: "bookmark" },
    { icon: APPICONS.TIMEBOX, title: "Timebox", id: "timebox" },
    // { icon: APPICONS.archived, title: "Archived tasks", id: "archive" },
    // { icon: APPICONS.archived, title: "Completed tasks", id: "done" },
    // { icon: APPICONS.archived, title: "Incomplete tasks", id: "todo" },
    { icon: APPICONS.ATTACHMENT, title: "Aattachments", id: "attachment" },
    { icon: APPICONS.COMMENT, title: translate("Comments"), id: "comment" },
    // { icon: APPICONS.goal, title: "Goals", id: "goal" },
    { icon: APPICONS.PROJECT, title: "Project", id: "project" },
];

interface ISearchProps {
    onClose: () => void;
}
export const Search: FunctionComponent<ISearchProps> = ({ onClose }) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const [open, setOpen] = useState(true);
    const [type, setType] = useState<string>("all");
    const [query, setQuery] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [results, setResults] = useState<ISearchResult[]>([]);
    const [selectedIndex, setSelectedIndex] = useState<null | number>(null);
    const selectedRef = useRef<number | undefined>(undefined);
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const [subsections, setSubsections] = useStorage<string[]>("search-subsections", true, [
        "incomplete-tasks",
    ]);
    const location = useLocation();
    const navigate = useNavigate();
    const nav = useNav();

    const focus = () => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    const search = async () => {
        const searchResults = await SearchAPI.search(query);

        setResults(searchResults);
        setIsLoading(false);
    };

    useEffect(() => {
        // focus the search input
        Mousetrap.bind(["up", "down"], () => {
            if (inputRef.current) inputRef.current.focus();
        });

        return () => {
            Mousetrap.unbind(["up", "down"]);
        };
    }, []);

    useEffect(() => {
        focus();
    }, [inputRef.current]);

    useEffect(() => {
        setResults([]);
        if (query.trim().length >= 2) {
            setIsLoading(true);

            if (debounce.current) {
                clearTimeout(debounce.current);
                debounce.current = null;
            }

            debounce.current = setTimeout(search, 500);
        } else {
            if (results.length > 0) setResults([]);
        }
    }, [query]);

    // scroll menu when activating a menu item
    useEffect(() => {
        if (selectedIndex != null) {
            const filteredResult = filteredResults[selectedIndex];

            if (filteredResult != null) {
                const personMenuItem = document.getElementById(`search-result-${filteredResult.id}`);
                scrollIntoView(personMenuItem, { behavior: "smooth", block: "center" });
            }
        }
    }, [selectedIndex]);

    const filteredResults = useMemo(() => {
        return results.filter(result => {
            if (result.type === RECORDTYPE.TASK) {
                if (subsections.includes("archived-tasks") && Boolean((result.data as ITask).archived))
                    return true;
                if (
                    subsections.includes("completed-tasks") &&
                    (result.data as ITask).done &&
                    !Boolean((result.data as ITask).archived)
                )
                    return true;
                if (
                    subsections.includes("incomplete-tasks") &&
                    !(result.data as ITask).done &&
                    !Boolean((result.data as ITask).archived)
                )
                    return true;
                return false;
            } else if (result.type === RECORDTYPE.COMMENT) {
                return subsections.includes("comments");
            } else if (result.type === RECORDTYPE.ATTACHMENT) {
                return subsections.includes("attachments");
            }

            return true;
        });
    }, [results, type, subsections]);

    const counters: Counters = useMemo(() => {
        const counters: Counters = {};

        for (const result of filteredResults) {
            let type = result.type;
            if (type === RECORDTYPE.ARCHIVED) {
                type = RECORDTYPE.TASK;
            }

            if (counters[type] == null) {
                counters[type] = 1;
            } else {
                counters[type]++;
            }
        }

        return counters;
    }, [filteredResults]);

    const resultsByType = useMemo(() => {
        if (type === "all") return filteredResults;
        return filteredResults.filter(result => {
            return result.type === type;
        });
    }, [filteredResults, type]);

    const handleQueryChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(event.currentTarget.value);
    };

    const gotoNextItem = () => {
        if (selectedRef.current == null) {
            selectedRef.current = 0;
        } else {
            selectedRef.current =
                selectedRef.current + 1 < filteredResults.length ? selectedRef.current + 1 : 0;
        }

        setSelectedIndex(selectedRef.current);
    };

    const gotoPrevItem = () => {
        if (selectedRef.current == null) {
            selectedRef.current = 0;
        } else {
            selectedRef.current =
                selectedRef.current - 1 < 0 ? filteredResults.length - 1 : selectedRef.current - 1;
        }

        setSelectedIndex(selectedRef.current);
    };

    const selectActive = () => {
        if (selectedIndex != null) {
            handleOpen(filteredResults[selectedIndex]);
        }
    };

    const handleClose = () => {
        setOpen(false);
    };

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
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
                handleClose();
            } else {
                setQuery("");
                selectedRef.current = undefined;
                setSelectedIndex(null);
            }
        }
    };

    const handleOpen = (item: ISearchResult) => {
        handleClose();

        if (["archived", "person", "comment"].includes(item.type)) {
            let url = `/${item.type}/${item.id}`;
            if (item.type === "comment") {
                url = `/${item.parentType}/${item.parentId}`;
            }

            nav(url, {
                state: {
                    backgroundLocation: location,
                },
            });
        } else if (["task"].includes(item.type)) {
            if (item.parentId === "inbox") {
                nav(`/inbox/${item.id}`);
            } else {
                nav(`/project/${item.parentId}/${item.id}`);
            }
        } else if (item.type === "bookmark") {
            const bookmarkData: IBookmark = item.data as IBookmark;

            if (bookmarkData.type === "url") {
                window.open(item.url, "_blank");
            } else {
                nav(item.url, {
                    state: {
                        backgroundLocation: location,
                    },
                });
            }
        } else if (item.type === "timebox") {
            nav(`/timebox/${item.parentId}`);
        } else {
            navigate(`/${item.type}/${item.id}`);
        }
    };

    const toggleFilter = (searchType: string) => {
        setType(searchType);
        selectedRef.current = undefined;
        setSelectedIndex(null);
    };

    const handleToggleSubsection = (subsection: string) => {
        setSubsections(xor(subsections, [subsection]));
    };

    return (
        <Dialog
            isOpen={open}
            onClose={handleClose}
            onClosed={onClose}
            className="search-dialog"
            portalClassName="search-dialog-portal"
            lazy
            aria-labelledby="search-dialog"
        >
            <div id="search">
                <div className="input-wrapper">
                    {!isLoading && <Icon icon="search" size={28} />}
                    {isLoading && <Spinner size={28} />}
                    <input
                        ref={inputRef}
                        autoFocus
                        placeholder={`${translate("Search something")}...`}
                        type="text"
                        value={query}
                        onChange={handleQueryChange}
                        onKeyDown={handleKeyDown}
                    />
                </div>

                {query.length > 1 && !isLoading ? (
                    <div className="search-types">
                        <small className={Classes.TEXT_DISABLED}>{translate("I m searching for")}</small>

                        <TagsWrapper gap={5}>
                            <Tag
                                minimal
                                round
                                interactive
                                intent={type === "all" ? Intent.PRIMARY : Intent.NONE}
                                rightIcon={<HotkeyChip keys={[filteredResults.length]} small />}
                                onClick={type === "all" ? undefined : () => toggleFilter("all")}
                            >
                                {translate("Everything")}
                            </Tag>
                            {searchTypes
                                .filter(t => counters[t.id] > 0)
                                .map(t => {
                                    return (
                                        <Tag
                                            key={t.id}
                                            minimal
                                            round
                                            interactive
                                            icon={<Icon icon={t.icon} size={12} />}
                                            rightIcon={
                                                counters[t.id] ? (
                                                    <HotkeyChip keys={[counters[t.id]]} small />
                                                ) : null
                                            }
                                            intent={type === t.id ? Intent.PRIMARY : Intent.NONE}
                                            onClick={type === t.id ? undefined : () => toggleFilter(t.id)}
                                        >
                                            {t.title}
                                        </Tag>
                                    );
                                })}

                            <Popover
                                placement="bottom-end"
                                content={
                                    <Menu>
                                        <MenuDivider title={translate("Tasks")} />
                                        <MenuItem
                                            text={translate("Archived tasks")}
                                            icon={<Icon icon={APPICONS.ARCHIVED} />}
                                            labelElement={
                                                subsections.includes("archived-tasks") ? (
                                                    <Icon icon="check" />
                                                ) : null
                                            }
                                            shouldDismissPopover={false}
                                            onClick={() => handleToggleSubsection("archived-tasks")}
                                        />
                                        <MenuItem
                                            text={translate("Completed tasks")}
                                            icon={<Icon icon="check-circle" />}
                                            labelElement={
                                                subsections.includes("completed-tasks") ? (
                                                    <Icon icon="check" />
                                                ) : null
                                            }
                                            shouldDismissPopover={false}
                                            onClick={() => handleToggleSubsection("completed-tasks")}
                                        />
                                        <MenuItem
                                            text={translate("Incomplete tasks")}
                                            icon={<Icon icon="circle" />}
                                            labelElement={
                                                subsections.includes("incomplete-tasks") ? (
                                                    <Icon icon="check" />
                                                ) : null
                                            }
                                            shouldDismissPopover={false}
                                            onClick={() => handleToggleSubsection("incomplete-tasks")}
                                        />
                                    </Menu>
                                }
                            >
                                <Tag
                                    minimal
                                    round
                                    interactive
                                    icon={<Icon icon="settings-02" size={12} />}
                                    style={{ padding: "2px 4px" }}
                                />
                            </Popover>
                        </TagsWrapper>
                    </div>
                ) : null}

                {filteredResults.length > 0 && query.length > 0 && !isLoading ? (
                    <>
                        <Scroller className="search-results" thin vertical shadows>
                            {resultsByType.length ? (
                                resultsByType.map((result: ISearchResult, index: number) => {
                                    if (
                                        result.type === RECORDTYPE.TASK ||
                                        result.type === RECORDTYPE.ARCHIVED
                                    ) {
                                        return (
                                            <TaskSearchResult
                                                key={result.id}
                                                item={result}
                                                isActive={index === selectedIndex}
                                                onOpen={handleOpen}
                                            />
                                        );
                                    } else if (result.type === RECORDTYPE.TIMEBOX) {
                                        return (
                                            <TimeboxSearchResult
                                                key={result.id}
                                                item={result}
                                                isActive={index === selectedIndex}
                                                onOpen={handleOpen}
                                            />
                                        );
                                    }

                                    return (
                                        <GenericSearchResult
                                            key={result.id}
                                            item={result}
                                            isActive={index === selectedIndex}
                                            onOpen={handleOpen}
                                        />
                                    );
                                })
                            ) : (
                                <Grid gap={0} padding={60} className="vertical">
                                    <Row>
                                        <Col justify="center">
                                            <div
                                                className={classNames(
                                                    Classes.TEXT_DISABLED,
                                                    Classes.TEXT_LARGE
                                                )}
                                            >
                                                {translate("No search results")}
                                            </div>
                                        </Col>
                                    </Row>
                                </Grid>
                            )}
                        </Scroller>
                        <div className="search-footer">
                            <div>
                                <HotkeyChip keys={["up"]} light />
                                <HotkeyChip keys={["down"]} light />{" "}
                                <span className={Classes.TEXT_MUTED}>{translate("Move")}</span>
                            </div>
                            <div>
                                <HotkeyChip keys={["enter"]} light />{" "}
                                <span className={Classes.TEXT_MUTED}>{translate("Open")}</span>
                            </div>
                            <div>
                                <HotkeyChip keys={["esc"]} light />{" "}
                                <span className={Classes.TEXT_MUTED}>{translate("Clear")}</span>
                            </div>
                        </div>
                    </>
                ) : null}

                {filteredResults.length === 0 && query.length > 1 && !isLoading && (
                    <Grid gap={0} paddingTop={60} paddingBottom={100} className="vertical">
                        <Row>
                            <Col justify="center">
                                <div className={classNames(Classes.TEXT_DISABLED, Classes.TEXT_LARGE)}>
                                    {translate("No search results")}
                                </div>
                            </Col>
                        </Row>
                    </Grid>
                )}
            </div>
        </Dialog>
    );
};

interface ISearchResultItemProps {
    id: string;
    active?: boolean;
    title: string;
    subtitle?: string;
    parent: string;
    icon: string;
    iconColor?: string;
    iconTooltip?: string;
    thumbnail?: string;
    inLabel?: string;
    children?: React.ReactNode;
    onOpen: () => void;
}
const SearchResultItem: FunctionComponent<ISearchResultItemProps> = ({
    id,
    active,
    title,
    subtitle,
    parent,
    icon,
    iconColor,
    iconTooltip,
    thumbnail,
    inLabel,
    children,
    onOpen,
}) => {
    return (
        <div
            className={classNames("search-results-item", {
                active,
            })}
            id={`search-result-${id}`}
            onClick={onOpen}
        >
            <Tooltip
                content={iconTooltip}
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                renderTarget={({ isOpen, ...tooltipProps }) => (
                    <div {...tooltipProps} className="search-result-icon">
                        {thumbnail && <img src={thumbnail} />}
                        {!thumbnail && (
                            <Button variant="minimal" icon={<Icon icon={icon} color={iconColor} />} />
                        )}
                    </div>
                )}
                placement="top"
            />
            <div className="search-result-content">
                <div className="search-result-title">{title}</div>
                {subtitle && subtitle.length && <div className="search-result-subtitle">{subtitle}</div>}
                {children && <div className="search-result-children">{children}</div>}
                {parent ? (
                    <div className="search-result-parent">
                        {inLabel ?? translate("in")} <b>{parent}</b>
                    </div>
                ) : null}
            </div>
        </div>
    );
};

interface IGenericSearchResultProps {
    item: ISearchResult;
    isActive?: boolean;
    onOpen: (item: ISearchResult) => void;
}
const GenericSearchResult: FunctionComponent<IGenericSearchResultProps> = ({ item, isActive, onOpen }) => {
    return (
        <SearchResultItem
            id={item.id}
            title={item.title}
            subtitle={item.subtitle}
            active={isActive}
            parent={item.parentTitle}
            icon={APPICONS[item.type.toUpperCase() as unknown as keyof typeof APPICONS]}
            thumbnail={item.thumbnail}
            onOpen={() => onOpen(item)}
        />
    );
};

const TaskSearchResult: FunctionComponent<IGenericSearchResultProps> = ({ item, isActive, onOpen }) => {
    const isArchived = useMemo(() => {
        const task = item.data as ITask;
        if (!task) return false;
        return Boolean(task.archived);
    }, [item.data]);

    const icon = useMemo(() => {
        const task = item.data as ITask;
        if (task) {
            if (task.done) return "check-circle-filled";
        }

        return APPICONS[item.type.toUpperCase() as unknown as keyof typeof APPICONS];
    }, [item.data]);

    const color = useMemo(() => {
        const task = item.data as ITask;
        if (task) {
            if (task.done && !isArchived) return Colors.GREEN3;
            if (isArchived) return Colors.BLUE3;
        }

        return undefined;
    }, [item]);

    const tooltip = useMemo(() => {
        const task = item.data as ITask;
        if (task) {
            if (task.done && !isArchived) return "This task is completed";
            if (isArchived) return "This task is archived";
        }

        return "This task is not completed";
    }, [item]);

    const children = useMemo(() => {
        const task = item.data as ITask;
        if (task) {
            return (
                <>
                    {task.assignees && <AssigneesSync assignees={task.assignees} small max={3} />}
                    {task.tags && (
                        <TagsWrapper>
                            <Tags value={task.tags} max={3} section={TAGSECTION.PROJECTS} />
                        </TagsWrapper>
                    )}
                    {task.status && <ProjectStatus status={task.status} />}
                    {task.priority && <PriorityChip priority={task.priority} />}
                </>
            );
        }

        return null;
    }, [item.data]);

    return (
        <SearchResultItem
            id={item.id}
            title={item.title}
            subtitle={item.subtitle}
            active={isActive}
            parent={item.parentTitle}
            icon={icon}
            iconColor={color}
            iconTooltip={tooltip}
            thumbnail={item.thumbnail}
            inLabel={isArchived ? "archived in" : undefined}
            onOpen={() => onOpen(item)}
        >
            {children}
        </SearchResultItem>
    );
};

const TimeboxSearchResult: FunctionComponent<IGenericSearchResultProps> = ({ item, isActive, onOpen }) => {
    const children = useMemo(() => {
        const task = item.data as ITask;
        if (task) {
            return (
                <>
                    {task.assignees && <AssigneesSync assignees={task.assignees} small max={3} />}
                    {task.tags && (
                        <TagsWrapper>
                            <Tags value={task.tags} max={3} section={TAGSECTION.PROJECTS} />
                        </TagsWrapper>
                    )}
                    {task.status && <ProjectStatus status={task.status} />}
                    {task.priority && <PriorityChip priority={task.priority} />}
                </>
            );
        }

        return null;
    }, [item.data]);

    return (
        <SearchResultItem
            id={item.id}
            title={item.title}
            subtitle={item.subtitle}
            active={isActive}
            parent={format(new Date(item.parentTitle), "PPPP")}
            icon={APPICONS.TIMEBOX}
            thumbnail={item.thumbnail}
            inLabel="on"
            onOpen={() => onOpen(item)}
        >
            {children}
        </SearchResultItem>
    );
};
