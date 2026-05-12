// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { NodeViewContent, NodeViewProps, NodeViewWrapper } from "@tiptap/react";
import React from "react";

export const Code = ({
    node: {
        attrs: { language: defaultLanguage },
    },
    updateAttributes,
    extension,
}: NodeViewProps) => (
    <NodeViewWrapper className="code-block">
        <select
            contentEditable={false}
            defaultValue={defaultLanguage}
            onChange={event => updateAttributes({ language: event.target.value })}
        >
            <option value="null">auto</option>
            <option disabled>—</option>
            {extension.options.lowlight.listLanguages().map((lang: string, index: number) => (
                <option key={index} value={lang}>
                    {lang}
                </option>
            ))}
        </select>
        <pre>
            <NodeViewContent {...({ as: "code" } as any)} />
        </pre>
    </NodeViewWrapper>
);
