// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Classes, Spinner, SpinnerSize } from "@blueprintjs/core";
import React, { FunctionComponent, Suspense, lazy, useEffect, useMemo } from "react";
import { Location, Route, Routes, useLocation, useNavigate } from "react-router-dom";

import { Announcement, ErrorBoundary, Feedback, Grid } from "app/components/common";
import { DragDropProvider } from "app/components/draggable/context/DragDropContext";
import { Preferences } from "app/views/Preferences/Preferences";
import { Sidebar } from "app/views/Sidebar/Sidebar";
import { SplitView } from "app/views/SplitView/SplitView";
import { Watermark } from "app/views/Watermark/Watermark";
import { Workspaces } from "app/views/Workspaces/Workspaces";
import { AiChat } from "app/widgets/aiChat/AiChat";
import { useMousetrap, usePreferences, useSubscribe, useUpdates } from "./hooks";
import { shallowEqual } from "./hooks/store";
import { NotificationsActions, PeopleActions } from "./store/actions";
import { PeopleStore } from "./store/people";
import currencies from "../assets/currencies.json";

window["currencies"] = currencies;

const Home = lazy(() => import("app/views/Home/Home").then(module => ({ default: module.Home })));
const Project = lazy(() => import("app/views/Project/Project").then(module => ({ default: module.Project })));
const TaskDetails = lazy(() =>
    import("app/components/project/Task/TaskDetails/TaskDetails").then(module => ({
        default: module.TaskDetails,
    }))
);
const TaskDetailsPanel = lazy(() =>
    import("app/components/project/Task/TaskDetails/TaskDetails").then(module => ({
        default: module.TaskDetailsPanel,
    }))
);

const Bookmarks = lazy(() =>
    import("app/views/Bookmarks/Bookmarks").then(module => ({ default: module.Bookmarks }))
);
const Calendar = lazy(() =>
    import("app/views/Calendar/Calendar").then(module => ({ default: module.Calendar }))
);
const CompanyDetails = lazy(() =>
    import("app/views/CompanyDetails/CompanyDetails").then(module => ({ default: module.CompanyDetails }))
);
const CompanyDetailsPanel = lazy(() =>
    import("app/views/CompanyDetails/CompanyDetails").then(module => ({
        default: module.CompanyDetailsPanel,
    }))
);
const File = lazy(() => import("app/views/File/File").then(module => ({ default: module.File })));
const Goal = lazy(() => import("app/views/Goal/Goal").then(module => ({ default: module.Goal })));
const Inbox = lazy(() => import("app/views/Inbox/Inbox").then(module => ({ default: module.Inbox })));
const MyTasks = lazy(() => import("app/views/MyTasks/MyTasks").then(module => ({ default: module.MyTasks })));
const Notepad = lazy(() => import("app/views/Notepad/Notepad").then(module => ({ default: module.Notepad })));
const People = lazy(() => import("app/views/People/People").then(module => ({ default: module.People })));
const PersonDetails = lazy(() =>
    import("app/views/PersonDetails/PersonDetails").then(module => ({ default: module.PersonDetails }))
);
const PersonDetailsPanel = lazy(() =>
    import("app/views/PersonDetails/PersonDetails").then(module => ({
        default: module.PersonDetailsPanel,
    }))
);
const Reports = lazy(() => import("app/views/Reports/Reports").then(module => ({ default: module.Reports })));
const ReportType = lazy(() =>
    import("app/views/Reports/ReportType").then(module => ({ default: module.ReportType }))
);
const Tasks = lazy(() => import("app/views/Tasks/Tasks").then(module => ({ default: module.Tasks })));
const Workbooks = lazy(() =>
    import("app/views/Workbooks/Workbooks").then(module => ({ default: module.Workbooks }))
);
const Workbook = lazy(() =>
    import("app/views/Workbooks/Workbook").then(module => ({ default: module.Workbook }))
);

const App = () => {
    const isLoadingPeople = PeopleStore.use(state => state.isLoading, shallowEqual);
    const { darkMode, hideScrollbars } = usePreferences(["darkMode", "hideScrollbars"]);
    const navigate = useNavigate();

    useUpdates();

    // used to open background URLs
    useSubscribe("navigate", args => {
        navigate(args.location, args.options);
    });

    useEffect(() => {
        PeopleActions.load();
        NotificationsActions.load();
    }, []);

    useMousetrap(["command+[", "ctrl+["], () => navigate(-1));
    useMousetrap(["command+]", "ctrl+]"], () => navigate(1));

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
                            right={
                                isLoadingPeople ? (
                                    <Loading />
                                ) : (
                                    <Suspense fallback={<Loading />}>
                                        <RoutedMainAppRoutes />
                                    </Suspense>
                                )
                            }
                        />
                    </div>
                </div>

                <Suspense fallback={null}>
                    <RoutedOverlayRoutes />
                </Suspense>
                <AiChat />
            </DragDropProvider>
        </ErrorBoundary>
    );
};

export default App;

const RoutedMainAppRoutesPure = () => {
    const location = useLocation();
    const locationState = location.state as { backgroundLocation?: Location };
    return <MainAppRoutes location={locationState?.backgroundLocation || location} />;
};
const RoutedMainAppRoutes = React.memo(RoutedMainAppRoutesPure);

const RoutedOverlayRoutesPure = () => {
    const location = useLocation();
    const locationState = location.state as { backgroundLocation?: Location };
    if (!locationState?.backgroundLocation) {
        return null;
    }
    return (
        <Routes>
            <Route path="/task/:id" element={<TaskDetailsPanel />} />
            <Route path="/person/:id" element={<PersonDetailsPanel />} />
            <Route path="/company/:id" element={<CompanyDetailsPanel />} />
        </Routes>
    );
};
const RoutedOverlayRoutes = React.memo(RoutedOverlayRoutesPure);

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
                <Route path="/workbooks" element={<Workbooks />} />
                <Route path="/workbooks/:id" element={<Workbook />}>
                    <Route path=":tid" element={<TaskDetails />} />
                </Route>
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
    }, [location.pathname, location.search]);

    return memoizedAppRoutes;
};

const MainAppRoutes = React.memo(MainAppRoutesPure);

const Loading = ({ small }: { small?: boolean }) => {
    return (
        <Grid vertical>
            <Spinner size={small ? SpinnerSize.SMALL : SpinnerSize.STANDARD} />
        </Grid>
    );
};
