// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import Markdown, { type MarkdownToJSX } from "markdown-to-jsx";
import React from "react";

const options: MarkdownToJSX.Options = {
    disableParsingRawHTML: true,
    overrides: {
        a: {
            props: {
                rel: "noopener noreferrer",
            },
        },
    },
};

/** Renders assistant / LLM markdown (headings, lists, code, links). */
export function AiChatMarkdown({ children }: { children: string }) {
    return (
        <div className="ai-chat-md">
            <Markdown options={options}>{children}</Markdown>
        </div>
    );
}
