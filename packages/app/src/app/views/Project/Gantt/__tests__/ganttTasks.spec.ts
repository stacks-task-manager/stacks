// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ITask } from "@stacks/types";
import { convertToGantt } from "app/views/Project/Gantt/ganttTasks";

const task = (id: string, title: string, parent: string | null = null, subtasksOrder: string[] = []): ITask =>
    ({ id, title, parent, subtasksOrder, project: "project", stack: "stack" } as ITask);

describe("convertToGantt", () => {
    it("builds the hierarchy once and preserves persisted subtask order", () => {
        const result = convertToGantt(
            [
                task("root-b", "Beta"),
                task("child-last", "Last", "root-a"),
                task("root-a", "Alpha", null, ["child-first", "child-last"]),
                task("child-first", "First", "root-a"),
                task("orphan", "Orphan", "missing"),
            ],
            []
        );

        expect(result.map(item => item.id)).toEqual(["root-a", "root-b"]);
        expect(result[0].children.map(item => item.id)).toEqual(["child-first", "child-last"]);
    });
});
