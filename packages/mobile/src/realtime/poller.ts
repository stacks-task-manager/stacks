// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import type { IUpdate } from "@stacks/types";

const UPDATE_CALLBACK_DEBOUNCE_MS = 100;
const HEARTBEAT_INTERVAL_MS = 30_000;
const MAX_RECONNECT_DELAY_MS = 30_000;
const MAX_RECONNECT_ATTEMPTS = Number.POSITIVE_INFINITY;

export type UpdateListener = (update: IUpdate) => void;

export type ConnectionStatus = {
    isConnected: boolean;
    isConnecting: boolean;
    isDisconnected: boolean;
};

type ConnectionStatusListener = (status: ConnectionStatus) => void;

type DebounceEntry = {
    timeout: ReturnType<typeof setTimeout>;
    latest: IUpdate;
};

/**
 * React Native port of the web `UpdatePoller` — listens to the server `/ws`
 * channel and fans out `update` messages to subscribers by `IUpdate.type`
 * (POLLINGTYPE). Same per-record debounce semantics as the web one.
 *
 * Differences from the web version:
 * - Uses the Authorization header (Bearer) at WS upgrade time; mobile has no cookies.
 * - Ignores AI chat and presence messages (mobile doesn't need them).
 * - Does not apply permissions gating; React Query refetches go through the
 *   REST API which re-applies permissions server-side.
 */
export class UpdatePoller {
    private ws: WebSocket | null = null;
    private readonly listeners = new Map<string, Set<UpdateListener>>();
    private readonly statusListeners = new Set<ConnectionStatusListener>();
    private readonly debouncers = new Map<UpdateListener, Map<string, DebounceEntry>>();

    private reconnectAttempts = 0;
    private reconnectDelay = 1000;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    private heartbeat: ReturnType<typeof setInterval> | null = null;
    private isConnecting = false;
    private destroyed = false;

    public readonly instanceId: string;

    constructor(private readonly baseUrl: string, private readonly token: string) {
        this.instanceId = generateInstanceId();
        this.connect();
    }

    /** Convert http(s)://host:port to ws(s)://host:port and append `/ws`. */
    private buildWsUrl(): string {
        const trimmed = this.baseUrl.replace(/\/+$/, "");
        const wsBase = trimmed.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
        return `${wsBase}/ws`;
    }

    private connect = () => {
        if (this.destroyed || this.isConnecting) return;
        if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
            return;
        }

        this.isConnecting = true;
        this.notifyStatus();

        try {
            const url = this.buildWsUrl();
            const WS = WebSocket as unknown as new (
                url: string,
                protocols?: string | string[],
                options?: { headers?: Record<string, string> }
            ) => WebSocket;
            this.ws = new WS(url, undefined, {
                headers: {
                    Authorization: `Bearer ${this.token}`,
                    "X-Instance-ID": this.instanceId,
                },
            });
            this.ws.onopen = this.onOpen;
            this.ws.onmessage = this.onMessage;
            this.ws.onclose = this.onClose;
            this.ws.onerror = this.onError;
        } catch (error) {
            console.warn("[UpdatePoller] failed to open socket", error);
            this.isConnecting = false;
            this.notifyStatus();
            this.scheduleReconnect();
        }
    };

    private onOpen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.reconnectDelay = 1000;
        this.notifyStatus();
        this.startHeartbeat();
    };

    private onMessage = (evt: WebSocketMessageEvent) => {
        try {
            const data = typeof evt.data === "string" ? JSON.parse(evt.data) : null;
            if (!data) return;
            switch (data.type) {
                case "ping":
                    this.safeSend({ type: "pong", timestamp: Date.now() });
                    break;
                case "pong":
                    break;
                case "update":
                    this.handleUpdate(data.payload as IUpdate);
                    break;
                default:
                    break;
            }
        } catch (error) {
            console.warn("[UpdatePoller] bad message", error);
        }
    };

    private onClose = () => {
        this.isConnecting = false;
        this.notifyStatus();
        this.stopHeartbeat();
        this.scheduleReconnect();
    };

    private onError = () => {
        this.isConnecting = false;
        this.notifyStatus();
    };

    private startHeartbeat = () => {
        this.stopHeartbeat();
        this.heartbeat = setInterval(() => {
            this.safeSend({ type: "ping" });
        }, HEARTBEAT_INTERVAL_MS);
    };

    private stopHeartbeat = () => {
        if (this.heartbeat) {
            clearInterval(this.heartbeat);
            this.heartbeat = null;
        }
    };

    private scheduleReconnect = () => {
        if (this.destroyed || this.reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) return;

        if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
        this.reconnectAttempts++;

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.connect();
        }, this.reconnectDelay);

        this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY_MS);
    };

    private handleUpdate = (update: IUpdate) => {
        if (update.instanceId && update.instanceId === this.instanceId) {
            return;
        }
        const listeners = this.listeners.get(update.type);
        if (!listeners) return;
        listeners.forEach(listener => this.scheduleDebouncedCallback(listener, update));
    };

    private scheduleDebouncedCallback = (listener: UpdateListener, update: IUpdate) => {
        const key = `${update.type}\x1e${update.record}`;
        let byKey = this.debouncers.get(listener);
        if (!byKey) {
            byKey = new Map();
            this.debouncers.set(listener, byKey);
        }

        const flush = () => {
            const inner = this.debouncers.get(listener);
            if (!inner) return;
            const entry = inner.get(key);
            if (!entry) return;
            inner.delete(key);
            if (inner.size === 0) this.debouncers.delete(listener);
            try {
                listener(entry.latest);
            } catch (error) {
                console.warn("[UpdatePoller] listener error", error);
            }
        };

        const existing = byKey.get(key);
        if (existing) {
            clearTimeout(existing.timeout);
            existing.latest = update;
            existing.timeout = setTimeout(flush, UPDATE_CALLBACK_DEBOUNCE_MS);
        } else {
            byKey.set(key, {
                latest: update,
                timeout: setTimeout(flush, UPDATE_CALLBACK_DEBOUNCE_MS),
            });
        }
    };

    private clearSectionDebouncers = (listener: UpdateListener, section: string) => {
        const inner = this.debouncers.get(listener);
        if (!inner) return;
        const prefix = `${section}\x1e`;
        for (const [key, entry] of [...inner.entries()]) {
            if (key.startsWith(prefix)) {
                clearTimeout(entry.timeout);
                inner.delete(key);
            }
        }
        if (inner.size === 0) this.debouncers.delete(listener);
    };

    private clearAllDebouncers = () => {
        for (const inner of this.debouncers.values()) {
            for (const entry of inner.values()) clearTimeout(entry.timeout);
        }
        this.debouncers.clear();
    };

    private safeSend = (message: unknown) => {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
        try {
            this.ws.send(JSON.stringify(message));
        } catch (error) {
            console.warn("[UpdatePoller] send failed", error);
        }
    };

    private currentStatus = (): ConnectionStatus => {
        const open = this.ws?.readyState === WebSocket.OPEN;
        const connecting = this.isConnecting;
        const disconnected =
            !this.ws ||
            this.ws.readyState === WebSocket.CLOSED ||
            this.ws.readyState === WebSocket.CLOSING;
        return {
            isConnected: open && !connecting && !this.destroyed,
            isConnecting: connecting && !this.destroyed,
            isDisconnected: disconnected && !connecting && !this.destroyed,
        };
    };

    private notifyStatus = () => {
        const status = this.currentStatus();
        this.statusListeners.forEach(cb => {
            try {
                cb(status);
            } catch (error) {
                console.warn("[UpdatePoller] status listener error", error);
            }
        });
    };

    /** Subscribe to updates for a single POLLINGTYPE. Returns an unsubscribe fn. */
    public on = (section: string, listener: UpdateListener): (() => void) => {
        if (!this.listeners.has(section)) {
            this.listeners.set(section, new Set());
        }
        this.listeners.get(section)!.add(listener);
        return () => this.off(section, listener);
    };

    public off = (section: string, listener: UpdateListener) => {
        const set = this.listeners.get(section);
        if (!set) return;
        set.delete(listener);
        this.clearSectionDebouncers(listener, section);
        if (set.size === 0) this.listeners.delete(section);
    };

    public onStatus = (listener: ConnectionStatusListener): (() => void) => {
        this.statusListeners.add(listener);
        try {
            listener(this.currentStatus());
        } catch (error) {
            console.warn("[UpdatePoller] status listener error", error);
        }
        return () => {
            this.statusListeners.delete(listener);
        };
    };

    public destroy = () => {
        this.destroyed = true;
        this.stopHeartbeat();
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            try {
                this.ws.close();
            } catch {
                /* ignore */
            }
            this.ws = null;
        }
        this.clearAllDebouncers();
        this.listeners.clear();
        this.statusListeners.clear();
    };
}

function generateInstanceId(): string {
    const g = globalThis as { crypto?: { randomUUID?: () => string } };
    if (g.crypto?.randomUUID) {
        return g.crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}
