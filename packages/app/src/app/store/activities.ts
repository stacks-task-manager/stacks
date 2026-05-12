// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Activity feed cache for the UI.
 */
import { entity } from "app/hooks/store";
import { IActivity } from "@stacks/types";

export interface IActivitiesStore {
    activities: IActivity[];
}

export const ActivitiesStore = entity<IActivitiesStore>({
    activities: [],
});
