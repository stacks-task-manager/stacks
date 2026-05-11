// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/**
 * WebSocket bridge: authenticates AI chat messages and streams assistant deltas to clients.
 */
import { UserEntity } from "@stacks/db";
import { randomUUID } from "crypto";
import { RolesLoader } from "../loaders";
import { requestContext } from "../services/requestContext";
import type { User } from "../types/user";
import type { IRole } from "@stacks/types";
import { onCustomMessage } from "../events";
import { sendMessageToUser } from "../routes/socket";
import { formatAiChatError, streamAiChat, type AiChatClientMessage } from "./chat";
import type { AiChatClientRoutePayload } from "./clientRoute";
import { isAiChatConfigured } from "./config";

/** Accepts only well-shaped client route objects from WS JSON. */
function sanitizeClientRoute(raw: unknown): AiChatClientRoutePayload | undefined {
    if (!raw || typeof raw !== "object") {
        return undefined;
    }
    const { section, sectionId, viewType, childId } = raw as Record<string, string>;

    return { section, sectionId, viewType, childId };
}

type AiChatRequestPayload = {
    clientRequestId?: string;
    messages?: AiChatClientMessage[];
    clientRoute?: AiChatClientRoutePayload;
};

function sendAi(userId: string, type: "ai_chat_delta" | "ai_chat_done" | "ai_chat_error", payload: object) {
    sendMessageToUser(userId, type, payload, "update");
}

/**
 * Subscribe to WebSocket `ai_chat_request` custom messages and run the AI pipeline.
 * Call once at process startup (after DB is available).
 */
export function registerAiChatWebSocketHandlers(): void {
    onCustomMessage(data => {
        if (data.messageType !== "ai_chat_request") {
            return;
        }

        const userId = data.userId;
        if (!userId) {
            return;
        }

        if (!isAiChatConfigured()) {
            sendAi(userId, "ai_chat_error", {
                clientRequestId: (data.messageData?.payload as AiChatRequestPayload)?.clientRequestId,
                message: "AI chat is not enabled",
            });
            return;
        }

        const payload = (data.messageData?.payload ?? {}) as AiChatRequestPayload;
        const clientRequestId = payload.clientRequestId ?? randomUUID();
        const messages = Array.isArray(payload.messages) ? payload.messages : [];

        if (messages.length === 0) {
            sendAi(userId, "ai_chat_error", { clientRequestId, message: "No messages" });
            return;
        }

        const last = messages[messages.length - 1];
        if (last.role !== "user") {
            sendAi(userId, "ai_chat_error", { clientRequestId, message: "Last message must be from user" });
            return;
        }

        const history = messages.slice(0, -1);
        const newUserMessage = last.content;
        const clientRoute = sanitizeClientRoute(payload.clientRoute);

        void (async () => {
            try {
                const userRow = await UserEntity.findOne({ where: { id: userId } });
                if (!userRow || userRow.get("disabled") || userRow.get("deleted")) {
                    sendAi(userId, "ai_chat_error", { clientRequestId, message: "User not available" });
                    return;
                }

                let role: IRole;
                try {
                    role = await RolesLoader.getById(userRow.get("role"), userRow.get("tenant"));
                } catch {
                    sendAi(userId, "ai_chat_error", { clientRequestId, message: "Role not available" });
                    return;
                }

                const userJson = userRow.toJSON() as User;

                await requestContext.run(
                    {
                        user: userJson,
                        instanceId: "",
                        role,
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
                            clientRoute
                        )
                );
            } catch (e) {
                console.error("[aiChat] request failed", e);
                sendAi(userId, "ai_chat_error", {
                    clientRequestId,
                    message: formatAiChatError(e),
                });
            }
        })();
    });
}
