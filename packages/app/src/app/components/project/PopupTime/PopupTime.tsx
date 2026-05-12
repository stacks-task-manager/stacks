// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Classes, FormGroup, Popover, Position } from "@blueprintjs/core";
import { DurationInput } from "app/widgets";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
interface IPopupTimeProps {
    /** Strict `translate()` key, e.g. `"Estimated time"`. */
    labelKey: string;
    value?: number;
    disabled?: boolean;
    children?: React.ReactNode;
    onChange: (value: number | undefined) => void;
}
export const PopupTime: FunctionComponent<IPopupTimeProps> = ({
    labelKey,
    value,
    disabled,
    children,
    onChange,
}) => {
    const [openend, setOpenend] = useState(false);
    const closePopoverBtn = useRef<HTMLButtonElement | null>(null);
    const inputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, [openend]);

    if (disabled) return <>{children}</>;

    return (
        <Popover
            content={
                <FormGroup
                    label={translate(labelKey)}
                    style={{ marginBottom: 0, width: 120 }}
                >
                    <DurationInput value={value} onChange={onChange} />
                    <button
                        ref={closePopoverBtn}
                        className={Classes.POPOVER_DISMISS}
                        style={{ display: "none" }}
                    />
                </FormGroup>
            }
            onOpened={() => setOpenend(true)}
            onClose={() => setOpenend(false)}
            placement={Position.TOP}
            popoverClassName="popover-padded"
        >
            {children}
        </Popover>
    );
};
