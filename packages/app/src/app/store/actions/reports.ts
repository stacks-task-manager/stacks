// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Report catalog and fetch by type.
 */
import { produce } from "immer";

import { IReport } from "@stacks/types";
import { ReportsAPI } from "app/api";
import { runStoreLoad } from "../actionHelpers";
import { IReportsStore, ReportSpan, ReportsStore } from "../reports";

const loadList = async () => {
    await runStoreLoad<IReportsStore, IReport[]>({
        set: fn => ReportsStore.set(produce(fn)),
        onStart: state => {
            state.reports = [];
            state.isLoading = true;
        },
        load: () => ReportsAPI.list(),
        onSuccess: (state, reports) => {
            state.reports = reports;
            state.isLoading = false;
        },
    });
};

const setSpan = (span: ReportSpan) => {
    ReportsStore.set(
        produce((state: IReportsStore) => {
            state.span = span;
        })
    );
};

export const ReportsActions = {
    loadList,
    setSpan,
};
