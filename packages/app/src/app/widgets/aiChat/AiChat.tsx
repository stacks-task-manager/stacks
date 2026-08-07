// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Card,
    Checkbox,
    Classes,
    Colors,
    InputGroup,
    Intent,
    Radio,
    Tooltip,
} from "@blueprintjs/core";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Icon } from "app/components/common";
import { getHashPathname, getProjectLastView, getViewType } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { AiChatActions } from "app/store/actions/aiChat";
import { AiChatStore, type AiChatMessage } from "app/store/aiChat";
import toast from "app/utils/toast";

import { AiChatMarkdown } from "./AiChatMarkdown";

const fabStyle: React.CSSProperties = {
    position: "fixed",
    right: 20,
    bottom: 20,
    zIndex: 45,
    borderRadius: 28,
    width: 56,
    height: 56,
    boxShadow: "0 2px 12px rgba(0,0,0,0.2)",
};

const panelStyle: React.CSSProperties = {
    position: "fixed",
    right: 20,
    bottom: 88,
    width: 380,
    maxWidth: "calc(100vw - 40px)",
    height: 480,
    maxHeight: "calc(100vh - 120px)",
    zIndex: 44,
    display: "flex",
    flexDirection: "column",
    padding: 15,
};

/** Avoid duplicate auto-navigation (e.g. React StrictMode or remounts). */
const redirectedAssistantMessageIds = new Set<string>();

function MessageBubble({
    msg,
    onChoice,
}: {
    msg: AiChatMessage;
    onChoice?: (messageId: string, widgetId: string, optionIds: string[], text: string) => void;
}) {
    const navigate = useNavigate();
    const isUser = msg.role === "user";
    const body = isUser ? msg.content : msg.content.replace(/^\s+/, "");

    const [selected, setSelected] = useState<Record<string, string[]>>({});

    useEffect(() => {
        if (isUser) {
            return;
        }
        const redirects =
            msg.widgets?.filter(
                (w): w is { type: "redirect"; label: string; hashPath: string } => w.type === "redirect"
            ) ?? [];
        if (redirects.length === 0) {
            return;
        }
        if (redirectedAssistantMessageIds.has(msg.id)) {
            return;
        }
        redirectedAssistantMessageIds.add(msg.id);
        const path = redirects[redirects.length - 1]!.hashPath.replace(/^#/, "");
        navigate(path);
    }, [isUser, msg.id, msg.widgets, navigate]);

    const submitChoice = (
        widget: Extract<NonNullable<AiChatMessage["widgets"]>[number], { type: "choice" }>,
        optionIds: string[]
    ) => {
        if (widget.answered || optionIds.length === 0 || !onChoice) {
            return;
        }
        const labels = widget.options
            .filter(option => optionIds.includes(option.id))
            .map(option => option.label);
        if (labels.length > 0) {
            onChoice(msg.id, widget.id, optionIds, `${widget.question}\nSelected: ${labels.join(", ")}`);
        }
    };

    return (
        <div
            style={{
                alignSelf: isUser ? "flex-end" : "flex-start",
                maxWidth: "92%",
                marginBottom: 8,
                padding: "8px 12px",
                borderRadius: 8,
                background: isUser ? Colors.BLUE5 : Colors.LIGHT_GRAY1,
                color: isUser ? "#fff" : Colors.DARK_GRAY3,
                whiteSpace: isUser ? "pre-wrap" : "normal",
                wordBreak: "break-word",
            }}
        >
            {isUser ? body : <AiChatMarkdown>{body}</AiChatMarkdown>}
            {msg.widgets?.map((w, i) => {
                if (w.type === "button") {
                    return (
                        <div key={i} style={{ marginTop: 8 }}>
                            <Button
                                size="small"
                                variant={isUser ? "minimal" : undefined}
                                intent={Intent.PRIMARY}
                                onClick={() => navigate(w.hashPath.replace(/^#/, ""))}
                            >
                                {w.label}
                            </Button>
                        </div>
                    );
                }
                if (w.type !== "choice") {
                    return null;
                }
                const current = selected[w.id] ?? [];
                return (
                    <div key={w.id} style={{ marginTop: 10 }} data-testid={`ai-chat-choice-${w.id}`}>
                        <div style={{ marginBottom: 6, fontWeight: 600 }}>{w.question}</div>
                        {w.control === "buttons" ? (
                            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                                {w.options.map(option => (
                                    <Button
                                        key={option.id}
                                        small
                                        intent={Intent.PRIMARY}
                                        disabled={w.answered || !onChoice}
                                        data-testid={`ai-chat-choice-option-${option.id}`}
                                        onClick={() => submitChoice(w, [option.id])}
                                    >
                                        {option.label}
                                    </Button>
                                ))}
                            </div>
                        ) : (
                            <>
                                {w.options.map(option => {
                                    const checked = current.includes(option.id);
                                    const onChange = () => {
                                        setSelected(previous => {
                                            const values = previous[w.id] ?? [];
                                            const next = checked
                                                ? values.filter(id => id !== option.id)
                                                : w.control === "radio"
                                                ? [option.id]
                                                : [...values, option.id];
                                            return { ...previous, [w.id]: next };
                                        });
                                    };
                                    return w.control === "radio" ? (
                                        <Radio
                                            key={option.id}
                                            label={option.label}
                                            checked={checked}
                                            onChange={onChange}
                                            disabled={w.answered || !onChoice}
                                            data-testid={`ai-chat-choice-option-${option.id}`}
                                        />
                                    ) : (
                                        <Checkbox
                                            key={option.id}
                                            label={option.label}
                                            checked={checked}
                                            onChange={onChange}
                                            disabled={w.answered || !onChoice}
                                            data-testid={`ai-chat-choice-option-${option.id}`}
                                        />
                                    );
                                })}
                                <Button
                                    small
                                    intent={Intent.PRIMARY}
                                    disabled={w.answered || current.length === 0 || !onChoice}
                                    data-testid={`ai-chat-choice-next-${w.id}`}
                                    onClick={() => submitChoice(w, current)}
                                    style={{ marginTop: 4 }}
                                >
                                    {w.submitLabel || "Next"}
                                </Button>
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

export const AiChat: React.FC = () => {
    const serverEnabled = AiChatStore.use(s => s.serverEnabled, shallowEqual);
    const panelOpen = AiChatStore.use(s => s.panelOpen, shallowEqual);
    const messages = AiChatStore.use(s => s.messages, shallowEqual);
    const isAwaitingReply = AiChatStore.use(s => s.isAwaitingReply, shallowEqual);
    const streamingAssistantContent = AiChatStore.use(s => s.streamingAssistantContent, shallowEqual);
    const streamingTextVisible = streamingAssistantContent.replace(/^\s+/, "").length > 0;

    const [draft, setDraft] = useState("");
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }, [messages, streamingAssistantContent, streamingTextVisible, panelOpen]);

    useEffect(() => {
        if (!serverEnabled) {
            return;
        }
        const off = window.updatePoller.onAiChatMessage(payload => {
            const active = AiChatStore.get().activeClientRequestId;
            if (payload.kind === "delta" && payload.clientRequestId === active) {
                AiChatActions.appendAssistantDelta(payload.delta);
            } else if (payload.kind === "done" && payload.clientRequestId === active) {
                AiChatActions.finalizeAssistantTurn(payload.clientRequestId, payload.text, payload.widgets);
            } else if (payload.kind === "error") {
                const id = payload.clientRequestId;
                if (id && id === active) {
                    toast.error(payload.message);
                    AiChatActions.clearActiveChatRequestIfMatch(id);
                }
            }
        });
        return off;
    }, [serverEnabled]);

    const sendMessage = useCallback(
        async (content: string) => {
            if (!content.trim() || isAwaitingReply) {
                return;
            }

            const history = AiChatStore.get().messages.map(m => ({
                role: m.role,
                content: m.role === "assistant" ? m.content.replace(/^\s+/, "") : m.content,
            }));

            const clientRequestId = AiChatActions.appendUserMessage(content);

            const nextMessages = [...history, { role: "user" as const, content }];

            try {
                const route = getHashPathname().split("/").filter(Boolean);
                const clientRoute: Record<string, string> = {
                    section: route[0] ?? "",
                    sectionId: route[1] ?? "",
                };

                if (clientRoute.section === "project") {
                    clientRoute.viewType = getProjectLastView(clientRoute.sectionId);
                } else if (clientRoute.section === "people") {
                    clientRoute.viewType = getViewType();
                }

                await window.updatePoller.sendMessage({
                    type: "ai_chat_request",
                    payload: {
                        clientRequestId,
                        messages: nextMessages,
                        clientRoute,
                    },
                });
            } catch {
                toast.error("Not connected. Check your connection.");
                AiChatActions.clearActiveChatRequestIfMatch(clientRequestId);
            }
        },
        [isAwaitingReply]
    );

    const send = useCallback(async () => {
        if (!draft.trim()) {
            return;
        }
        setDraft("");
        await sendMessage(draft);
    }, [draft, sendMessage]);

    if (!serverEnabled) {
        return null;
    }

    return (
        <>
            <Button
                large
                intent={Intent.PRIMARY}
                icon="chat"
                style={fabStyle}
                onClick={() => AiChatActions.togglePanel()}
                aria-label="Open AI assistant"
            />

            {panelOpen && (
                <Card data-testid="ai-chat-panel" style={panelStyle} elevation={3}>
                    <div
                        style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            marginBottom: 8,
                            gap: 8,
                        }}
                    >
                        <strong>Assistant</strong>
                        <div style={{ display: "flex", gap: 4 }}>
                            <Tooltip content="Clear conversation">
                                <Button
                                    small
                                    minimal
                                    icon="trash"
                                    onClick={() => AiChatActions.clearConversation()}
                                    disabled={isAwaitingReply}
                                />
                            </Tooltip>

                            <Button small minimal icon="cross" onClick={() => AiChatActions.closePanel()} />
                        </div>
                    </div>

                    <div
                        ref={scrollRef}
                        className={Classes.OVERLAY_SCROLL_CONTAINER}
                        style={{ flex: 1, overflowY: "auto", marginBottom: 8 }}
                    >
                        {messages.length === 0 && !streamingTextVisible && (
                            <div className={Classes.TEXT_MUTED} style={{ padding: 8 }}>
                                Ask about your projects and tasks. The assistant uses your current workspace
                                data.
                            </div>
                        )}
                        {messages.map(m => (
                            <MessageBubble
                                key={m.id}
                                msg={m}
                                onChoice={
                                    isAwaitingReply
                                        ? undefined
                                        : (messageId, widgetId, optionIds, text) => {
                                              AiChatActions.answerChoice(messageId, widgetId, optionIds);
                                              void sendMessage(text);
                                          }
                                }
                            />
                        ))}
                        {isAwaitingReply && streamingTextVisible && (
                            <MessageBubble
                                msg={{
                                    id: "streaming",
                                    role: "assistant",
                                    content: streamingAssistantContent,
                                }}
                            />
                        )}
                        {isAwaitingReply && !streamingTextVisible && (
                            <div className={Classes.TEXT_MUTED} style={{ padding: 8 }}>
                                Thinking…
                            </div>
                        )}
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <InputGroup
                            fill
                            placeholder="Message…"
                            value={draft}
                            onChange={e => setDraft(e.target.value)}
                            onKeyDown={e => {
                                if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    void send();
                                }
                            }}
                            autoFocus
                            disabled={isAwaitingReply}
                            rightElement={
                                <Button
                                    variant="minimal"
                                    onClick={() => void send()}
                                    disabled={isAwaitingReply}
                                    icon={<Icon icon="send-03" />}
                                />
                            }
                        />
                    </div>
                </Card>
            )}
        </>
    );
};
