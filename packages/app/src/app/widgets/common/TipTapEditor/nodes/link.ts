// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import Link from "@tiptap/extension-link";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import { getAttributes } from "@tiptap/core";
import { openInNewTab } from "app/utils/browser";

export const ControlClickLink = Link.extend({
    addOptions() {
        return {
            ...this.parent!(),
            openOnClick: false,
            protocols: ["mailto", "tel"],
        };
    },
    addProseMirrorPlugins() {
        const plugins: Plugin[] = this.parent?.() || [];

        const ctrlClickHandler = new Plugin({
            key: new PluginKey("handleControlClick"),
            props: {
                handleClick(view, pos, event) {
                    const attrs = getAttributes(view.state, "link");
                    const link = (event.target as HTMLElement)?.closest("a");

                    const keyPressed = event.ctrlKey || event.metaKey;

                    if (keyPressed && link && attrs.href) {
                        openInNewTab(attrs.href);

                        return true;
                    }

                    return false;
                },
            },
        });

        plugins.push(ctrlClickHandler);

        return plugins;
    },
});
