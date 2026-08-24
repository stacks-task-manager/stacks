// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { sortByIdOrder } from "app/utils/taskOrder";

describe("sortByIdOrder", () => {
    it("uses persisted positions without changing the input", () => {
        const items = [{ id: "missing" }, { id: "third" }, { id: "first" }, { id: "second" }];

        expect(sortByIdOrder(items, ["first", "second", "third"], item => item.id)).toEqual([
            { id: "missing" },
            { id: "first" },
            { id: "second" },
            { id: "third" },
        ]);
        expect(items).toEqual([{ id: "missing" }, { id: "third" }, { id: "first" }, { id: "second" }]);
    });

    it("uses the first position when persisted order contains duplicates", () => {
        const items = [{ id: "first" }, { id: "second" }];

        expect(sortByIdOrder(items, ["second", "first", "second"], item => item.id)).toEqual([
            { id: "second" },
            { id: "first" },
        ]);
    });
});
