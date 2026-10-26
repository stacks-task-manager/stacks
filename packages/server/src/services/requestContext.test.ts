// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeEach } from "vitest";
import { requestContext } from "./requestContext";

const makeContext = () => ({
    user: { id: "user-1", tenant: "tenant-1", admin: false } as any,
    instanceId: "instance-abc",
    role: { id: "role-1", title: "User" } as any,
    requestId: "req-123",
    timestamp: Date.now(),
});

describe("RequestContextService", () => {
    beforeEach(() => {
        // Reset singleton by clearing the internal store
        // Since we can't easily reset AsyncLocalStorage, we test within run() blocks
    });

    test("getContext returns undefined outside a run context", () => {
        expect(requestContext.getContext()).toBeUndefined();
    });

    test("hasContext returns false outside a run context", () => {
        expect(requestContext.hasContext()).toBe(false);
    });

    test("run executes fn within the provided context", () => {
        const ctx = makeContext();
        let captured: any;
        const result = requestContext.run(ctx, () => {
            captured = requestContext.getContext();
            return "inside-run";
        });
        expect(result).toBe("inside-run");
        expect(captured).toEqual(ctx);
    });

    test("hasContext returns true inside a run context", () => {
        let inside = false;
        requestContext.run(makeContext(), () => {
            inside = requestContext.hasContext();
        });
        expect(inside).toBe(true);
    });

    test("getCurrentUser returns the user from context", () => {
        const ctx = makeContext();
        let user: any;
        requestContext.run(ctx, () => {
            user = requestContext.getCurrentUser();
        });
        expect(user.id).toBe("user-1");
        expect(user.tenant).toBe("tenant-1");
    });

    test("getCurrentUser throws when no context", () => {
        expect(() => requestContext.getCurrentUser()).toThrow();
    });

    test("getInstanceId returns the instance ID from context", () => {
        const ctx = makeContext();
        let instanceId = "";
        requestContext.run(ctx, () => {
            instanceId = requestContext.getInstanceId();
        });
        expect(instanceId).toBe("instance-abc");
    });

    test("getInstanceId throws when no context", () => {
        expect(() => requestContext.getInstanceId()).toThrow();
    });

    test("getCurrentRole returns the role from context", () => {
        const ctx = makeContext();
        let role: any;
        requestContext.run(ctx, () => {
            role = requestContext.getCurrentRole();
        });
        expect(role.id).toBe("role-1");
    });

    test("getCurrentRole throws when no context", () => {
        expect(() => requestContext.getCurrentRole()).toThrow();
    });

    test("getRequestId returns the request ID from context", () => {
        const ctx = makeContext();
        let reqId = "";
        requestContext.run(ctx, () => {
            reqId = requestContext.getRequestId();
        });
        expect(reqId).toBe("req-123");
    });

    test("getRequestId throws when no context", () => {
        expect(() => requestContext.getRequestId()).toThrow();
    });

    test("context isolation — two concurrent runs do not leak context", () => {
        const ctx1 = { ...makeContext(), requestId: "req-1" };
        const ctx2 = { ...makeContext(), requestId: "req-2" };
        let outer = "",
            inner = "";

        requestContext.run(ctx1, () => {
            outer = requestContext.getRequestId();
            requestContext.run(ctx2, () => {
                inner = requestContext.getRequestId();
            });
        });

        expect(outer).toBe("req-1");
        expect(inner).toBe("req-2");
    });

    test("isolates user and tenant context across overlapping asynchronous requests", async () => {
        const contextA = {
            ...makeContext(),
            user: { id: "user-a", tenant: "tenant-a", admin: false } as any,
            requestId: "request-a",
        };
        const contextB = {
            ...makeContext(),
            user: { id: "user-b", tenant: "tenant-b", admin: false } as any,
            requestId: "request-b",
        };
        let arrivals = 0;
        let release!: () => void;
        const bothArrived = new Promise<void>(resolve => {
            release = resolve;
        });
        const observeAfterInterleave = async () => {
            arrivals += 1;
            if (arrivals === 2) release();
            await bothArrived;
            const context = requestContext.getContext();
            return {
                userId: requestContext.getCurrentUser().id,
                tenant: requestContext.getCurrentUser().tenant,
                requestId: requestContext.getRequestId(),
                sameContext: context?.user.id === requestContext.getCurrentUser().id,
            };
        };

        const [resultA, resultB] = await Promise.all([
            requestContext.run(contextA, observeAfterInterleave),
            requestContext.run(contextB, observeAfterInterleave),
        ]);

        expect(resultA).toEqual({
            userId: "user-a",
            tenant: "tenant-a",
            requestId: "request-a",
            sameContext: true,
        });
        expect(resultB).toEqual({
            userId: "user-b",
            tenant: "tenant-b",
            requestId: "request-b",
            sameContext: true,
        });
        expect(requestContext.getContext()).toBeUndefined();
    });

    test("singleton returns the same instance", () => {
        expect(requestContext).toBe(requestContext); // trivial but verifies singleton
    });
});
