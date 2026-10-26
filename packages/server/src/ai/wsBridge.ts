// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * WebSocket bridge: authenticates AI chat messages and streams assistant deltas to clients.
 */
import { UserEntity } from "@stacks/db";
import { randomUUID } from "crypto";
import { RolesLoader } from "../loaders";
import { requestContext } from "../services/requestContext";
import type { User } from "../types/user";
import type { AiChatChoiceReply, IRole } from "@stacks/types";
import { onConnectionClosed, onCustomMessage } from "../events";
import { sendMessageToUser } from "../routes/socket";
import { formatAiChatError, streamAiChat, type AiChatClientMessage } from "./chat";
import type { AiChatClientRoutePayload } from "./clientRoute";
import { isAiChatKillSwitchOn } from "./config";
import { acquireRateLimitLease, consumeRateLimit, releaseRateLimitLease } from "../utils/rateLimit";

const activeRequestsByConnection = new Map<string, Set<AbortController>>();

/** Accepts only well-shaped client route objects from WS JSON. */
function sanitizeClientRoute(raw: unknown): AiChatClientRoutePayload | undefined {
    if (!raw || typeof raw !== "object") {
        return undefined;
    }
    const { section, sectionId, viewType, childId, search } = raw as Record<string, string>;

    if (typeof section !== "string" || section.length > 100) return undefined;
    return {
        section,
        search: section === "tasks" && typeof search === "string" ? search.slice(0, 4000) : undefined,
        sectionId: typeof sectionId === "string" ? sectionId.slice(0, 100) : undefined,
        viewType: typeof viewType === "string" ? viewType.slice(0, 100) : undefined,
        childId: typeof childId === "string" ? childId.slice(0, 100) : undefined,
    };
}

type AiChatRequestPayload = {
    clientRequestId?: string;
    messages?: AiChatClientMessage[];
    clientRoute?: AiChatClientRoutePayload;
    conversationId?: string;
    choiceReply?: AiChatChoiceReply;
};

const isValidChatIdentifier = (value: unknown): value is string =>
    typeof value === "string" && value.length > 0 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value);

function sendAi(userId: string, type: "ai_chat_delta" | "ai_chat_done" | "ai_chat_error", payload: object) {
    sendMessageToUser(userId, type, payload, "update");
}

/**
 * Subscribe to WebSocket `ai_chat_request` custom messages and run the AI pipeline.
 * Call once at process startup (after DB is available).
 */
export function registerAiChatWebSocketHandlers(): void {
    onConnectionClosed(connectionId => {
        const controllers = activeRequestsByConnection.get(connectionId);
        if (!controllers) return;
        for (const controller of controllers) controller.abort(new Error("WebSocket disconnected"));
        activeRequestsByConnection.delete(connectionId);
    });

    onCustomMessage(data => {
        if (data.messageType !== "ai_chat_request") {
            return;
        }

        const userId = data.userId;
        if (!userId) {
            return;
        }

        const payload = (data.messageData?.payload ?? {}) as AiChatRequestPayload;
        const hasClientRequestId = payload.clientRequestId !== undefined;
        const hasConversationId = payload.conversationId !== undefined;
        if (
            (hasClientRequestId && !isValidChatIdentifier(payload.clientRequestId)) ||
            (hasConversationId && !isValidChatIdentifier(payload.conversationId))
        ) {
            sendAi(userId, "ai_chat_error", {
                clientRequestId: randomUUID(),
                message: "Invalid chat request identifiers",
            });
            return;
        }
        const clientRequestId = payload.clientRequestId ?? randomUUID();

        if (isAiChatKillSwitchOn()) {
            sendAi(userId, "ai_chat_error", {
                clientRequestId,
                message: "AI chat is not enabled",
            });
            return;
        }

        const messages = Array.isArray(payload.messages) ? payload.messages : [];

        if (messages.length === 0) {
            sendAi(userId, "ai_chat_error", { clientRequestId, message: "No messages" });
            return;
        }

        if (
            messages.length > 100 ||
            messages.some(
                m =>
                    !m ||
                    !["user", "assistant"].includes(m.role) ||
                    typeof m.content !== "string" ||
                    m.content.length > 20000
            ) ||
            messages.reduce((sum, m) => sum + m.content.length, 0) > 100000
        ) {
            sendAi(userId, "ai_chat_error", {
                clientRequestId,
                message: "Invalid or oversized chat history",
            });
            return;
        }
        const last = messages[messages.length - 1];
        if (last.role !== "user") {
            sendAi(userId, "ai_chat_error", { clientRequestId, message: "Last message must be from user" });
            return;
        }
        if (last.content.trim().length === 0) {
            sendAi(userId, "ai_chat_error", { clientRequestId, message: "Chat message cannot be empty" });
            return;
        }

        const history = messages.slice(0, -1);
        const newUserMessage = last.content;
        const clientRoute = sanitizeClientRoute(payload.clientRoute);
        const abortController = new AbortController();
        const connectionId = data.connectionId;
        if (connectionId) {
            const controllers = activeRequestsByConnection.get(connectionId) ?? new Set<AbortController>();
            controllers.add(abortController);
            activeRequestsByConnection.set(connectionId, controllers);
        }

        void (async () => {
            let concurrencyLeaseId: string | undefined;
            try {
                const userRow = await UserEntity.findOne({ where: { id: userId } });
                if (!userRow || userRow.get("disabled") || userRow.get("deleted")) {
                    sendAi(userId, "ai_chat_error", { clientRequestId, message: "User not available" });
                    return;
                }

                const tenantId = String(userRow.get("tenant") ?? "");
                const now = Date.now();
                const [userBudget, tenantBudget] = await Promise.all([
                    consumeRateLimit("ai-chat-user", userId, 20, 5 * 60_000, now),
                    consumeRateLimit("ai-chat-tenant", tenantId, 60, 5 * 60_000, now),
                ]);
                if (!userBudget.allowed || !tenantBudget.allowed) {
                    sendAi(userId, "ai_chat_error", { clientRequestId, message: "AI chat limit reached" });
                    return;
                }
                const lease = await acquireRateLimitLease("ai-chat-concurrency-user", userId, 2, 5 * 60_000);
                if (!lease) {
                    sendAi(userId, "ai_chat_error", { clientRequestId, message: "AI chat is busy" });
                    return;
                }
                concurrencyLeaseId = lease.id;

                let role: IRole;
                try {
                    role = await RolesLoader.getById(userRow.get("role"), userRow.get("tenant"));
                } catch {
                    sendAi(userId, "ai_chat_error", { clientRequestId, message: "Role not available" });
                    return;
                }

                const userJson = userRow.toJSON() as User;
                if (abortController.signal.aborted) return;

                await requestContext.run(
                    {
                        user: userJson,
                        instanceId: "",
                        role,
                        sid: data.sid,
                        requestId: randomUUID(),
                        timestamp: Date.now(),
                    },
                    () =>
                        streamAiChat(
                            history,
                            newUserMessage,
                            {
                                onTextDelta: delta => {
                                    sendAi(userId, "ai_chat_delta", { clientRequestId, delta });
                                },
                                onDone: ({ text, widgets }) => {
                                    sendAi(userId, "ai_chat_done", { clientRequestId, text, widgets });
                                },
                                onError: message => {
                                    sendAi(userId, "ai_chat_error", { clientRequestId, message });
                                },
                            },
                            clientRoute,
                            {
                                clientRequestId,
                                conversationId:
                                    typeof payload.conversationId === "string" &&
                                    payload.conversationId.length <= 100
                                        ? payload.conversationId
                                        : undefined,
                                choiceReply: payload.choiceReply,
                                signal: abortController.signal,
                            }
                        )
                );
            } catch (e) {
                console.error("[aiChat] request failed");
                sendAi(userId, "ai_chat_error", {
                    clientRequestId,
                    message: formatAiChatError(e),
                });
            } finally {
                if (connectionId) {
                    const controllers = activeRequestsByConnection.get(connectionId);
                    controllers?.delete(abortController);
                    if (controllers?.size === 0) activeRequestsByConnection.delete(connectionId);
                }
                if (concurrencyLeaseId) {
                    try {
                        await releaseRateLimitLease(concurrencyLeaseId);
                    } catch {
                        console.error("AI chat concurrency lease release failed");
                    }
                }
            }
        })();
    });
}
