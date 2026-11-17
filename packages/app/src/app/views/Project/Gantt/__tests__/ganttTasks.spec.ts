// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IPerson, ITask } from "@stacks/types";
import { convertToGantt } from "app/views/Project/Gantt/ganttTasks";

const task = (id: string, title: string, parent: string | null = null, subtasksOrder: string[] = []): ITask =>
    ({ id, title, parent, subtasksOrder, project: "project", stack: "stack" }) as ITask;

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

describe("Gantt assignees", () => {
    it("resolves assigned task people and ignores unknown ids", () => {
        const person = {
            id: "person-1",
            firstName: "Ada",
            lastName: "Lovelace",
        } as IPerson;
        const result = convertToGantt(
            [{ ...task("assigned", "Assigned"), assignees: [person.id, "missing"] }],
            [],
            [person]
        );

        expect(result[0].assignees).toEqual([person]);
    });
});

describe("Gantt date fallbacks", () => {
    it("retains undated tasks and fills a single missing endpoint", () => {
        const date = new Date(2026, 9, 26, 10);
        const result = convertToGantt(
            [
                { ...task("due", "A"), duedate: date },
                { ...task("start", "B"), startdate: date },
                task("undated", "C"),
            ],
            []
        );
        expect(result[0].startDate?.getHours()).toBe(0);
        expect(result[0].endDate).toEqual(date);
        expect(result[1].startDate).toEqual(date);
        expect(result[1].endDate?.getHours()).toBe(23);
        expect(result[2].startDate).toBeNull();
        expect(result[2].endDate).toBeNull();
    });
});
