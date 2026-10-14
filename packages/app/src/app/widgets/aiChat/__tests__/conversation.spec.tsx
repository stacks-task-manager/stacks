// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { MemoryRouter } from "react-router-dom";
import { fireEvent, render } from "@testing-library/react";
import { AiChatStore } from "app/store/aiChat";
import { AiChatActions } from "app/store/actions/aiChat";
import { MessageBubble } from "app/widgets/aiChat/AiChat";
import type { AiChatWidget } from "@stacks/types";
jest.mock("app/components/common", () => ({ Icon: () => null }));
jest.mock("app/hooks", () => ({
    getHashPathname: () => "/home",
    getProjectLastView: () => "board",
    getViewType: () => "list",
}));
jest.mock("app/widgets/aiChat/AiChatMarkdown", () => ({
    AiChatMarkdown: () => <span data-testid="markdown" />,
}));
jest.mock("@stacks/translations", () => ({ translate: jest.fn((key: string) => key) }));
const widgets: AiChatWidget[] = [
    {
        type: "result",
        label: "Projects",
        items: [{ label: "Website", fields: [{ label: "Title", value: "Website" }], hashPath: "/home" }],
    },
];
beforeEach(() => {
    localStorage.clear();
    AiChatActions.clearConversation();
});
it("persists textless results and conversation identity, and clears them together", () => {
    const conversation = AiChatStore.get().conversationId;
    const id = AiChatActions.appendUserMessage("List projects");
    AiChatActions.finalizeAssistantTurn(id, "", widgets);
    AiChatStore.init();
    expect(AiChatStore.get().conversationId).toBe(conversation);
    expect(AiChatStore.get().messages[1]).toMatchObject({ content: "", widgets });
    AiChatActions.clearConversation();
    expect(AiChatStore.get().conversationId).not.toBe(conversation);
    expect(AiChatStore.get().messages).toEqual([]);
});
it("renders results without an empty markdown bubble", () => {
    const view = render(
        <MemoryRouter>
            <MessageBubble msg={{ id: "result", role: "assistant", content: "", widgets }} />
        </MemoryRouter>
    );
    expect(view.getByTestId("ai-chat-result")).toHaveTextContent("Website");
    expect(view.queryByTestId("markdown")).toBeNull();
});
it("forwards a pending choice's option identifiers for structured replies", () => {
    const selected = jest.fn();
    const view = render(
        <MemoryRouter>
            <MessageBubble
                onChoice={selected}
                msg={{
                    id: "reply",
                    role: "assistant",
                    content: "",
                    widgets: [
                        {
                            type: "choice",
                            id: "choice",
                            pendingActionToken: "server-token",
                            question: "Choose project",
                            control: "buttons",
                            options: [{ id: "opaque-id", label: "Website" }],
                        },
                    ],
                }}
            />
        </MemoryRouter>
    );
    fireEvent.click(view.getByTestId("ai-chat-choice-option-opaque-id"));
    expect(selected).toHaveBeenCalledWith("reply", "choice", ["opaque-id"], expect.any(String));
});

it("renders dynamic confirmation text without treating it as a translation key", () => {
    const { translate } = require("@stacks/translations");
    translate.mockClear();
    const question = "Column: project: example; title: Col 3";
    const view = render(
        <MemoryRouter>
            <MessageBubble
                msg={{
                    id: "reply",
                    role: "assistant",
                    content: "",
                    widgets: [
                        {
                            type: "choice",
                            id: "choice",
                            question,
                            control: "buttons",
                            options: [{ id: "confirm", label: "Confirm" }],
                        },
                    ],
                }}
            />
        </MemoryRouter>
    );
    expect(view.container).toHaveTextContent(question);
    expect(translate).not.toHaveBeenCalledWith(question);
});

it("exposes clickable radio labels and separate disabled input identifiers", () => {
    const view = render(
        <MemoryRouter>
            <MessageBubble
                onChoice={jest.fn()}
                msg={{
                    id: "radio",
                    role: "assistant",
                    content: "",
                    widgets: [
                        {
                            type: "choice",
                            id: "priority",
                            question: "Priority?",
                            control: "radio",
                            options: [{ id: "low", label: "Low" }],
                        },
                    ],
                }}
            />
        </MemoryRouter>
    );
    expect(view.getByTestId("ai-chat-choice-option-low")).toHaveTextContent("Low");
    fireEvent.click(view.getByTestId("ai-chat-choice-option-low"));
    expect(view.getByTestId("ai-chat-choice-input-low")).toBeChecked();
    expect(view.getByTestId("ai-chat-choice-next-priority")).toBeEnabled();
});
