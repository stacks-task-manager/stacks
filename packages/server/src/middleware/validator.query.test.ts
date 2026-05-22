// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { z } from "zod";
import { validator } from "./validator";

describe("validator query array normalization", () => {
  it("parses repeated keys as arrays and single as string", async () => {
    const app = new Hono();
    const schema = z.object({ ids: z.union([z.array(z.string()), z.string()]), project: z.string().optional() });

    app.get("/test", validator(schema, "query"), c => {
      const data = (c.req as any).valid("query");
      return c.json(data);
    });

    const res1 = await app.request("/test?ids=a&ids=b");
    const body1 = await res1.json();
    expect(Array.isArray(body1.ids)).toBe(true);
    expect(body1.ids).toEqual(["a", "b"]);

    const res2 = await app.request("/test?ids=a");
    const body2 = await res2.json();
    expect(typeof body2.ids).toBe("string");
    expect(body2.ids).toBe("a");
  });
});