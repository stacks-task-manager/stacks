// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { translate } from "@stacks/translations";
import { getHashPathname } from "app/hooks";
import { MemoryRouter, useLocation } from "react-router-dom";
import { fireEvent, render } from "@testing-library/react";
import { AiChatStore } from "app/store/aiChat";
import { AiChatActions } from "app/store/actions/aiChat";
import { AiChat, MessageBubble } from "app/widgets/aiChat/AiChat";
import type { AiChatWidget } from "@stacks/types";
jest.mock("app/components/common", () => ({ Icon: () => null }));
jest.mock("app/hooks", () => ({
    getHashPathname: jest.fn(() => "/home"),
    getHashSearch: () => "?assignees=user-id",
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
    jest.mocked(translate).mockClear();
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

it("sends a choice reply without storing an extra visible user message", () => {
    const previous = AiChatActions.appendUserMessage("delete the Temp column");
    AiChatActions.finalizeAssistantTurn(previous, "", []);
    const messages = AiChatStore.get().messages;
    const requestId = AiChatActions.appendUserMessage(
        'Confirm delete column: Column: "Temp".\nSelected: Confirm',
        false
    );
    expect(AiChatStore.get().messages).toEqual(messages);
    expect(AiChatStore.get().isAwaitingReply).toBe(true);
    expect(AiChatStore.get().activeClientRequestId).toBe(requestId);
    AiChatStore.init();
    expect(AiChatStore.get().messages.some(message => message.content.includes("Selected: Confirm"))).toBe(
        false
    );
});
it("removes answered mutation confirmations from the visible transcript", () => {
    const view = render(
        <MemoryRouter>
            <MessageBubble
                msg={{
                    id: "confirmed",
                    role: "assistant",
                    content: "",
                    widgets: [
                        {
                            type: "choice",
                            id: "confirmation",
                            pendingActionToken: "token",
                            question: 'Confirm delete column: Column: "Temp".',
                            control: "buttons",
                            answered: true,
                            selectedOptionIds: ["confirm"],
                            options: [
                                { id: "confirm", label: "Confirm" },
                                { id: "cancel", label: "Cancel" },
                            ],
                        },
                    ],
                }}
            />
        </MemoryRouter>
    );
    expect(view.queryByTestId("ai-chat-choice-confirmation")).toBeNull();
    expect(view.container).toBeEmptyDOMElement();
});

it("submits the confirmation context to the server without echoing it in chat", () => {
    HTMLElement.prototype.scrollTo = jest.fn();
    const sendMessage = jest.fn().mockResolvedValue(undefined);
    window.updatePoller = { sendMessage, onAiChatMessage: jest.fn(() => () => {}) } as any;
    AiChatActions.setServerEnabled(true);
    AiChatActions.openPanel();
    const request = AiChatActions.appendUserMessage("delete the Temp column");
    AiChatActions.finalizeAssistantTurn(request, "", [
        {
            type: "choice",
            id: "confirmation",
            pendingActionToken: "server-token",
            question: 'Confirm delete column: Column: "Temp".',
            control: "buttons",
            options: [
                { id: "confirm", label: "Confirm" },
                { id: "cancel", label: "Cancel" },
            ],
        },
    ]);
    const view = render(
        <MemoryRouter>
            <AiChat />
        </MemoryRouter>
    );
    fireEvent.click(view.getByTestId("ai-chat-choice-option-confirm"));
    expect(sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
            payload: expect.objectContaining({
                choiceReply: { token: "server-token", optionIds: ["confirm"] },
                messages: expect.arrayContaining([
                    expect.objectContaining({
                        role: "user",
                        content: expect.stringContaining("Selected: Confirm"),
                    }),
                ]),
            }),
        })
    );
    expect(AiChatStore.get().messages.filter(message => message.role === "user")).toHaveLength(1);
    expect(view.queryByTestId("ai-chat-choice-confirmation")).toBeNull();
    expect(view.container).not.toHaveTextContent("Selected: Confirm");
});

function CurrentRoute() {
    const location = useLocation();
    return <span data-testid="current-route">{location.pathname + location.search}</span>;
}
it("updates query parameters on the same tasks route for an overdue follow-up", () => {
    const view = render(
        <MemoryRouter initialEntries={["/tasks?assignees=user-id"]}>
            <CurrentRoute />
            <MessageBubble
                msg={{
                    id: "overdue-navigation",
                    role: "assistant",
                    content: "",
                    widgets: [
                        {
                            type: "redirect",
                            label: "Show tasks",
                            hashPath: "/tasks?assignees=user-id&overdue=true",
                        },
                    ],
                }}
            />
        </MemoryRouter>
    );
    expect(view.getByTestId("current-route")).toHaveTextContent("/tasks?assignees=user-id&overdue=true");
});
it("changes the task URL only after clicking a link-mode result", () => {
    const view = render(
        <MemoryRouter initialEntries={["/home"]}>
            <CurrentRoute />
            <MessageBubble
                msg={{
                    id: "task-link-mode",
                    role: "assistant",
                    content: "",
                    widgets: [
                        {
                            type: "button",
                            label: "Show tasks",
                            hashPath: "/tasks?assignees=user-id&overdue=true",
                        },
                    ],
                }}
            />
        </MemoryRouter>
    );
    expect(view.getByTestId("current-route")).toHaveTextContent("/home");
    fireEvent.click(view.getByTestId("ai-chat-link-task-link-mode-0"));
    expect(view.getByTestId("current-route")).toHaveTextContent("/tasks?assignees=user-id&overdue=true");
});
it("sends current task URL filters with the next chat request", () => {
    const pathnameMock = jest.mocked(getHashPathname);
    const original = pathnameMock.getMockImplementation();
    const pollerDescriptor = Object.getOwnPropertyDescriptor(window, "updatePoller");
    const scrollDescriptor = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollTo");
    const priorEnabled = AiChatStore.get().serverEnabled;
    const priorPanel = AiChatStore.get().panelOpen;
    pathnameMock.mockReturnValue("/tasks");
    try {
        HTMLElement.prototype.scrollTo = jest.fn();
        const sendMessage = jest.fn().mockResolvedValue(undefined);
        window.updatePoller = {
            sendMessage,
            onAiChatMessage: jest.fn(() => () => {}),
        } as unknown as typeof window.updatePoller;
        AiChatActions.setServerEnabled(true);
        AiChatActions.openPanel();
        const view = render(
            <MemoryRouter>
                <AiChat />
            </MemoryRouter>
        );
        fireEvent.change(view.getByTestId("ai-chat-input"), { target: { value: "only show overdue tasks" } });
        fireEvent.click(view.getByTestId("ai-chat-send"));
        expect(sendMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                payload: expect.objectContaining({
                    clientRoute: expect.objectContaining({ section: "tasks", search: "?assignees=user-id" }),
                }),
            })
        );
    } finally {
        pathnameMock.mockImplementation(original);
        if (pollerDescriptor) Object.defineProperty(window, "updatePoller", pollerDescriptor);
        else Reflect.deleteProperty(window, "updatePoller");
        if (scrollDescriptor) Object.defineProperty(HTMLElement.prototype, "scrollTo", scrollDescriptor);
        else Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
        AiChatActions.setServerEnabled(priorEnabled);
        if (!priorPanel) AiChatActions.closePanel();
    }
});
