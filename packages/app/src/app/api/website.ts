// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * Marketing/announcement endpoints.
 */
import { IAnnouncement } from "app/components/common";
import request from "./request"


export const WebsiteAPI = {
    /** Lists announcements. */
    async loadAnnouncements(): Promise<IAnnouncement[]> {
        return request.get("/api/website/announcements");
    },
    /** Submits user response to an announcement. */
    async sendAnnouncementAnswer(id: number, answer: any): Promise<IAnnouncement> {
        return request.post(`/api/website/announcements/${id}`, answer);
    },
}