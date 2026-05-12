// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AnchorButton, Tooltip } from "@blueprintjs/core";
import React from "react";

import { Icon } from "app/components/common";

export const TaskDetailsCommentsButton = ({ taskId, count }: { taskId: string; count: number }) => {
    if (!count) return null;

    const handleScrollToComments = () => {
        document.getElementById("comments")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
        <Tooltip
            content={`This task has ${count} commments`}
            placement="bottom-end"
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            renderTarget={({ isOpen, ...props }) => (
                <AnchorButton
                    {...props}
                    className="has-badge"
                    small
                    minimal
                    icon={<Icon icon="message-chat-square" />}
                    onClick={handleScrollToComments}
                >
                    <div className="button-badge primary">{count}</div>
                </AnchorButton>
            )}
        />
    );
};
