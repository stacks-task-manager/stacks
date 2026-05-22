// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Intent } from "@blueprintjs/core";

import { PRIORITY } from "@stacks/types";

export const getPriorityIntent = (value?: PRIORITY) => {
    let priorityIntent: Intent = Intent.NONE;
    let priorityIcon = "";

    if (value === PRIORITY.LOW) {
        priorityIntent = Intent.SUCCESS;
        priorityIcon = "!";
    } else if (value === PRIORITY.MEDIUM) {
        priorityIntent = Intent.WARNING;
        priorityIcon = "!!";
    } else if (value === PRIORITY.HIGH) {
        priorityIntent = Intent.DANGER;
        priorityIcon = "!!!";
    }

    return { priorityIntent, priorityIcon };
};
