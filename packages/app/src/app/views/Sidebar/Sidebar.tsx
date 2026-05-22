// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { HotkeysProvider, Menu, MenuDivider, MenuItem, Popover } from "@blueprintjs/core";
import { DropOptions, NodeModel, Tree, TreeMethods } from "@minoru/react-dnd-treeview";
import { translate } from "@stacks/translations";
import { SIDEBAR_MENU_LABELS } from "app/locale/dynamic-messages";
import classnames from "classnames";
import Mousetrap from "mousetrap";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { useLocation, useNavigate } from "react-router-dom";

import { ROLE_SECTIONS, SIDEBARICON, SIDEBARITEMS, TreeNode } from "@stacks/types";
import { Body, Content, Footer } from "app/components";
import { BlankSlate, Icon, Scroller } from "app/components/common";
import { TimeTracker } from "app/components/project";
import { canRead, publish, useDocuments, usePreferences } from "app/hooks";
import { shallowEqual, strictEqual } from "app/hooks/store";
import { BookmarksActions, RecordActions } from "app/store/actions";
import { RecentsActions } from "app/store/actions/recents";
import { GlobalStore, togglePreferences, toggleSidebar } from "app/store/global";
import { RecordsStore } from "app/store/records";
import { ISidebarStore, setOpenFolders, setUnselectAll, SidebarStore } from "app/store/sidebar";
import {
    BookmarksButton,
    CalendarButton,
    Document,
    DocumentsAdder,
    Folder,
    HomeButton,
    InboxButton,
    JumpToButton,
    JumpToMenu,
    MyTasksButton,
    PeopleButton,
    ReportsButton,
    SidebarButton,
    SidebarButtonSkelton,
    SidebarDivider,
} from "app/widgets";

const SidebarToggle = () => {
    const { isSidebarVisible } = GlobalStore.use();
    return (
        <button
            className="toggle-sidebar"
            onClick={() => toggleSidebar()}
            data-testid="toggle-sidebar-button"
        >
            <Icon icon={isSidebarVisible ? "chevron-left" : "chevron-right"} />
        </button>
    );
};

const SidebarBody = () => {
    const treeMethods = useRef<TreeMethods | null>(null);
    const { hideGeneral } = usePreferences(["hideGeneral"]);
    const { isLoading, documents } = useDocuments();
    const dragRef = useRef<null | string>(null);

    const handleUnselectAll = () => {
        setUnselectAll();
    };

    const openedFolders: (string | number)[] = SidebarStore.use(
        (state: ISidebarStore) => state.openedFolders,
        shallowEqual
    );

    if (isLoading) {
        return (
            <Body noPadding flexed>
                <SidebarButtonSkelton />
                <SidebarButtonSkelton />
                <SidebarButtonSkelton />
                <SidebarButtonSkelton />
                <SidebarButtonSkelton />
            </Body>
        );
    }

    const handleDragStart = (node: NodeModel) => {
        dragRef.current = `${node.id}`;
    };

    const handleDrop = (_newDocuments: NodeModel[], options: DropOptions) => {
        if (!dragRef.current) return;
        if (options.destinationIndex == null) return;
        RecordActions.setDocuments(dragRef.current, `${options.dropTargetId}`, options.destinationIndex);
    };

    return (
        <Body noPadding flexed onClick={handleUnselectAll} data-testid="sidebar-body">
            <Scroller thin vertical>
                <SidebarMenu />
                <HotkeysProvider>
                    <DocumentsAdder treeMethods={treeMethods.current} padded={!hideGeneral} />
                </HotkeysProvider>

                {documents.length === 0 && (
                    <div className="no-documents">
                        <BlankSlate icon="folder" description={translate("No documents")} small />
                    </div>
                )}

                <div data-testid="documents-tree">
                    <Tree
                        tree={documents}
                        ref={treeMethods}
                        rootId="00000000-0000-0000-0000-000000000000"
                        onDrop={handleDrop}
                        onDragStart={handleDragStart}
                        onChangeOpen={setOpenFolders}
                        initialOpen={openedFolders}
                        classes={{
                            root: "tree",
                        }}
                        insertDroppableFirst={false}
                        sort={false}
                        render={(node: NodeModel, { depth, isOpen, onToggle }) => {
                            if (node.droppable)
                                return (
                                    <Folder
                                        folder={node as TreeNode}
                                        isOpen={isOpen}
                                        onClick={onToggle}
                                        depth={depth}
                                    />
                                );
                            return <Document record={node as TreeNode} depth={depth} />;
                        }}
                        canDrop={(_tree, { dragSource, dropTargetId }) => {
                            if (dragSource?.parent === dropTargetId) return true;
                        }}
                        dropTargetOffset={10}
                        placeholderRender={(_node, { depth }) => (
                            <div
                                className="tree-placeholder"
                                style={{
                                    marginLeft: 10 * (depth + 1),
                                }}
                            />
                        )}
                    />
                </div>
            </Scroller>
        </Body>
    );
};

const SidebarFooter = () => {
    const timers = RecordsStore.use(state => state.timers, shallowEqual);
    return (
        <Footer>
            {Object.keys(timers).map(taskId => (
                <TimeTracker key={taskId} taskId={taskId} detailed />
            ))}
        </Footer>
    );
};

const SidebarPure = () => {
    const isSidebarVisible = GlobalStore.use(state => state.isSidebarVisible, strictEqual);
    const [sidebar, setSidebar] = useState<HTMLDivElement | null>(null);

    useEffect(() => {
        BookmarksActions.load();
        // CalendarActions.loadTodaysCount();
    }, []);

    // if (!currentWorkspace) {
    //     return (
    //         <div
    //             className={classnames("sidebar", {
    //                 closed: !isSidebarVisible,
    //             })}
    //             id="sidebar"
    //         >
    //             <SidebarToggle />
    //             <Content>
    //                 <Body noPadding flexed>
    //                     <div className="no-documents">
    //                         <BlankSlate icon="folder" description="No workspace selected" small />
    //                     </div>
    //                 </Body>
    //             </Content>
    //         </div>
    //     );
    // }

    return (
        <div
            className={classnames("sidebar", {
                closed: !isSidebarVisible,
            })}
            data-testid="sidebar"
            ref={setSidebar}
        >
            <SidebarToggle />
            <Content>
                {/* <SidebarToolbar /> */}
                {sidebar && (
                    <DndProvider backend={HTML5Backend} options={{ rootElement: sidebar }}>
                        <SidebarBody />
                    </DndProvider>
                )}
                <SidebarFooter />
            </Content>
        </div>
    );
};

export const Sidebar = React.memo(SidebarPure);

interface ISidebarItems {
    [key: string]: {
        icon: string;
        component: React.ReactElement;
    };
}
const SidebarItems: ISidebarItems = Object.freeze({
    home: {
        icon: SIDEBARICON.home,
        component: <HomeButton />,
    },
    inbox: {
        icon: SIDEBARICON.inbox,
        component: <InboxButton />,
    },
    people: {
        icon: SIDEBARICON.people,
        component: <PeopleButton />,
    },
    bookmarks: {
        icon: SIDEBARICON.bookmarks,
        component: <BookmarksButton />,
    },
    jumpto: {
        icon: SIDEBARICON.jumpto,
        component: <JumpToButton />,
    },
    calendar: {
        icon: SIDEBARICON.calendar,
        component: <CalendarButton />,
    },
    mytasks: {
        icon: SIDEBARICON.mytasks,
        component: <MyTasksButton />,
    },
    reports: {
        icon: SIDEBARICON.reports,
        component: <ReportsButton />,
    },
});

// Centralized permission mapping for sidebar items
const SIDEBAR_PERMISSIONS: Partial<Record<string, ROLE_SECTIONS>> = {
    reports: ROLE_SECTIONS.REPORTS,
    people: ROLE_SECTIONS.PEOPLE,
    calendar: ROLE_SECTIONS.CALENDAR,
} as const;

// Helper function to check if a sidebar item requires permission and if user has access
const hasPermissionForSidebarItem = (key: string): boolean => {
    const requiredSection = SIDEBAR_PERMISSIONS[key];
    if (!requiredSection) {
        // No permission required for this item
        return true;
    }
    return canRead(requiredSection);
};

const SidebarMenu = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { pinnedItems, hideGeneral } = usePreferences(["pinnedItems", "hideGeneral"]);

    useEffect(() => {
        // home
        Mousetrap.bind("meta+alt+h", () => {
            navigate("/home");
            RecentsActions.add({
                title: translate("Home"),
                icon: SIDEBARICON.home,
                url: "/home",
            });
        });
        // people
        Mousetrap.bind("meta+alt+p", () => {
            navigate("/people");
            RecentsActions.add({
                title: translate("People"),
                icon: SIDEBARICON.people,
                url: "/people",
            });
        });
        // calendar
        Mousetrap.bind("meta+alt+c", () => {
            navigate("/calendar");
            RecentsActions.add({
                title: translate("Calendar"),
                icon: SIDEBARICON.calendar,
                url: "/calendar",
            });
        });
        // my tasks
        Mousetrap.bind("meta+alt+t", () => {
            navigate("/mytasks");
            RecentsActions.add({
                title: translate("My tasks"),
                icon: SIDEBARICON.mytasks,
                url: "/mytasks",
            });
        });
        // reports
        Mousetrap.bind("meta+alt+r", () => {
            navigate("/reports");
            RecentsActions.add({
                title: translate("Reports"),
                icon: SIDEBARICON.reports,
                url: "/reports",
            });
        });
        // bookmarks
        Mousetrap.bind("meta+alt+b", () => {
            navigate("/bookmarks");
            RecentsActions.add({
                title: translate("Bookmarks"),
                icon: SIDEBARICON.bookmarks,
                url: "/bookmarks",
            });
        });
        // inbox
        Mousetrap.bind("meta+alt+i", () => {
            navigate("/inbox");
            RecentsActions.add({
                title: translate("Inbox"),
                icon: SIDEBARICON.inbox,
                url: "/inbox",
            });
        });

        return () => {
            Mousetrap.unbind("meta+alt+h");
            Mousetrap.unbind("meta+alt+p");
            Mousetrap.unbind("meta+alt+c");
            Mousetrap.unbind("meta+alt+t");
            Mousetrap.unbind("meta+alt+r");
            Mousetrap.unbind("meta+alt+a");
            Mousetrap.unbind("meta+alt+b");
            Mousetrap.unbind("meta+alt+i");
        };
    }, []);

    const unpinned = useMemo(
        () => Object.keys(SidebarItems).filter(key => !pinnedItems?.includes(key as SIDEBARITEMS)),
        [pinnedItems]
    );

    if (hideGeneral) return null;

    const handleGotoPage = (key: string) => {
        navigate(`/${key}`);
        RecentsActions.add({
            title: SIDEBAR_MENU_LABELS[key],
            icon: SidebarItems[key].icon,
            url: `/${key}`,
        });
    };

    const handleOpenPreferences = () => {
        togglePreferences();
        setTimeout(() => {
            publish("preferences:tab", "sidebar");
        }, 200);
    };

    return (
        <>
            <SidebarDivider title={translate("General")} />
            <div data-testid="sidebar-pinned-items">
                {pinnedItems &&
                    pinnedItems
                        .filter(key => hasPermissionForSidebarItem(key))
                        .map(
                            (key: string) =>
                                SidebarItems[key] && (
                                    <React.Fragment key={key}>{SidebarItems[key].component}</React.Fragment>
                                )
                        )}
            </div>

            {unpinned && unpinned.length > 0 && (
                <Popover
                    content={
                        <Menu data-testid="more-menu">
                            {unpinned.map(key => {
                                if (key === "jumpto") {
                                    return (
                                        <MenuItem
                                            key={key}
                                            text={SIDEBAR_MENU_LABELS[key] ?? key}
                                            icon={<Icon icon={SidebarItems[key].icon} />}
                                        >
                                            <JumpToMenu />
                                        </MenuItem>
                                    );
                                }

                                if (!hasPermissionForSidebarItem(key)) {
                                    return null;
                                }

                                return (
                                    <MenuItem
                                        key={key}
                                        text={SIDEBAR_MENU_LABELS[key] ?? key}
                                        icon={<Icon icon={SidebarItems[key].icon} />}
                                        active={location.pathname === `/${key}`}
                                        onClick={() => handleGotoPage(key)}
                                        data-testid={`${key}-menuitem`}
                                    />
                                );
                            })}
                            <MenuDivider />
                            <MenuItem
                                text="Manage pinned items..."
                                icon={<Icon icon="pin" />}
                                onClick={handleOpenPreferences}
                                data-testid="manage-pinned-menuitem"
                            />
                        </Menu>
                    }
                    placement="right-start"
                    fill
                >
                    <SidebarButton
                        title={translate("More")}
                        icon="dots-horizontal"
                        data-testid="more-button"
                    />
                </Popover>
            )}
        </>
    );
};
