// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * AI chat panel messages and streaming.
 */
import { produce } from "immer";
import { AiChatStore, AI_CHAT_MESSAGES_KEY, IAiChatStore, type AiChatMessage, type AiChatWidget } from "../aiChat";
import { setStorage } from "app/utils/storage";

function newId(prefix: string) {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function persistMessages() {
    const { messages } = AiChatStore.get();
    setStorage(AI_CHAT_MESSAGES_KEY, { messages });
}

/** Models often emit leading newlines after tool calls; strip so bubbles and history stay clean. */
function normalizeAssistantText(text: string): string {
    return text.replace(/^\s+/, "");
}

export const AiChatActions = {
    setServerEnabled(enabled: boolean) {
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                s.serverEnabled = enabled;
                if (!enabled) {
                    s.panelOpen = false;
                }
            })
        );
    },

    togglePanel() {
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                if (!s.serverEnabled) {
                    return;
                }
                s.panelOpen = !s.panelOpen;
            })
        );
    },

    openPanel() {
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                if (!s.serverEnabled) {
                    return;
                }
                s.panelOpen = true;
            })
        );
    },

    closePanel() {
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                s.panelOpen = false;
            })
        );
    },

    /** Returns clientRequestId to send over WebSocket (correlates deltas / done / error). */
    appendUserMessage(content: string): string {
        const messageId = newId("u");
        const clientRequestId = newId("req");
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                s.messages.push({ id: messageId, role: "user", content });
                s.isAwaitingReply = true;
                s.activeClientRequestId = clientRequestId;
                s.streamingAssistantContent = "";
            })
        );
        persistMessages();
        return clientRequestId;
    },

    appendAssistantDelta(delta: string) {
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                s.streamingAssistantContent += delta;
            })
        );
    },

    finalizeAssistantTurn(clientRequestId: string, text: string, widgets: AiChatWidget[]) {
        const id = newId("a");
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                if (s.activeClientRequestId !== clientRequestId) {
                    return;
                }
                const msg: AiChatMessage = {
                    id,
                    role: "assistant",
                    content: normalizeAssistantText(text),
                    widgets: widgets.length ? widgets : undefined,
                };
                s.messages.push(msg);
                s.isAwaitingReply = false;
                s.activeClientRequestId = null;
                s.streamingAssistantContent = "";
            })
        );
        persistMessages();
    },

    /**
     * Stop streaming / awaiting for this request without mutating `messages` (errors are shown via toast in the UI).
     */
    clearActiveChatRequestIfMatch(clientRequestId: string) {
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                if (s.activeClientRequestId !== clientRequestId) {
                    return;
                }
                s.isAwaitingReply = false;
                s.activeClientRequestId = null;
                s.streamingAssistantContent = "";
            })
        );
    },

    clearConversation() {
        AiChatStore.set(
            produce((s: IAiChatStore) => {
                s.messages = [];
                s.isAwaitingReply = false;
                s.activeClientRequestId = null;
                s.streamingAssistantContent = "";
            })
        );
        setStorage(AI_CHAT_MESSAGES_KEY, { messages: [] });
    },
};
