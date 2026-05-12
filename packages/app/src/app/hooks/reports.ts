// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Reports hooks and selectors.
 */
import { ReportsStore } from "app/store/reports";
import { shallowEqual } from "./store";

export const useReports = () => {
    return ReportsStore.use(
        state => ({
            reports: state.reports,
            isLoading: state.isLoading,
        }),
        shallowEqual
    );
};
