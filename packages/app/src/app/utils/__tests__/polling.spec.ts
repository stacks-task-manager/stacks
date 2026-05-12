// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IUpdate, POLLINGACTIONS, POLLINGTYPE, USER_ONLINE_STATUS } from "@stacks/types";
import { PeopleActions } from "app/store/actions";

jest.mock("app/hooks", () => ({
    getMe: jest.fn(() => ({ id: "user-1", admin: false, role: null })),
}));

jest.mock("app/store/actions", () => ({
    PeopleActions: {
        updateOnlineStatus: jest.fn(),
    },
}));

jest.mock("app/store/people", () => ({
    PeopleStore: {
        get: jest.fn(() => ({ me: "me-id" })),
    },
}));

const wsInstances: MockWebSocket[] = [];

class MockWebSocket {
    static OPEN = 1;
    static CLOSING = 2;
    static CLOSED = 3;

    url: string;
    readyState = MockWebSocket.OPEN;
    onopen: ((ev: Event) => void) | null = null;
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onclose: ((ev: CloseEvent) => void) | null = null;
    onerror: ((ev: Event) => void) | null = null;
    send = jest.fn();
    close = jest.fn();

    constructor(url: string) {
        this.url = url;
        wsInstances.push(this);
    }
}

const OriginalWebSocket = globalThis.WebSocket;

let UpdatePoller: typeof import("app/utils/polling").UpdatePoller;

function makeUpdate(overrides: Partial<IUpdate> = {}): IUpdate {
    return {
        type: POLLINGTYPE.STACK,
        record: "stack-1",
        user: "user-1",
        action: POLLINGACTIONS.UPDATE,
        timestamp: 1,
        ...overrides,
    };
}

function emitUpdate(update: IUpdate) {
    const ws = wsInstances[wsInstances.length - 1];
    if (!ws?.onmessage) {
        throw new Error("no WebSocket onmessage handler");
    }
    ws.onmessage({ data: JSON.stringify({ type: "update", payload: update }) } as MessageEvent);
}

describe("UpdatePoller", () => {
    beforeAll(async () => {
        Object.defineProperty(window, "location", {
            value: { protocol: "http:", hostname: "localhost", port: "3000" },
            writable: true,
            configurable: true,
        });
        globalThis.WebSocket = MockWebSocket as unknown as typeof WebSocket;
        ({ UpdatePoller } = await import("app/utils/polling"));
    });

    afterAll(() => {
        globalThis.WebSocket = OriginalWebSocket;
    });

    let poller: InstanceType<typeof UpdatePoller>;

    beforeEach(() => {
        jest.useFakeTimers();
        wsInstances.length = 0;
        poller = new UpdatePoller(null);
    });

    afterEach(() => {
        poller.destroy();
        jest.useRealTimers();
    });

    describe("debounced update callbacks", () => {
        it("coalesces multiple updates with the same type and record into one callback with the latest payload", () => {
            const cb = jest.fn();
            poller.on(POLLINGTYPE.STACK, cb);

            emitUpdate(makeUpdate({ timestamp: 10 }));
            emitUpdate(makeUpdate({ timestamp: 20 }));
            emitUpdate(makeUpdate({ timestamp: 30, action: POLLINGACTIONS.DELETED }));

            expect(cb).not.toHaveBeenCalled();

            jest.advanceTimersByTime(100);

            expect(cb).toHaveBeenCalledTimes(1);
            expect(cb.mock.calls[0][0]).toMatchObject({
                timestamp: 30,
                action: POLLINGACTIONS.DELETED,
            });
            expect(cb.mock.calls[0][1]).toBe(true);
        });

        it("invokes separate callbacks for different record ids", () => {
            const cb = jest.fn();
            poller.on(POLLINGTYPE.STACK, cb);

            emitUpdate(makeUpdate({ record: "a", timestamp: 1 }));
            emitUpdate(makeUpdate({ record: "b", timestamp: 2 }));

            jest.advanceTimersByTime(100);

            expect(cb).toHaveBeenCalledTimes(2);
            expect(cb.mock.calls.map(c => c[0].record)).toEqual(expect.arrayContaining(["a", "b"]));
        });

        it("does not fire a coalesced callback after off() clears the pending timer", () => {
            const cb = jest.fn();
            const unsubscribe = poller.on(POLLINGTYPE.STACK, cb);

            emitUpdate(makeUpdate());
            unsubscribe();
            jest.advanceTimersByTime(100);

            expect(cb).not.toHaveBeenCalled();
        });

        it("does not fire a coalesced callback if destroy() runs before the debounce elapses", () => {
            const cb = jest.fn();
            poller.on(POLLINGTYPE.STACK, cb);

            emitUpdate(makeUpdate());
            poller.destroy();
            jest.advanceTimersByTime(100);

            expect(cb).not.toHaveBeenCalled();
        });

        it("skips listeners when update.instanceId matches the poller instance", () => {
            const cb = jest.fn();
            poller.on(POLLINGTYPE.STACK, cb);

            emitUpdate(makeUpdate({ instanceId: poller.instanceId }));

            jest.advanceTimersByTime(100);

            expect(cb).not.toHaveBeenCalled();
        });

        it("debounces document vs documents independently (no prefix collision)", () => {
            const cb = jest.fn();
            poller.on(POLLINGTYPE.DOCUMENT, cb);
            poller.on(POLLINGTYPE.DOCUMENTS, cb);

            emitUpdate(
                makeUpdate({
                    type: POLLINGTYPE.DOCUMENT,
                    record: "same-id",
                    timestamp: 1,
                })
            );
            emitUpdate(
                makeUpdate({
                    type: POLLINGTYPE.DOCUMENTS,
                    record: "same-id",
                    timestamp: 2,
                })
            );

            jest.advanceTimersByTime(100);

            expect(cb).toHaveBeenCalledTimes(2);
        });
    });

    describe("AI chat WebSocket payloads", () => {
        it("dispatches ai_chat_delta to subscribers", () => {
            const cb = jest.fn();
            poller.onAiChatMessage(cb);

            const ws = wsInstances[wsInstances.length - 1];
            ws.onmessage?.({
                data: JSON.stringify({
                    type: "ai_chat_delta",
                    payload: { clientRequestId: "r1", delta: "hello" },
                }),
            } as MessageEvent);

            expect(cb).toHaveBeenCalledWith({
                kind: "delta",
                clientRequestId: "r1",
                delta: "hello",
            });
        });
    });

    describe("user status updates", () => {
        it("forwards user_status_updated to PeopleActions when not self and not same instance", () => {
            const ws = wsInstances[wsInstances.length - 1];
            ws.onmessage?.({
                data: JSON.stringify({
                    type: "user_status_updated",
                    payload: {
                        user: "other-user",
                        status: USER_ONLINE_STATUS.ONLINE,
                        instanceId: "remote-instance",
                    },
                }),
            } as MessageEvent);

            expect(PeopleActions.updateOnlineStatus).toHaveBeenCalledWith("other-user", "online");
        });
    });
});
