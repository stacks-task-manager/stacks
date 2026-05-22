// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Card, Classes, Menu, MenuItem } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import classNames from "classnames";
import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { APPICONS, RECORDTYPE, TreeNode, defaultHome } from "@stacks/types";
import { Avatar, BlankSlate, Col, Grid, Icon, Link, Row } from "app/components/common";
import { getDocument, useMe, useStorage } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { HomeActions } from "app/store/actions";
import { BookmarksStore } from "app/store/bookmarks";
import { HomeStore } from "app/store/home";
import { PeopleStore } from "app/store/people";
import { RecordsStore } from "app/store/records";
import { isLight } from "app/utils/colors";
import Storage from "app/utils/storage";
import {
    AppView,
    AppViewContent,
    Editor,
    HomeBackground,
    HomeCustomizer,
    HomeMyTasks,
    TagsWrapper,
    TipTapEditorContent,
    TodoList,
} from "app/widgets";
import { format } from "date-fns";
export const Home = () => {
    const me = useMe();
    const [home, setHome] = useStorage("home", true, defaultHome);
    const [showCustomizer, setShowCustomizer] = useState(false);

    const greeting = useMemo(() => {
        const time = new Date().getHours();
        if (time < 12) return translate("Good morning");
        if (time >= 12 && time <= 18) return translate("Good afternoon");
        if (time >= 18 && time < 23) return translate("Good evening");
        if (time >= 22) return translate("Good night");
        return translate("Hey there");
    }, []);

    useEffect(() => {
        if (home.widgets == null) {
            setHome({ ...home, widgets: defaultHome.widgets });
        }
    }, [home]);

    useEffect(() => {
        HomeActions.load();
    }, []);

    return (
        <AppView
            prepend={
                <>
                    {showCustomizer ? (
                        <HomeCustomizer
                            value={home}
                            onChange={setHome}
                            onClose={() => setShowCustomizer(false)}
                        />
                    ) : null}
                    <HomeBackground pattern={home.backgroundPattern} color={home.backgroundColor} />
                </>
            }
            appViewProps={{
                id: "home",
                className: classNames({
                    darkBackground: !isLight(home.backgroundColor),
                    hasPattern: home.backgroundPattern != null,
                }),
            }}
        >
            <AppViewContent transparent padded relative>
                <Button
                    minimal
                    small
                    style={{ position: "absolute", top: 10, right: 20 }}
                    icon={<Icon icon="palette" />}
                    className="home-customize-button"
                    onClick={() => setShowCustomizer(true)}
                >
                    {translate("Customize")}
                </Button>

                <Grid padding={50} gap={50}>
                    <div className="text-center">
                        <h5 className={classNames("home-title", Classes.HEADING)}>
                            {format(new Date(), "PPPP")}
                        </h5>
                        <h2 className={classNames("home-title", Classes.HEADING)}>
                            {greeting}
                            {me ? `, ${me.firstName}` : ""}
                        </h2>
                    </div>

                    <Row gutter={20}>
                        <Col width="65%" gap={20} vertical unshrinkable>
                            {(home.widgets ?? []).includes("myTasks") ? <HomeMyTasks /> : null}

                            {(home.widgets ?? []).includes("todos") ? <TodoList /> : null}

                            {(home.widgets ?? []).includes("notes") ? <HomePrivateNotes /> : null}
                        </Col>
                        <Col gap={20} vertical>
                            {(home.widgets ?? []).includes("favoriteProjects") ? <FavoriteProjects /> : null}
                            {(home.widgets ?? []).includes("favoritePeopleCompanies") ? (
                                <FavoritePeople />
                            ) : null}
                            {(home.widgets ?? []).includes("pinnedBookmarks") ? <PinnedBookmarks /> : null}
                        </Col>
                    </Row>
                </Grid>
            </AppViewContent>
        </AppView>
    );
};

const HomePrivateNotes = () => {
    const loading = HomeStore.use(state => state.isLoading);
    if (loading) return null;

    const handleUpdateNotes = (content: TipTapEditorContent) => {
        HomeActions.setNotes(content.html);
    };

    return (
        <Grid gap={0}>
            <h5 className={classNames("home-title", Classes.HEADING)}>{translate("Private notes")}</h5>
            <Card>
                <Editor
                    value={HomeStore.get().notes}
                    onUpdate={handleUpdateNotes}
                    placeholder="Write your private notes here..."
                />
            </Card>
        </Grid>
    );
};

const FavoriteProjects = () => {
    const { documents } = RecordsStore.use();
    const [projects, setProjects] = useState<TreeNode[]>([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (!documents.length) return;
        const favoriteProjects: string[] = Storage.get<string[]>("favoriteProjects", true, []);

        const filteredProjects: TreeNode[] = [];
        for (const projectId of favoriteProjects) {
            const document = getDocument(projectId);
            if (document != null) {
                filteredProjects.push(document);
            }
        }

        setProjects(filteredProjects);
    }, [documents]);

    return (
        <Grid gap={0}>
            <h5 className={classNames("home-title", Classes.HEADING)}>{translate("Favorite projects")}</h5>

            {projects.length === 0 && (
                <Card>
                    <BlankSlate
                        icon="check-circle"
                        title={translate("No projects")}
                        description={translate("You don t have any favorite projects yet")}
                    />
                </Card>
            )}

            {projects.length > 0 && (
                <Menu className={Classes.ELEVATION_0}>
                    {projects.map(project => (
                        <MenuItem
                            key={project.id}
                            text={project.text}
                            icon={<Icon icon="check-circle-broken" />}
                            onClick={() => navigate(`/project/${project.id}`)}
                        />
                    ))}
                </Menu>
            )}
        </Grid>
    );
};

const PinnedBookmarks = () => {
    const { bookmarks } = BookmarksStore.use();

    const pinnedBookmarks = useMemo(() => {
        return bookmarks.filter(bookmark => bookmark.pinned);
    }, [bookmarks]);

    return (
        <Grid gap={0}>
            <h5 className={classNames("home-title", Classes.HEADING)}>{translate("Pinned bookmarks")}</h5>

            <div className="bookmarks" style={{ height: "100%" }}>
                {pinnedBookmarks.length === 0 && (
                    <Card>
                        <BlankSlate
                            icon="bookmark"
                            title="No bookmarks"
                            description={<div>You haven&apos;t pinned any bookmarks yet.</div>}
                        />
                    </Card>
                )}

                {pinnedBookmarks.length > 0 && (
                    <Card style={{ padding: 0 }}>
                        <ul className={Classes.MENU} style={{ margin: 1 }}>
                            {pinnedBookmarks.map(bookmark => {
                                return (
                                    <li key={bookmark.id}>
                                        <div className={classNames(Classes.MENU_ITEM, "bookmark")}>
                                            <span className={Classes.MENU_ITEM_ICON}>
                                                <Icon
                                                    icon={
                                                        APPICONS[
                                                        bookmark.type.toUpperCase() as unknown as keyof typeof APPICONS
                                                        ]
                                                    }
                                                />
                                            </span>
                                            <div className="bookmark-wrapper">
                                                <Link
                                                    type={bookmark.type}
                                                    id={bookmark.resourceId}
                                                    url={
                                                        bookmark.type === RECORDTYPE.URL
                                                            ? bookmark.url
                                                            : undefined
                                                    }
                                                >
                                                    <div className="bookmark-title">{bookmark.title}</div>
                                                    {bookmark.type === RECORDTYPE.URL && (
                                                        <small className={Classes.TEXT_MUTED}>
                                                            {bookmark.url}
                                                        </small>
                                                    )}
                                                </Link>
                                            </div>
                                        </div>
                                    </li>
                                );
                            })}
                        </ul>
                    </Card>
                )}
            </div>
        </Grid>
    );
};

const FavoritePeople = () => {
    const { favoritePeople, favoriteCompanies } = PeopleStore.use(
        state => ({ favoritePeople: state.favoritePeople, favoriteCompanies: state.favoriteCompanies }),
        shallowEqual
    );
    const navigate = useNavigate();
    const location = useLocation();

    const people = useMemo(() => {
        return PeopleStore.get().people.filter(person => favoritePeople.includes(person.id));
    }, [favoritePeople]);

    const companies = useMemo(() => {
        return PeopleStore.get().companies.filter(company => favoriteCompanies.includes(company.id));
    }, [favoritePeople]);

    const handleOpenProfile = (personId: string) => {
        navigate(`/person/${personId}`, {
            state: { backgroundLocation: location },
        });
    };

    const handleOpenCompany = (companyId: string) => {
        navigate(`/company/${companyId}`, {
            state: { backgroundLocation: location },
        });
    };

    if (!people.length && !companies.length) {
        return (
            <Grid gap={0}>
                <h5 className={classNames("home-title", Classes.HEADING)}>
                    {translate("Favorite people companies")}
                </h5>
                <Card>
                    <BlankSlate
                        icon="users"
                        title="No favorite people"
                        description={<div>You don&apos;t have any favorite people or companies yet.</div>}
                    />
                </Card>
            </Grid>
        );
    }

    return (
        <Grid gap={0}>
            <h5 className={classNames("home-title", Classes.HEADING)}>
                {translate("Favorite people companies")}
            </h5>
            <Card>
                {people.length > 0 ? (
                    <TagsWrapper gap={10}>
                        {people.map(person => (
                            <Avatar
                                person={person}
                                key={person.id}
                                showTooltip
                                large
                                onClick={() => handleOpenProfile(person.id)}
                            />
                        ))}
                    </TagsWrapper>
                ) : null}

                {companies.length > 0 ? (
                    <Menu
                        style={{
                            marginTop: 20,
                            marginLeft: "-10px",
                            marginRight: "-10px",
                            marginBottom: "-10px",
                        }}
                    >
                        {companies.map(company => (
                            <MenuItem
                                text={company.title}
                                key={company.id}
                                icon={
                                    <>
                                        {company.logo ? (
                                            <img
                                                src={company.logo}
                                                style={{ width: 16, mixBlendMode: "multiply" }}
                                            />
                                        ) : (
                                            <Icon icon="building-07" />
                                        )}
                                    </>
                                }
                                onClick={() => handleOpenCompany(company.id)}
                            />
                        ))}
                    </Menu>
                ) : null}
            </Card>
        </Grid>
    );
};
