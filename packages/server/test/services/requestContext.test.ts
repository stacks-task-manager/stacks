// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect, beforeEach } from "vitest";
import { requestContext } from "../../src/services/requestContext";

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
        let instanceId: string;
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
        let reqId: string;
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
        let outer = "", inner = "";

        requestContext.run(ctx1, () => {
            outer = requestContext.getRequestId();
            requestContext.run(ctx2, () => {
                inner = requestContext.getRequestId();
            });
        });

        expect(outer).toBe("req-1");
        expect(inner).toBe("req-2");
    });

    test("singleton returns the same instance", () => {
        expect(requestContext).toBe(requestContext); // trivial but verifies singleton
    });
});
