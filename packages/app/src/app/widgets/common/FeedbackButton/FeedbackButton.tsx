// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { Tooltip } from "@blueprintjs/core";

import { Feedback, Icon } from "app/components/common";

export const FeedbackButton = () => {
    const toggleFeedback = () => {
        Feedback.openFeedback();
    };

    return (
        <Tooltip content={translate("Feedback")} placement="right">
            <div className="workspace-button" onClick={toggleFeedback}>
                <Icon icon="thumbs-up" />
            </div>
        </Tooltip>
    );
};
