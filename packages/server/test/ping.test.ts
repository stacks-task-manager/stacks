// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, test, expect } from "vitest";
import app from "../src/index";

describe("Ping", () => {
    test("Ping the server", async () => {
        const res = await app.request("/ping");
        expect(res.status).toBe(200);
        const response = { message: "pong" };
        expect(await res.text()).toBe(JSON.stringify(response));
    });
});
