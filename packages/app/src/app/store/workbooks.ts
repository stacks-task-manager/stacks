// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IWorkbook } from "@stacks/types";
import { entity } from "app/hooks/store";

export interface IWorkbooksStore {
    workbooks: IWorkbook[];
    isLoading: boolean;
}

export const WorkbooksStore = entity<IWorkbooksStore>({
    workbooks: [],
    isLoading: false,
});
