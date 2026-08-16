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

export type AiChatWidget =
    | { type: "button"; label: string; hashPath: string }
    | { type: "redirect"; label: string; hashPath: string }
    | {
          type: "choice";
          id: string;
          question: string;
          control: AiChatChoiceControl;
          options: AiChatChoiceOption[];
          submitLabel?: string;
          answered?: boolean;
          selectedOptionIds?: string[];
      };
