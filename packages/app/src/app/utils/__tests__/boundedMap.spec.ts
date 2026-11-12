// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { setBoundedMapValue } from "app/utils/boundedMap";

it("evicts the oldest entry when a bounded map exceeds its limit", () => {
    const values = new Map<string, boolean>();

    setBoundedMapValue(values, "first", true, 2);
    setBoundedMapValue(values, "second", true, 2);
    setBoundedMapValue(values, "third", true, 2);

    expect([...values.keys()]).toEqual(["second", "third"]);
});

it("removes entries set to false", () => {
    const values = new Map<string, boolean>([["task", true]]);

    setBoundedMapValue(values, "task", false, 2);

    expect(values.has("task")).toBe(false);
});
