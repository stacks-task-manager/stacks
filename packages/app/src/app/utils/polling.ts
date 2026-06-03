// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IUpdate, USER_ONLINE_STATUS } from "@stacks/types";
import { getMe } from "app/hooks";
import { PeopleActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";

/** Coalesce rapid WS updates with the same type + record so listeners run once with the latest payload. */
const UPDATE_CALLBACK_DEBOUNCE_MS = 100;

type UpdateListenerCallback = (update: IUpdate, hasPermissions: boolean) => void;

type UpdateCallbackDebounceEntry = {
    timeout: ReturnType<typeof setTimeout>;
    latest: { update: IUpdate; hasPermissions: boolean };
};

type IListeners = Map<string, Set<UpdateListenerCallback>>;

type ConnectionStatus = {
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
};

type ConnectionStatusCallback = (status: ConnectionStatus) => void;

export type AiChatWsPayload =
    | { kind: "delta"; clientRequestId: string; delta: string }
    | {
        kind: "done";
        clientRequestId: string;
        text: string;
        widgets: Array<
            | { type: "button"; label: string; hashPath: string }
            | { type: "redirect"; label: string; hashPath: string }
        >;
    }
    | { kind: "error"; clientRequestId?: string; message: string };

type AiChatWsCallback = (payload: AiChatWsPayload) => void;

export class UpdatePoller {
    private listeners: IListeners = new Map();
    private ws: WebSocket | null = null;
    private reconnectAttempts = 0;
    private maxReconnectAttempts = 5;
    private reconnectDelay = 1000;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private isConnecting = false;
    private isDestroyed = false;
    private connectionStatusListeners: Set<ConnectionStatusCallback> = new Set();
    private aiChatListeners: Set<AiChatWsCallback> = new Set();
    private updateListenerDebounces = new Map<UpdateListenerCallback, Map<string, UpdateCallbackDebounceEntry>>();
    public readonly instanceId: string;
    private token: string | null;

    // Generate unique instance ID for this client instance
    private generateInstanceId(): string {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        // Fallback for older browsers
        return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    constructor(token?: string | null) {
        this.instanceId = this.generateInstanceId();
        this.token = token || null;
        this.connect();
    }

    private connect = () => {
        if (this.isConnecting || this.isDestroyed) return;

        this.isConnecting = true;
        this.notifyConnectionStatus();
        // Attempting to connect to WebSocket

        try {
            // Connect to the server WebSocket endpoint on port 3000
            const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
            const host = window.location.hostname;
            const port = window.location.port;
            let wsUrl = `${protocol}//${host}:${port}/ws`;

            // Add token as query parameter if available
            if (this.token) {
                wsUrl += `?token=${encodeURIComponent(this.token)}`;
            }

            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = this.onOpen;
            this.ws.onmessage = this.onMessage;
            this.ws.onclose = this.onClose;
            this.ws.onerror = this.onError;
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Failed to create WebSocket connection:", error);
            this.isConnecting = false;
            this.notifyConnectionStatus();
            this.scheduleReconnect();
        }
    };

    private onOpen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyConnectionStatus();
        this.startHeartbeat();
    };

    private onMessage = (event: MessageEvent) => {
        try {
            const data = JSON.parse(event.data);

            // Handle other message types
            switch (data.type) {
                case "ping":
                    // Server sent ping, respond with pong
                    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                        this.ws.send(JSON.stringify({ type: "pong", timestamp: Date.now() }));
                    }
                    break;
                case "pong":
                    // Server responded to ping
                    break;
                case "stats":
                    break;
                case "error":
                    break;
                case "update":
                    this.handleUpdate(data.payload);
                    break;
                case "user_status_updated":
                    this.handleUserUpdate(data.payload);
                    break;
                case "ai_chat_delta":
                    this.dispatchAiChat({
                        kind: "delta",
                        clientRequestId: String(data.payload?.clientRequestId ?? ""),
                        delta: String(data.payload?.delta ?? ""),
                    });
                    break;
                case "ai_chat_done":
                    this.dispatchAiChat({
                        kind: "done",
                        clientRequestId: String(data.payload?.clientRequestId ?? ""),
                        text: String(data.payload?.text ?? ""),
                        widgets: Array.isArray(data.payload?.widgets) ? data.payload.widgets : [],
                    });
                    break;
                case "ai_chat_error":
                    this.dispatchAiChat({
                        kind: "error",
                        clientRequestId: data.payload?.clientRequestId,
                        message: String(data.payload?.message ?? "AI error"),
                    });
                    break;
                default:
                // Unknown message type
            }
        } catch (error) {
            // Error parsing WebSocket message
        }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private onClose = (event: CloseEvent) => {
        this.isConnecting = false;
        this.notifyConnectionStatus();
        this.stopHeartbeat();
        this.scheduleReconnect();
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    private onError = (error: Event) => {
        this.isConnecting = false;
        this.notifyConnectionStatus();
    };

    private scheduleReconnect = () => {
        if (this.isDestroyed || this.reconnectAttempts >= this.maxReconnectAttempts) {
            return;
        }

        this.reconnectAttempts++;

        setTimeout(() => {
            this.connect();
        }, this.reconnectDelay);

        // Exponential backoff
        this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
    };

    private startHeartbeat = () => {
        this.stopHeartbeat();
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                this.ws.send(JSON.stringify({ type: "ping" }));
            }
        }, 30000); // Send ping every 30 seconds
    };

    private stopHeartbeat = () => {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    };

    private static readonly debounceKeySep = "\x1e";

    private clearUpdateDebouncersForSection = (callback: UpdateListenerCallback, section: string) => {
        const inner = this.updateListenerDebounces.get(callback);
        if (!inner) return;

        const prefix = `${section}${UpdatePoller.debounceKeySep}`;
        for (const [key, entry] of [...inner.entries()]) {
            if (key.startsWith(prefix)) {
                clearTimeout(entry.timeout);
                inner.delete(key);
            }
        }

        if (inner.size === 0) {
            this.updateListenerDebounces.delete(callback);
        }
    };

    private clearAllUpdateDebouncers = () => {
        for (const inner of this.updateListenerDebounces.values()) {
            for (const entry of inner.values()) {
                clearTimeout(entry.timeout);
            }
        }
        this.updateListenerDebounces.clear();
    };

    private scheduleDebouncedUpdateCallback = (
        callback: UpdateListenerCallback,
        update: IUpdate,
        hasPermissions: boolean
    ) => {
        const key = `${update.type}${UpdatePoller.debounceKeySep}${update.record}`;
        let byKey = this.updateListenerDebounces.get(callback);
        if (!byKey) {
            byKey = new Map();
            this.updateListenerDebounces.set(callback, byKey);
        }

        const flush = () => {
            const inner = this.updateListenerDebounces.get(callback);
            if (!inner) return;

            const entry = inner.get(key);
            if (!entry) return;

            inner.delete(key);
            if (inner.size === 0) {
                this.updateListenerDebounces.delete(callback);
            }

            callback(entry.latest.update, entry.latest.hasPermissions);
        };

        const existing = byKey.get(key);
        if (existing) {
            clearTimeout(existing.timeout);
            existing.latest = { update, hasPermissions };
            existing.timeout = setTimeout(flush, UPDATE_CALLBACK_DEBOUNCE_MS);
        } else {
            byKey.set(key, {
                latest: { update, hasPermissions },
                timeout: setTimeout(flush, UPDATE_CALLBACK_DEBOUNCE_MS),
            });
        }
    };

    private handleUpdate = (update: IUpdate) => {
        if (process.env.NODE_ENV === "development") {
            // eslint-disable-next-line no-console
            console.log("📣", update, this.instanceId);
        }
        const sectionListeners = this.listeners.get(update.type);
        if (sectionListeners) {
            sectionListeners.forEach(callback => {
                // Skip callback if this update originated from this instance
                if (update.instanceId && update.instanceId === this.instanceId && !update.automation) {
                    return;
                }

                let hasPermissions = true;
                if (update.permissions) {
                    // skip if the user does not meet the necessary permissions
                    const { isPublic, visibleUsers, visibleRoles } = update.permissions;
                    const me = getMe();
                    if (!isPublic && update.user !== me.id) {
                        if (!me) {
                            hasPermissions = false;
                        }

                        const isAllowed =
                            Boolean(me.admin) ||
                            (visibleUsers ?? []).includes(me.id) ||
                            (me.role ? (visibleRoles ?? []).includes(me.role) : false);

                        if (!isAllowed) {
                            hasPermissions = false;
                        }
                    }
                }

                if (process.env.NODE_ENV === "development") {
                    // eslint-disable-next-line no-console
                    console.log("⤵️", update);
                }
                this.scheduleDebouncedUpdateCallback(callback, update, hasPermissions);
            });
        }
    };

    private dispatchAiChat = (payload: AiChatWsPayload) => {
        this.aiChatListeners.forEach(cb => {
            try {
                cb(payload);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error("ai chat ws listener", error);
            }
        });
    };

    /** Subscribe to AI chat WebSocket payloads (delta / done / error). */
    public onAiChatMessage = (callback: AiChatWsCallback): (() => void) => {
        this.aiChatListeners.add(callback);
        return () => {
            this.aiChatListeners.delete(callback);
        };
    };

    private handleUserUpdate = (payload: {
        user: string;
        status: USER_ONLINE_STATUS;
        instanceId: string;
    }) => {
        const { user, status, instanceId } = payload;
        if (instanceId === this.instanceId) {
            return;
        }
        if (user === PeopleStore.get().me) {
            return;
        }

        PeopleActions.updateOnlineStatus(user, status);
    };

    public disconnect = () => {
        this.isDestroyed = true;
        this.stopHeartbeat();
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.notifyConnectionStatus();
    };

    public destroy = () => {
        this.disconnect();
        this.clearAllUpdateDebouncers();
        this.listeners.clear();
        this.connectionStatusListeners.clear();
        this.aiChatListeners.clear();
    };

    private notifyConnectionStatus = () => {
        const status: ConnectionStatus = {
            isConnected: this.ws?.readyState === WebSocket.OPEN && !this.isConnecting && !this.isDestroyed,
            isConnecting: this.isConnecting && !this.isDestroyed,
            isDisconnected:
                (!this.ws ||
                    this.ws.readyState === WebSocket.CLOSED ||
                    this.ws.readyState === WebSocket.CLOSING) &&
                !this.isConnecting &&
                !this.isDestroyed,
        };

        this.connectionStatusListeners.forEach(callback => {
            try {
                callback(status);
            } catch (error) {
                // eslint-disable-next-line no-console
                console.error("Error in connection status callback:", error);
            }
        });
    };

    public onChange = (callback: ConnectionStatusCallback) => {
        this.connectionStatusListeners.add(callback);

        // Immediately notify with current status
        const currentStatus: ConnectionStatus = {
            isConnected: this.ws?.readyState === WebSocket.OPEN && !this.isConnecting && !this.isDestroyed,
            isConnecting: this.isConnecting && !this.isDestroyed,
            isDisconnected:
                (!this.ws ||
                    this.ws.readyState === WebSocket.CLOSED ||
                    this.ws.readyState === WebSocket.CLOSING) &&
                !this.isConnecting &&
                !this.isDestroyed,
        };

        try {
            callback(currentStatus);
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error("Error in connection status callback:", error);
        }

        // Return unsubscribe function
        return () => {
            this.connectionStatusListeners.delete(callback);
        };
    };

    public on = (section: string, callback: (update: IUpdate, hasPermissions: boolean) => void) => {
        if (!this.listeners.has(section)) {
            this.listeners.set(section, new Set());
        }

        this.listeners.get(section)!.add(callback);

        const destroyFunction = () => {
            this.off(section, callback);
        };

        return destroyFunction;
    };

    public off = (section: string, callback: (update: IUpdate, hasPermissions: boolean) => void) => {
        const sectionListeners = this.listeners.get(section);
        if (sectionListeners) {
            sectionListeners.delete(callback);
            this.clearUpdateDebouncersForSection(callback, section);

            // Clean up empty sections and unsubscribe
            if (sectionListeners.size === 0) {
                this.listeners.delete(section);
            }
        }
    };

    /**
     * Send a message to the server via WebSocket
     * @param message - The message object to send
     * @returns Promise that resolves when message is sent, rejects if connection is not available
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public sendMessage = (message: any): Promise<void> => {
        return new Promise((resolve, reject) => {
            if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
                reject(new Error("WebSocket connection is not available"));
                return;
            }

            try {
                // Add instance ID to the message for tracking
                const messageWithInstanceId = {
                    ...message,
                    instanceId: this.instanceId,
                    timestamp: Date.now(),
                };

                this.ws.send(JSON.stringify(messageWithInstanceId));
                resolve();
            } catch (error) {
                reject(error);
            }
        });
    };
}
