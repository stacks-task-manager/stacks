// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Dashboard overview widgets state.
 */
import { entity } from "app/hooks/store";
import { IProjectOverview } from "@stacks/types";
import { produce } from "immer";
import { getStorage } from "app/utils/storage";

export const CACHE_OVERVIEW = "cache-overview";

export interface IOverviewStore {
    isLoading: boolean;
    overview?: IProjectOverview;
}

export const OverviewStore = entity<IOverviewStore>({
    isLoading: false,
},[
    {
        init: (origInit, entity) => () => {
            origInit();

            entity.set(
                produce((state: IOverviewStore) => {
                    state.overview = getStorage(CACHE_OVERVIEW, true, {});
                })
            );
        },
    },
]);
