// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Tooltip } from "@blueprintjs/core";
import classnames from "classnames";
import React, { FunctionComponent, useRef, useState } from "react";

import { Icon } from "app/components/common";

interface TaskCoverProps {
    url: string;
    fixed?: boolean;
    onRemove?: () => void;
}

export const TaskCover: FunctionComponent<TaskCoverProps> = ({ url, fixed, onRemove }) => {
    const [error, setError] = useState(false);
    const timestamp = useRef(new Date().getTime());

    const handleImageNotLoading = () => {
        setError(true);
    };

    const handleOnRemove = () => {
        timestamp.current = new Date().getTime();
        if (onRemove) onRemove();
    };

    return (
        <div className={classnames("task-cover", { fixed, error })}>
            {!error && <img src={url} alt="" onError={handleImageNotLoading} />}
            {error && <Icon icon="image-x" size={28} />}
            {onRemove && (
                <div className="task-cover-remove">
                    <Tooltip content="Remove cover" placement="top" usePortal>
                        <Button icon="trash" size="small" onClick={handleOnRemove} />
                    </Tooltip>
                </div>
            )}
        </div>
    );
};
