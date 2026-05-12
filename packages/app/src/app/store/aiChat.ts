// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI chat UI store (open, draft, history pointers).
 */
import { produce } from "immer";
import { entity } from "app/hooks/store";
import { getStorage } from "app/utils/storage";

export const AI_CHAT_MESSAGES_KEY = "ai-chat-messages";

const MAX_PERSISTED_MESSAGES = 80;

export type AiChatWidget =
    | { type: "button"; label: string; hashPath: string }
    | { type: "redirect"; label: string; hashPath: string };

export type AiChatMessage = {
    id: string;
    role: "user" | "assistant";
    content: string;
    widgets?: AiChatWidget[];
};

export interface IAiChatStore {
    serverEnabled: boolean;
    panelOpen: boolean;
    isAwaitingReply: boolean;
    activeClientRequestId: string | null;
    streamingAssistantContent: string;
    messages: AiChatMessage[];
}

const defaultState: IAiChatStore = {
    serverEnabled: false,
    panelOpen: false,
    isAwaitingReply: false,
    activeClientRequestId: null,
    streamingAssistantContent: "",
    messages: [],
};

function trimMessages(list: AiChatMessage[]): AiChatMessage[] {
    if (list.length <= MAX_PERSISTED_MESSAGES) {
        return list;
    }
    return list.slice(list.length - MAX_PERSISTED_MESSAGES);
}

export const AiChatStore = entity<IAiChatStore>(
    { ...defaultState },
    [
        {
            init: (origInit, ent) => () => {
                origInit();
                const stored = getStorage<{ messages?: AiChatMessage[] }>(AI_CHAT_MESSAGES_KEY, true, {});
                const messages = trimMessages(Array.isArray(stored.messages) ? stored.messages : []);
                ent.set(
                    produce((s: IAiChatStore) => {
                        s.messages = messages;
                    })
                );
            },
        },
    ]
);
