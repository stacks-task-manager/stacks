// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { Intent, Tag } from "@blueprintjs/core";
import { PopupTime } from "app/components/project";
import { RoundButton } from "app/components/common";
import { formatStringDuration } from "app/utils/date";

interface ITaskEstimatesProps {
    value?: number;
    disabled?: boolean;
    minimal?: boolean;
    onChange: (value: number | undefined) => void;
}
export const TaskEstimates: FunctionComponent<ITaskEstimatesProps> = ({
    value,
    disabled,
    minimal,
    onChange,
}) => {
    const handleClear = (event: React.MouseEvent<HTMLButtonElement>) => {
        event.stopPropagation();
        onChange(undefined);
    };

    return (
        <PopupTime value={value} disabled={disabled} labelKey={translate("Estimated time")} onChange={onChange}>
            <>
                {!Boolean(value) && (
                    <RoundButton
                        dashed
                        title={minimal ? undefined : translate("Add estimate")}
                        tooltip={minimal ? translate("Add estimate") : undefined}
                        icon={minimal ? "clock-plus" : undefined}
                        disabled={disabled}
                    />
                )}
                {Boolean(value) && (
                    <Tag
                        minimal
                        interactive={!disabled}
                        onRemove={value && !disabled ? handleClear : undefined}
                        intent={Intent.SUCCESS}
                    >
                        {value ? formatStringDuration(value) : translate("Not estimated")}
                    </Tag>
                )}
            </>
        </PopupTime>
    );
};
