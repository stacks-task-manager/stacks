// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { useEffect, useMemo, useRef } from "react";
import { Outlet, useParams, useSearchParams } from "react-router-dom";

import { PROJECTVIEW } from "@stacks/types";
import { CopyMoveWrapper } from "app/components";
import { ProjectFilterDrawer, TimeFilterDrawer } from "app/components/project";
import {
    useFilterQuerySync,
    useProjectBackground,
    useProjectDefaultFilterState,
    useProjectFilterMerge,
    useProjectLastView,
    useProjectShowSubtasks,
    useProjectStatus,
} from "app/hooks";
import { defaultFilters } from "app/store/projectFilters";
import { ProjectsActions } from "app/store/actions/projects";
import {
    Attachments,
    Board,
    Gantt,
    Links,
    Overview,
    ProjectSettings,
    TableView,
    Time,
    World,
} from "app/views";
import { AppView, AppViewContent, ProjectToolbar, ProjectToolbarLoading } from "app/widgets";
import { Notes } from "./Notes/Notes";

const ProjectLoading = () => {
    return (
        <AppView toolbar={<ProjectToolbarLoading />}>
            <AppViewContent padded>Loading</AppViewContent>
        </AppView>
    );
};

export const Project = () => {
    const { isLoading, isLoaded, projectId } = useProjectStatus();

    useEffect(() => {
        (async () => {
            const shouldLoad = projectId && !isLoading && !isLoaded;
            if (shouldLoad) {
                await ProjectsActions.loadOne(projectId);
            }
        })();
    }, [projectId, isLoading, isLoaded]);

    if (isLoading || !isLoaded) return <ProjectLoading />;

    return <ProjectView />;
};

const ProjectView = () => {
    const { id = "" } = useParams();
    const [, setSearchParams] = useSearchParams();
    const prevProjectId = useRef<string | undefined>(undefined);

    useEffect(() => {
        if (prevProjectId.current != null && prevProjectId.current !== id) {
            setSearchParams({}, { replace: true });
        }
        prevProjectId.current = id;
    }, [id, setSearchParams]);

    const background = useProjectBackground();
    const view = useProjectLastView();
    const defaultState = useProjectDefaultFilterState();
    const showSubtasksDef = useProjectShowSubtasks();

    const effectiveDefaults = useMemo(() => {
        const d = { ...defaultFilters };
        if (Boolean(defaultState) && defaultState !== "") {
            d.state = defaultState as (typeof d)["state"];
        }
        if (Boolean(showSubtasksDef)) {
            d.showSubtasks = showSubtasksDef;
        }
        d.project = id;
        return d;
    }, [id, defaultState, showSubtasksDef]);

    const mergeProjectFilters = useProjectFilterMerge(id, effectiveDefaults);
    useFilterQuerySync({
        filterStoreKey: id,
        effectiveDefaults,
        getMergedFilters: mergeProjectFilters,
    });

    const memoizedView = useMemo(() => {
        switch (view) {
            case PROJECTVIEW.BOARD:
                return <Board />;
            case PROJECTVIEW.LIST:
                return <TableView />;
            case "attachments":
                return <Attachments />;
            case "links":
                return <Links />;
            case PROJECTVIEW.OVERVIEW:
                return <Overview />;
            case PROJECTVIEW.TIME:
                return <Time />;
            case PROJECTVIEW.GANTT:
                return <Gantt />;
            case PROJECTVIEW.WORLD:
                return <World />;
            case PROJECTVIEW.NOTES:
                return <Notes />;
        }
    }, [view]);

    const isPadded = useMemo(() => ![PROJECTVIEW.BOARD, PROJECTVIEW.WORLD, PROJECTVIEW.OVERVIEW, PROJECTVIEW.NOTES].includes(view), [view]);
    const isRelative = useMemo(() => [PROJECTVIEW.WORLD, PROJECTVIEW.TIME, PROJECTVIEW.GANTT].includes(view), [view]);

    return (
        <AppView
            id={`project-view-${view}`}
            toolbar={<ProjectToolbar />}
            append={
                <>
                    <ProjectFilterDrawer />
                    <TimeFilterDrawer />
                    <Outlet />
                </>
            }
            data-testid="project"
        >
            <AppViewContent
                padded={isPadded}
                relative={isRelative}
                style={{ backgroundImage: background ? `url(${background})` : undefined }}
            >
                {memoizedView}
            </AppViewContent>
            <ProjectSettings />
            <CopyMoveWrapper />
        </AppView>
    );
};
