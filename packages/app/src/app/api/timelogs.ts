// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Timelog CRUD, listing, review, approve/reject batches.
 */
import { ITimeLog, TIMELOG_STATUS } from "@stacks/types";
import request from "./request";

/** Shared filter fields for timelog queries and actions. */
interface TimelogsFilterBaseParams {
    project?: string;
    task?: string;
    start?: string;
    end?: string;
}

/** GET `/api/timelogs` params including optional status. */
export interface TimelogsFilterParams extends TimelogsFilterBaseParams {
    status?: TIMELOG_STATUS;
}

/** Approve POST body. */
interface TimelogsApproveParams extends TimelogsFilterBaseParams {
    timelog?: string;
}

/** Reject POST body adds required reason. */
interface TimelogsRejectParams extends TimelogsApproveParams {
    reason: string;
}

export const TimelogsAPI = {
    /** Creates a timelog row. */
    async add(timelog: Partial<ITimeLog>): Promise<ITimeLog> {
        return request.post("/api/timelogs", timelog);
    },
    /** Filtered list. */
    async load(params: TimelogsFilterParams): Promise<ITimeLog[]> {
        return request.get("/api/timelogs", { params });
    },
    /** PATCH one entry. */
    async update(id: string, timelog: Partial<ITimeLog>): Promise<boolean> {
        return request.patch(`/api/timelogs/${id}`, timelog);
    },
    /** Deletes one entry. */
    async remove(id: string): Promise<boolean> {
        return request.delete(`/api/timelogs/${id}`);
    },
    /** Marks range as reviewed. */
    async review({ start, end }: { start: string; end: string }): Promise<boolean> {
        return request.patch("/api/timelogs/review", { start, end });
    },
    /** Approves matching rows. */
    async approve(filters: TimelogsApproveParams): Promise<ITimeLog[]> {
        return request.post("/api/timelogs/approved", filters);
    },
    /** Rejects matching rows with reason. */
    async reject(filters: TimelogsRejectParams): Promise<ITimeLog[]> {
        return request.post("/api/timelogs/rejected", filters);
    },
};
