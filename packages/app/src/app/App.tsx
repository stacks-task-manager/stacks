// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Spinner, SpinnerSize } from "@blueprintjs/core";
import Mousetrap from "mousetrap";
import React, { FunctionComponent, useEffect, useMemo } from "react";
import { Location, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { Announcement, ErrorBoundary, Feedback, Grid } from "app/components/common";
import { DragDropProvider } from "app/components/draggable/context/DragDropContext";
import { TaskDetails, TaskDetailsPanel } from "app/components/project";
import {
    Bookmarks,
    Calendar,
    CompanyDetails,
    CompanyDetailsPanel,
    File,
    Goal,
    Home,
    Inbox,
    MyTasks,
    Notepad,
    People,
    PersonDetails,
    PersonDetailsPanel,
    Preferences,
    Project,
    Reports,
    ReportType,
    Sidebar,
    SplitView,
    Tasks,
    Watermark,
    Workspaces,
} from "app/views";
import { AiChat } from "app/widgets/aiChat/AiChat";
import { usePreferences, useSubscribe, useUpdates } from "./hooks";
import { shallowEqual } from "./hooks/store";
import { NotificationsActions, PeopleActions } from "./store/actions";
import { PeopleStore } from "./store/people";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const currencies = require("../assets/currencies.json");
window["currencies"] = currencies;

const App = () => {
    const isLoadingPeople = PeopleStore.use(state => state.isLoading, shallowEqual);
    const { darkMode, hideScrollbars } = usePreferences(["darkMode", "hideScrollbars"]);
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as { backgroundLocation?: Location };

    useUpdates();

    // used to open background URLs
    useSubscribe("navigate", args => {
        navigate(args.location, args.options);
    });

    useEffect(() => {
        PeopleActions.load();
        NotificationsActions.load();

        Mousetrap.bind(["command+[", "ctrl+["], () => navigate(-1));
        Mousetrap.bind(["command+]", "ctrl+]"], () => navigate(1));

        return () => {
            Mousetrap.unbind(["command+[", "ctrl+["]);
            Mousetrap.unbind(["command+]", "ctrl+]"]);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        document.body.classList.toggle(Classes.DARK, darkMode);
        document.body.classList.toggle("no-scrollbars", hideScrollbars);
    }, [darkMode, hideScrollbars]);

    useEffect(() => {
        setTimeout(() => {
            Feedback.appFeedback();
        }, 2000);
    }, []);

    return (
        <ErrorBoundary>
            <DragDropProvider>
                <div id="app">
                    <Preferences />
                    <Announcement />
                    <div className="app-content">
                        <Workspaces />
                        <SplitView
                            left={isLoadingPeople ? <Loading small /> : <Sidebar />}
                            right={isLoadingPeople ? <Loading /> : <MainAppRoutes location={locationState?.backgroundLocation || location} />}
                        />
                    </div>
                </div>

                {locationState?.backgroundLocation && (
                    <Routes>
                        <Route path="/task/:id" element={<TaskDetailsPanel />} />
                        <Route path="/person/:id" element={<PersonDetailsPanel />} />
                        <Route path="/company/:id" element={<CompanyDetailsPanel />} />
                    </Routes>
                )}
                <AiChat />
            </DragDropProvider>
        </ErrorBoundary>
    );
};

export default App;

interface MainAppRoutesProps {
    location: Location;
}
const MainAppRoutesPure: FunctionComponent<MainAppRoutesProps> = ({ location }) => {
    const memoizedAppRoutes = useMemo(() => {
        return (
            <Routes location={location}>
                <Route path="/home" element={<Home />} />
                <Route path="/reports" element={<Reports />} />
                <Route path="/reports/:type" element={<ReportType />} />
                <Route path="/inbox" element={<Inbox />}>
                    <Route path=":tid" element={<TaskDetails />} />
                </Route>
                <Route path="/mytasks" element={<MyTasks />}>
                    <Route path=":tid" element={<TaskDetails />} />
                </Route>
                <Route path="/tasks" element={<Tasks />}>
                    <Route path=":tid" element={<TaskDetails />} />
                </Route>
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/calendar" element={<Calendar />} />
                <Route path="/people" element={<People />}>
                    <Route path="person/:id" element={<PersonDetails />} />
                    <Route path="company/:id" element={<CompanyDetails />} />
                </Route>
                <Route path="/project/:id" element={<Project />}>
                    <Route path=":tid" element={<TaskDetails />} />
                </Route>
                <Route path="/notepad/:id" element={<Notepad />} />
                <Route path="/goal/:id" element={<Goal />} />
                <Route path="/file/:id" element={<File />} />
                <Route path="/" element={<Watermark />} />
                <Route path="*" element={<Watermark />} />
            </Routes>
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.pathname]);

    return memoizedAppRoutes;
};

const MainAppRoutes = React.memo(MainAppRoutesPure);

const Loading = ({ small }: { small?: boolean }) => {
    return (
        <Grid vertical>
            <Spinner size={small ? SpinnerSize.SMALL : SpinnerSize.STANDARD} />
        </Grid>
    )
}
