// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
// This Jest shim is required by ReactDOMServer.
import { TextEncoder } from "util";
global.TextEncoder = TextEncoder;

import { Comment } from "app/components/common/Comments/Comment";
import { ACTIVITYRESOURCETYPE, IActivityChange, ACTIVITYTYPE } from "@stacks/types";
import ReactDOMServer from "react-dom/server";

const hostile = '<img src=x onerror="window.__securityProbe=1">';

/** Render the real activity-log component and inspect the DOM it produces. */
function renderActivity(change: IActivityChange) {
    const html = ReactDOMServer.renderToStaticMarkup(
        <Comment
            resourceId="task-1"
            mine={false}
            comment={{
                id: "activity-1",
                resourceId: "task-1",
                type: ACTIVITYTYPE.LOG,
                resourceType: ACTIVITYRESOURCETYPE.TASK,
                change,
                content: "",
                created: new Date(),
                updated: new Date(),
            }}
        />
    );
    const container = document.createElement("div");
    container.innerHTML = html;
    return container;
}

describe("activity log rendering", () => {
    it("keeps a hostile renamed title inert", () => {
        const container = renderActivity({ field: "title", before: "plan", after: hostile });

        expect(container.querySelectorAll("img")).toHaveLength(0);
        expect(container.querySelectorAll("script")).toHaveLength(0);
        expect(container.querySelectorAll("[data-testid='activity-log-entry']")).toHaveLength(1);
        expect(container.textContent).toContain(hostile);
    });

    it("keeps a hostile title inert when it is the first title", () => {
        const container = renderActivity({ field: "title", after: hostile });

        expect(container.querySelectorAll("img")).toHaveLength(0);
        expect(container.querySelectorAll("script")).toHaveLength(0);
        expect(container.textContent).toContain(hostile);
    });

    it("still marks the removed middle of an ordinary rename", () => {
        const container = renderActivity({
            field: "title",
            before: "quarterly report v1",
            after: "quarterly report v2",
        });

        expect(container.querySelectorAll("del")).toHaveLength(1);
        expect(container.querySelector("del")?.textContent).toEqual("1");
        expect(container.querySelector("del")?.nextSibling?.textContent).toEqual("2");
    });

    it("still marks a title that is set for the first time", () => {
        const container = renderActivity({ field: "title", after: "Ship notes" });

        expect(container.querySelectorAll("ins")).toHaveLength(1);
        expect(container.querySelector("ins")?.textContent).toEqual("Ship notes");
    });
});
