// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.

export type AiChatClientMessage = {
    role: "user" | "assistant";
    content: string;
};

export type AiChatChoiceControl = "buttons" | "radio" | "checkbox";

export type AiChatChoiceOption = {
    id: string;
    label: string;
    value?: string;
};

export type AiChatChoiceReply = { token: string; optionIds: string[] };

export type AiChatWidget =
    | { type: "status"; label: string; severity: "success" | "warning" | "error" }
    | {
          type: "result";
          label: string;
          items: { label: string; fields: { label: string; value: string }[]; hashPath?: string }[];
          truncated?: boolean;
      }
    | { type: "button"; label: string; hashPath: string }
    | { type: "redirect"; label: string; hashPath: string }
    | {
          type: "choice";
          id: string;
          pendingActionToken?: string;
          question: string;
          control: AiChatChoiceControl;
          options: AiChatChoiceOption[];
          submitLabel?: string;
          answered?: boolean;
          selectedOptionIds?: string[];
      };
