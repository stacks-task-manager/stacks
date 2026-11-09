// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { template } from "./promptTemplate";

/** Stable instructions precede all per-turn data; shared by chat and evaluation. */
export function assembleSystemPrompt(
    fragments: readonly string[],
    variables: Record<string, unknown>,
    route: Record<string, unknown>,
    render = template
) {
    const stable = fragments.map(name => render(name, {})).join("\n\n");
    const dynamic = [
        render("request-context.md", variables),
        route.hasClientRoute ? render("client-ui-context.md", route) : "",
    ]
        .filter(Boolean)
        .join("\n\n");
    return {
        stable,
        system: [stable, dynamic].filter(Boolean).join("\n\n"),
        systemMessages: [stable, dynamic]
            .filter(Boolean)
            .map(content => ({ role: "system" as const, content })),
    };
}
