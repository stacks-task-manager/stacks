// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { PermissionEntity, WorkbookEntity } from "@stacks/db";
import {
    POLLINGACTIONS,
    POLLINGTYPE,
    sanitizeWorkbookFilters,
    type ITask,
    type IWorkbook,
    type IWorkbookFilters,
} from "@stacks/types";
import type { Transaction } from "sequelize";
import { translate } from "@stacks/translations";

import { Errors } from "../errors";
import { sendRealtimeUpdate } from "../events";
import { invalidateApiCacheForCurrentRequest } from "../utils/cache";
import { getCurrentUser } from "./context";
import { PermissionsLoader } from "./permissions";
import { TasksLoader } from "./tasks";
import {
    afterTransactionCommit,
    createOne,
    deleteOne,
    findAll,
    findOne,
    updateOne,
    withTransaction,
} from "./utils";

WorkbookEntity.hasOne(PermissionEntity, { foreignKey: "id", constraints: false });
PermissionEntity.belongsTo(WorkbookEntity, { foreignKey: "id", constraints: false });

type WorkbookCreateInput = {
    title: string;
    filters: IWorkbookFilters;
    permissions: {
        isPublic?: boolean;
        owner?: string;
        visibleUsers?: string[];
        visibleRoles?: string[];
    };
};

function assertCanManage(workbook: IWorkbook) {
    const user = getCurrentUser();
    if (user.admin || workbook.permissions.owner === user.id) return;
    throw Errors.forbidden(translate("Workbook update not allowed"));
}

async function create(data: WorkbookCreateInput, extTransaction?: Transaction): Promise<IWorkbook> {
    return withTransaction(extTransaction, async transaction => {
        const user = getCurrentUser();
        const workbook = await createOne<IWorkbook>({
            entity: WorkbookEntity,
            data: {
                title: data.title,
                filters: sanitizeWorkbookFilters(data.filters),
            },
            transaction,
        });
        const permissions = await PermissionsLoader.create(
            workbook.id,
            {
                ...data.permissions,
                owner: user.id,
                type: POLLINGTYPE.WORKBOOK,
            },
            transaction
        );
        const result = { ...workbook, permissions };

        afterTransactionCommit(transaction, () => {
            sendRealtimeUpdate({
                type: POLLINGTYPE.WORKBOOK,
                record: result.id,
                action: POLLINGACTIONS.CREATE,
                permissions,
            });
        });
        invalidateApiCacheForCurrentRequest();
        return result;
    });
}

async function getAll(extTransaction?: Transaction): Promise<IWorkbook[]> {
    return withTransaction(extTransaction, transaction =>
        findAll<IWorkbook>({
            entity: WorkbookEntity,
            order: [["updated", "DESC"]] as any,
            transaction,
        })
    );
}

async function getOne(id: string, extTransaction?: Transaction): Promise<IWorkbook> {
    return withTransaction(extTransaction, async transaction => {
        const workbook = (await findOne({ entity: WorkbookEntity, id, transaction })) as IWorkbook | null;
        if (!workbook) throw Errors.notFound(translate("Workbook not found"));
        return workbook;
    });
}

async function update(
    id: string,
    data: { title?: string; filters?: IWorkbookFilters },
    extTransaction?: Transaction
): Promise<IWorkbook> {
    return withTransaction(extTransaction, async transaction => {
        const current = await getOne(id, transaction);
        assertCanManage(current);
        const updated = await updateOne<IWorkbook>({
            entity: WorkbookEntity,
            id,
            data: {
                ...(data.title != null ? { title: data.title } : {}),
                ...(data.filters != null ? { filters: sanitizeWorkbookFilters(data.filters) } : {}),
                updatedBy: getCurrentUser().id,
            },
            transaction,
        });
        const result = { ...updated, permissions: current.permissions };

        afterTransactionCommit(transaction, () => {
            sendRealtimeUpdate({
                type: POLLINGTYPE.WORKBOOK,
                record: id,
                action: POLLINGACTIONS.UPDATE,
                permissions: current.permissions,
            });
        });
        invalidateApiCacheForCurrentRequest();
        return result;
    });
}

async function remove(id: string, extTransaction?: Transaction): Promise<IWorkbook> {
    return withTransaction(extTransaction, async transaction => {
        const workbook = await getOne(id, transaction);
        assertCanManage(workbook);
        const deleted = await deleteOne<IWorkbook>({ entity: WorkbookEntity, id, transaction });
        await PermissionsLoader.remove(id, transaction);

        afterTransactionCommit(transaction, () => {
            sendRealtimeUpdate({
                type: POLLINGTYPE.WORKBOOK,
                record: id,
                action: POLLINGACTIONS.DELETED,
                permissions: workbook.permissions,
            });
        });
        invalidateApiCacheForCurrentRequest();
        return deleted;
    });
}

async function getTasks(id: string): Promise<ITask[]> {
    await getOne(id);
    return TasksLoader.getAll({});
}

export const WorkbooksLoader = {
    create,
    getAll,
    getOne,
    update,
    remove,
    getTasks,
};
