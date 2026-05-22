// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Project overview panel data.
 */
import { produce } from "immer";

import { IProjectOverview } from "@stacks/types";
import { ProjectsAPI } from "app/api";
import { runStoreLoad } from "../actionHelpers";
import { CACHE_OVERVIEW, IOverviewStore, OverviewStore } from "../overview";
import { setStorage } from "app/utils/storage";

const load = async (projectId: string) => {
    await runStoreLoad<IOverviewStore, IProjectOverview>({
        set: fn => OverviewStore.set(produce(fn)),
        onStart: state => {
            state.overview = undefined;
            state.isLoading = true;
        },
        load: () => ProjectsAPI.overview(projectId),
        onSuccess: (state, overview) => {
            state.overview = overview;
            state.isLoading = false;
        },
    });

    const { overview } = OverviewStore.get();
    if (overview) {
        setStorage(CACHE_OVERVIEW, overview);
    }
};

export const OverviewActions = {
    load,
};
