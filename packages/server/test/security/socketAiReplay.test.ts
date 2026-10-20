// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ stream: vi.fn(), debug: vi.fn() }));
vi.mock("ai", async importOriginal => {
    const actual = (await importOriginal()) as Record<string, unknown>;
    return { ...actual, streamText: mocks.stream, stepCountIs: () => () => false };
});
vi.mock("@ai-sdk/openai", () => ({ createOpenAI: () => ({ chat: () => ({}) }) }));
vi.mock("../../src/ai/model", () => ({ createLlmModel: () => ({}), LLM_GENERATION_SETTINGS: {} }));
vi.mock("../../src/ai/debugLog", () => ({ appendAiChatDebugTurn: mocks.debug }));

import {
    RateLimitCounterEntity,
    RateLimitLeaseEntity,
    RoleEntity,
    SessionEntity,
    TenantEntity,
    UserEntity,
} from "@stacks/db";
import { randomUUID } from "node:crypto";
import { startSocketHarness } from "../helpers/socketHarness";
import { mintSessionToken } from "../helpers/authHelper";
import { rateLimitKeyHash, rateLimitWindowStart } from "../../src/utils/rateLimit";
import { getConversation, issueChoice } from "../../src/ai/conversation";

const envKeys = ["AI_CHAT_ENABLED", "AI_BASE_URL", "AI_OPENAI_BASE_URL", "AI_MODEL", "AI_TOOL_BACKEND"];
const previousEnv: Record<string, string | undefined> = {};

const getAiFrames = (frames: string[]) =>
    frames.map(frame => JSON.parse(frame)).filter(frame => frame.type.startsWith("ai_chat_"));

const sendChat = (
    client: any,
    conversationId: string,
    clientRequestId: string,
    content: string,
    choiceReply?: { token: string; optionIds: string[] }
) => {
    client.send(
        JSON.stringify({
            type: "ai_chat_request",
            timestamp: Date.now(),
            payload: {
                conversationId,
                clientRequestId,
                messages: [{ role: "user", content }],
                ...(choiceReply ? { choiceReply } : {}),
            },
        })
    );
};

afterEach(() => {
    for (const key of envKeys) {
        if (previousEnv[key] === undefined) delete process.env[key];
        else process.env[key] = previousEnv[key];
    }
    mocks.stream.mockReset();
    mocks.debug.mockReset();
});

describe("WebSocket AI request replay isolation", () => {
    it("rejects blank user prompts before charging the AI budget", async () => {
        for (const key of envKeys) previousEnv[key] = process.env[key];
        process.env.AI_CHAT_ENABLED = "true";
        process.env.AI_BASE_URL = "http://model.test/v1";
        process.env.AI_OPENAI_BASE_URL = "";
        process.env.AI_MODEL = "socket-blank-prompt-test";
        process.env.AI_TOOL_BACKEND = "local";

        const tenant = await TenantEntity.findOne({ where: { disabled: false } });
        expect(tenant).not.toBeNull();
        const tenantId = String(tenant!.get("id"));
        const role = await RoleEntity.findOne({ where: { title: "User", tenant: tenantId } });
        expect(role).not.toBeNull();
        const user = await UserEntity.create({
            email: `socket-blank-prompt-${randomUUID()}@example.test`,
            password: randomUUID(),
            firstName: "Blank Prompt",
            lastName: "Fixture",
            real: false,
            admin: false,
            role: String(role!.get("id")),
            tenant: tenantId,
        });
        const userId = String(user.get("id"));
        const session = await mintSessionToken(userId, tenantId, 600);
        const harness = await startSocketHarness();
        const userBudgetKey = rateLimitKeyHash("ai-chat-user", userId);
        const tenantBudgetKey = rateLimitKeyHash("ai-chat-tenant", tenantId);
        mocks.stream.mockImplementation(() => ({
            consumeStream: async () => undefined,
            text: Promise.resolve("Valid prompt response"),
        }));

        try {
            const socket = await harness.openClient({ Authorization: `Bearer ${session.token}` });
            expect(socket.opened).toBe(true);
            const blankRequestId = `blank-${randomUUID()}`;
            sendChat(socket.client, `blank-${randomUUID()}`, blankRequestId, " \t\n ");
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socket.frames).some(
                        frame =>
                            frame.type === "ai_chat_error" &&
                            frame.payload?.clientRequestId === blankRequestId
                    )
                )
            ).toBe(true);
            expect(
                getAiFrames(socket.frames).find(
                    frame =>
                        frame.type === "ai_chat_error" && frame.payload?.clientRequestId === blankRequestId
                )?.payload.message
            ).toBe("Chat message cannot be empty");
            expect(mocks.stream).not.toHaveBeenCalled();
            expect(await RateLimitCounterEntity.findOne({ where: { keyHash: userBudgetKey } })).toBeNull();
            expect(await RateLimitCounterEntity.findOne({ where: { keyHash: tenantBudgetKey } })).toBeNull();

            const validRequestId = `valid-${randomUUID()}`;
            sendChat(socket.client, `valid-${randomUUID()}`, validRequestId, "A valid prompt");
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socket.frames).some(
                        frame =>
                            frame.type === "ai_chat_done" && frame.payload?.clientRequestId === validRequestId
                    )
                )
            ).toBe(true);
            expect(mocks.stream).toHaveBeenCalledOnce();
            expect(
                Number(
                    (await RateLimitCounterEntity.findOne({ where: { keyHash: userBudgetKey } }))?.get("hits")
                )
            ).toBe(1);
            expect(
                Number(
                    (await RateLimitCounterEntity.findOne({ where: { keyHash: tenantBudgetKey } }))?.get(
                        "hits"
                    )
                )
            ).toBe(1);
        } finally {
            await harness.close();
            const keyHashes = [
                userBudgetKey,
                tenantBudgetKey,
                rateLimitKeyHash("websocket-message-user", userId),
                rateLimitKeyHash("ai-chat-concurrency-user", userId),
            ];
            await RateLimitCounterEntity.destroy({ where: { keyHash: keyHashes } });
            await RateLimitLeaseEntity.destroy({ where: { keyHash: keyHashes } });
            await SessionEntity.destroy({ where: { userId }, force: true });
            await user.destroy({ force: true });
        }
    }, 15_000);

    it("deduplicates one caller's request while isolating another user's colliding IDs", async () => {
        for (const key of envKeys) previousEnv[key] = process.env[key];
        process.env.AI_CHAT_ENABLED = "true";
        process.env.AI_OPENAI_BASE_URL = "http://model.test/v1";
        process.env.AI_MODEL = "socket-replay-test";
        process.env.AI_TOOL_BACKEND = "local";

        const systemUser = await UserEntity.findOne({ where: { system: true } });
        expect(systemUser).not.toBeNull();
        const actorId = String(systemUser!.get("id"));
        const tenantId = randomUUID();
        const tenant = await TenantEntity.create({
            id: tenantId,
            title: "Socket replay fixture",
            description: "Temporary test tenant",
            disabled: false,
            expiry: new Date(Date.now() + 60 * 60 * 1000),
            createdBy: actorId,
            updatedBy: actorId,
        });
        const role = await RoleEntity.create({
            title: `Socket replay ${randomUUID()}`,
            description: "Temporary test role",
            access: {},
            disabled: false,
            tenant: tenantId,
            createdBy: actorId,
            updatedBy: actorId,
        });
        const users = await Promise.all(
            ["A", "B"].map(label =>
                UserEntity.create({
                    email: `socket-replay-${label}-${randomUUID()}@example.test`,
                    password: randomUUID(),
                    firstName: `Caller ${label}`,
                    lastName: "Fixture",
                    real: false,
                    admin: false,
                    role: String(role.get("id")),
                    tenant: tenantId,
                })
            )
        );
        const userIds = users.map(user => String(user.get("id")));
        const sessions = await Promise.all(userIds.map(id => mintSessionToken(id, tenantId, 600)));
        const harness = await startSocketHarness();
        let releaseFirstStream: (() => void) | undefined;
        const firstStreamGate = new Promise<void>(resolve => {
            releaseFirstStream = resolve;
        });
        mocks.stream
            .mockImplementationOnce(() => ({
                consumeStream: () => firstStreamGate,
                text: Promise.resolve("Caller A response"),
            }))
            .mockImplementationOnce(() => ({
                consumeStream: async () => undefined,
                text: Promise.resolve("Caller B response"),
            }));
        const conversationId = `shared-${randomUUID()}`;
        const clientRequestId = `request-${randomUUID()}`;

        try {
            const socketA = await harness.openClient({ Authorization: `Bearer ${sessions[0].token}` });
            const socketB = await harness.openClient({ Authorization: `Bearer ${sessions[1].token}` });
            expect(socketA.opened).toBe(true);
            expect(socketB.opened).toBe(true);

            sendChat(socketA.client, conversationId, clientRequestId, "List my tasks");
            expect(await harness.waitFor(async () => mocks.stream.mock.calls.length === 1)).toBe(true);

            sendChat(socketA.client, conversationId, clientRequestId, "Replace the first request");
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketA.frames).some(
                        frame =>
                            frame.type === "ai_chat_error" &&
                            frame.payload?.message === "Chat request already running"
                    )
                )
            ).toBe(true);
            expect(mocks.stream).toHaveBeenCalledTimes(1);

            sendChat(socketB.client, conversationId, clientRequestId, "List my tasks too");
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketB.frames).some(
                        frame => frame.type === "ai_chat_done" && frame.payload?.text === "Caller B response"
                    )
                )
            ).toBe(true);
            expect(mocks.stream).toHaveBeenCalledTimes(2);

            releaseFirstStream?.();
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketA.frames).some(
                        frame => frame.type === "ai_chat_done" && frame.payload?.text === "Caller A response"
                    )
                )
            ).toBe(true);

            sendChat(socketA.client, conversationId, clientRequestId, "Forged changed replay A");
            sendChat(socketB.client, conversationId, clientRequestId, "Forged changed replay B");
            expect(
                await harness.waitFor(
                    async () =>
                        getAiFrames(socketA.frames).filter(frame => frame.type === "ai_chat_done").length ===
                            2 &&
                        getAiFrames(socketB.frames).filter(frame => frame.type === "ai_chat_done").length ===
                            2
                )
            ).toBe(true);

            expect(
                getAiFrames(socketA.frames)
                    .filter(frame => frame.type === "ai_chat_done")
                    .map(frame => frame.payload.text)
            ).toEqual(["Caller A response", "Caller A response"]);
            expect(
                getAiFrames(socketB.frames)
                    .filter(frame => frame.type === "ai_chat_done")
                    .map(frame => frame.payload.text)
            ).toEqual(["Caller B response", "Caller B response"]);
            expect(mocks.stream).toHaveBeenCalledTimes(2);

            const forgedChoiceRequestId = `forged-choice-${randomUUID()}`;
            const forgedChoice = { token: `forged-${randomUUID()}`, optionIds: ["confirm"] };
            sendChat(socketA.client, conversationId, forgedChoiceRequestId, "Confirm", forgedChoice);
            sendChat(socketB.client, conversationId, forgedChoiceRequestId, "Confirm", forgedChoice);
            expect(
                await harness.waitFor(async () =>
                    [socketA, socketB].every(socket =>
                        getAiFrames(socket.frames).some(
                            frame =>
                                frame.type === "ai_chat_error" &&
                                frame.payload?.clientRequestId === forgedChoiceRequestId &&
                                frame.payload?.message === "Choice expired or invalid"
                        )
                    )
                )
            ).toBe(true);
            for (const socket of [socketA, socketB]) {
                expect(
                    getAiFrames(socket.frames).filter(
                        frame =>
                            frame.type === "ai_chat_error" &&
                            frame.payload?.clientRequestId === forgedChoiceRequestId
                    )
                ).toHaveLength(1);
            }
            expect(mocks.stream).toHaveBeenCalledTimes(2);

            const pendingConversationId = `pending-${randomUUID()}`;
            const pendingRequestId = `pending-choice-${randomUUID()}`;
            const ownerConversation = getConversation(tenantId, userIds[0], pendingConversationId);
            const ownerChoice = issueChoice(
                ownerConversation,
                {
                    type: "choice",
                    id: `choice-${randomUUID()}`,
                    question: "Create task?",
                    control: "buttons",
                    options: [
                        { id: "confirm", label: "Confirm" },
                        { id: "cancel", label: "Cancel" },
                    ],
                },
                {
                    toolName: "createTask",
                    input: {
                        projectId: "00000000-0000-4000-8000-000000000001",
                        title: "Pending choice isolation fixture",
                    },
                    intent: "Create task Pending choice isolation fixture",
                }
            );
            const ownerChoiceReply = {
                token: ownerChoice.pendingActionToken!,
                optionIds: ["cancel"],
            };

            sendChat(socketB.client, pendingConversationId, pendingRequestId, "Cancel", ownerChoiceReply);
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketB.frames).some(
                        frame =>
                            frame.type === "ai_chat_error" &&
                            frame.payload?.clientRequestId === pendingRequestId &&
                            frame.payload?.message === "Choice expired or invalid"
                    )
                )
            ).toBe(true);
            expect(ownerConversation.pending?.widget.pendingActionToken).toBe(ownerChoice.pendingActionToken);

            sendChat(socketA.client, pendingConversationId, pendingRequestId, "Cancel", ownerChoiceReply);
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketA.frames).some(
                        frame =>
                            frame.type === "ai_chat_done" &&
                            frame.payload?.clientRequestId === pendingRequestId &&
                            frame.payload?.widgets?.some(
                                (widget: { label?: string }) => widget.label === "Cancelled"
                            )
                    )
                )
            ).toBe(true);
            expect(ownerConversation.pending).toBeUndefined();
            expect(mocks.stream).toHaveBeenCalledTimes(2);

            const replayedChoiceRequestId = `replayed-choice-${randomUUID()}`;
            sendChat(
                socketA.client,
                pendingConversationId,
                replayedChoiceRequestId,
                "Cancel",
                ownerChoiceReply
            );
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketA.frames).some(
                        frame =>
                            frame.type === "ai_chat_error" &&
                            frame.payload?.clientRequestId === replayedChoiceRequestId &&
                            frame.payload?.message === "Choice expired or invalid"
                    )
                )
            ).toBe(true);
            expect(ownerConversation.pending).toBeUndefined();
            expect(mocks.stream).toHaveBeenCalledTimes(2);

            let markConsumeStarted!: () => void;
            const consumeStarted = new Promise<void>(resolve => {
                markConsumeStarted = resolve;
            });
            mocks.stream.mockImplementationOnce((options: { abortSignal: AbortSignal }) => ({
                consumeStream: () =>
                    new Promise<void>(resolve => {
                        markConsumeStarted();
                        if (options.abortSignal.aborted) {
                            resolve();
                            return;
                        }
                        options.abortSignal.addEventListener("abort", () => resolve(), { once: true });
                    }),
                text: Promise.resolve("Disconnected stream response"),
            }));
            const disconnectRequestId = `disconnect-${randomUUID()}`;
            sendChat(socketA.client, `disconnect-${randomUUID()}`, disconnectRequestId, "List my tasks");
            expect(await harness.waitFor(async () => mocks.stream.mock.calls.length === 3)).toBe(true);
            await consumeStarted;

            const userLeaseKey = rateLimitKeyHash("ai-chat-concurrency-user", userIds[0]);
            expect(await RateLimitLeaseEntity.count({ where: { keyHash: userLeaseKey } })).toBe(1);
            socketA.client.close();
            expect(
                await harness.waitFor(
                    async () => (await RateLimitLeaseEntity.count({ where: { keyHash: userLeaseKey } })) === 0
                )
            ).toBe(true);

            const reconnectedSocketA = await harness.openClient({
                Authorization: `Bearer ${sessions[0].token}`,
            });
            expect(reconnectedSocketA.opened).toBe(true);
            mocks.stream.mockImplementationOnce(() => ({
                consumeStream: async () => undefined,
                text: Promise.resolve("Request after disconnect completed"),
            }));
            const afterDisconnectRequestId = `after-disconnect-${randomUUID()}`;
            sendChat(
                reconnectedSocketA.client,
                `after-disconnect-${randomUUID()}`,
                afterDisconnectRequestId,
                "List my tasks"
            );
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(reconnectedSocketA.frames).some(
                        frame =>
                            frame.type === "ai_chat_done" &&
                            frame.payload?.clientRequestId === afterDisconnectRequestId
                    )
                )
            ).toBe(true);

            mocks.stream.mockImplementation(() => ({
                consumeStream: async () => undefined,
                text: Promise.resolve("Budget control response"),
            }));
            const userBudgetKey = rateLimitKeyHash("ai-chat-user", userIds[0]);
            const counterBeforeBudgetControl = await RateLimitCounterEntity.findOne({
                where: { keyHash: userBudgetKey },
            });
            const priorUserBudgetHits = Number(counterBeforeBudgetControl?.get("hits") ?? 0);
            const remainingAllowedRequests = 20 - priorUserBudgetHits;
            expect(remainingAllowedRequests).toBeGreaterThan(0);

            for (let requestIndex = 0; requestIndex < remainingAllowedRequests; requestIndex++) {
                const budgetRequestId = `budget-${requestIndex}-${randomUUID()}`;
                sendChat(
                    reconnectedSocketA.client,
                    `budget-conversation-${requestIndex}-${randomUUID()}`,
                    budgetRequestId,
                    "List my tasks"
                );
                const completed = await harness.waitFor(async () =>
                    getAiFrames(reconnectedSocketA.frames).some(
                        frame =>
                            frame.type === "ai_chat_done" &&
                            frame.payload?.clientRequestId === budgetRequestId
                    )
                );
                if (!completed) {
                    throw new Error(
                        `AI budget control request ${requestIndex} did not complete: ${JSON.stringify(
                            getAiFrames(reconnectedSocketA.frames).slice(-3)
                        )}`
                    );
                }
            }
            expect(mocks.stream).toHaveBeenCalledTimes(4 + remainingAllowedRequests);
            const counterAtBudget = await RateLimitCounterEntity.findOne({
                where: { keyHash: userBudgetKey },
            });
            expect(Number(counterAtBudget?.get("hits"))).toBe(20);

            const overBudgetRequestId = `budget-exceeded-${randomUUID()}`;
            sendChat(
                reconnectedSocketA.client,
                `budget-conversation-${randomUUID()}`,
                overBudgetRequestId,
                "List my tasks"
            );
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(reconnectedSocketA.frames).some(
                        frame =>
                            frame.type === "ai_chat_error" &&
                            frame.payload?.clientRequestId === overBudgetRequestId &&
                            frame.payload?.message === "AI chat limit reached"
                    )
                )
            ).toBe(true);
            expect(mocks.stream).toHaveBeenCalledTimes(4 + remainingAllowedRequests);

            const otherCallerRequestId = `remaining-budget-${randomUUID()}`;
            sendChat(
                socketB.client,
                `remaining-budget-conversation-${randomUUID()}`,
                otherCallerRequestId,
                "List my tasks"
            );
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketB.frames).some(
                        frame =>
                            frame.type === "ai_chat_done" &&
                            frame.payload?.clientRequestId === otherCallerRequestId &&
                            frame.payload?.text === "Budget control response"
                    )
                )
            ).toBe(true);
            expect(mocks.stream).toHaveBeenCalledTimes(5 + remainingAllowedRequests);

            const tenantBudgetKey = rateLimitKeyHash("ai-chat-tenant", tenantId);
            const budgetWindowStart = rateLimitWindowStart(Date.now(), 5 * 60_000);
            await RateLimitCounterEntity.upsert({
                keyHash: tenantBudgetKey,
                windowStart: budgetWindowStart,
                hits: 59,
                expiresAt: new Date(budgetWindowStart + 10 * 60_000),
            });

            const finalAllowedRequestId = `tenant-final-allowed-${randomUUID()}`;
            sendChat(
                socketB.client,
                `tenant-final-allowed-conversation-${randomUUID()}`,
                finalAllowedRequestId,
                "List my tasks"
            );
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketB.frames).some(
                        frame =>
                            frame.type === "ai_chat_done" &&
                            frame.payload?.clientRequestId === finalAllowedRequestId
                    )
                )
            ).toBe(true);
            const tenantCounterAtLimit = await RateLimitCounterEntity.findOne({
                where: { keyHash: tenantBudgetKey, windowStart: budgetWindowStart },
            });
            expect(Number(tenantCounterAtLimit?.get("hits"))).toBe(60);

            const tenantOverBudgetRequestId = `tenant-budget-exceeded-${randomUUID()}`;
            const streamCallsAtTenantLimit = mocks.stream.mock.calls.length;
            sendChat(
                socketB.client,
                `tenant-budget-exceeded-conversation-${randomUUID()}`,
                tenantOverBudgetRequestId,
                "List my tasks"
            );
            expect(
                await harness.waitFor(async () =>
                    getAiFrames(socketB.frames).some(
                        frame =>
                            frame.type === "ai_chat_error" &&
                            frame.payload?.clientRequestId === tenantOverBudgetRequestId &&
                            frame.payload?.message === "AI chat limit reached"
                    )
                )
            ).toBe(true);
            expect(mocks.stream).toHaveBeenCalledTimes(streamCallsAtTenantLimit);
            const userCounterBelowLimit = await RateLimitCounterEntity.findOne({
                where: {
                    keyHash: rateLimitKeyHash("ai-chat-user", userIds[1]),
                    windowStart: budgetWindowStart,
                },
            });
            expect(Number(userCounterBelowLimit?.get("hits"))).toBeLessThan(20);
            const tenantCounterOverLimit = await RateLimitCounterEntity.findOne({
                where: { keyHash: tenantBudgetKey, windowStart: budgetWindowStart },
            });
            expect(Number(tenantCounterOverLimit?.get("hits"))).toBe(61);
        } finally {
            releaseFirstStream?.();
            await harness.close();
            const scopes = [
                ...userIds.flatMap(id => [
                    ["websocket-message-user", id],
                    ["ai-chat-user", id],
                    ["ai-chat-concurrency-user", id],
                ]),
                ["ai-chat-tenant", tenantId],
            ];
            const keyHashes = scopes.map(([scope, subject]) => rateLimitKeyHash(scope, subject));
            await RateLimitCounterEntity.destroy({ where: { keyHash: keyHashes } });
            await RateLimitLeaseEntity.destroy({ where: { keyHash: keyHashes } });
            await SessionEntity.destroy({ where: { userId: userIds }, force: true });
            await UserEntity.destroy({ where: { id: userIds }, force: true });
            await role.destroy({ force: true });
            await tenant.destroy({ force: true });
        }
    }, 30_000);
});
