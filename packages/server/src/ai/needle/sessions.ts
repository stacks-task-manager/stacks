// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { NeedleCall } from "./runtime";
import type { AiChatChoiceReply } from "@stacks/types";
export type ChoiceReply = AiChatChoiceReply;
export type PendingAction = {
    token: string;
    calls: NeedleCall[];
    options: Record<string, unknown>;
    field?: string;
};
export type ChatSession = {
    touched: number;
    busy: boolean;
    mutated?: boolean;
    context: string[];
    /** Original request while awaiting a field or opaque choice reply. */
    pendingRequest?: string;
    pending?: PendingAction;
};
const sessions = new Map<string, ChatSession>();
export function getChatSession(
    tenant: string,
    user: string,
    conversation: string,
    now = Date.now()
): ChatSession {
    for (const [key, session] of sessions)
        if (!session.busy && now - session.touched > 30 * 60 * 1000) sessions.delete(key);
    const key = JSON.stringify([tenant, user, conversation]);
    let session = sessions.get(key);
    if (!session) {
        if (sessions.size >= 1000) throw new Error("Chat capacity reached");
        session = { touched: now, busy: false, context: [] };
        sessions.set(key, session);
    }
    session.touched = now;
    return session;
}
