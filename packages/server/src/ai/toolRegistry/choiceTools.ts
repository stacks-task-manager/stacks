// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/** AI tools that ask the user for a structured answer. */
import { randomUUID } from "crypto";
import { z } from "zod";
import { defineTool } from "./defineTool";

const choiceOptionSchema = z.object({
    id: z.string().min(1),
    label: z.string().min(1),
    value: z.string().optional(),
});

export const choiceAiTools = [
    defineTool({
        name: "askUserChoice",
        description:
            "Ask the user a concise question with selectable options. Use buttons for an immediate single choice, radio for one choice with a Next button, or checkbox for multiple choices with a Next button. Returns a choice widget that renders the question and options, so do not also repeat the question or options in prose. This only asks — it does not perform the action. To move/update/create based on the answer, wait for the user's selection (sent back as the next message) and then call the action tool afterwards, not in this same turn. Ask exactly one question per call.",
        inputSchema: z.object({
            question: z.string().min(1).describe("The question shown above the selectable options."),
            control: z.enum(["buttons", "radio", "checkbox"]),
            options: z.array(choiceOptionSchema).min(1).max(10),
            submitLabel: z.string().min(1).optional().describe("Label for the radio/checkbox submit button."),
        }),
        execute: async ({ question, control, options, submitLabel }) => ({
            type: "choice" as const,
            id: randomUUID(),
            question,
            control,
            options,
            ...(submitLabel ? { submitLabel } : {}),
        }),
    }),
];
