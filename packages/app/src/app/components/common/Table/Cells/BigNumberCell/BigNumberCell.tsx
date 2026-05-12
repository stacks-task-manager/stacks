// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import classNames from "classnames";
import React, { FunctionComponent } from "react";
import CountUp from "react-countup";

import { usePreferences } from "app/hooks";

interface IBigNumberCellCellProps {
    value: number;
    className?: string;
    large?: boolean;
    onClick?: () => void;
}
export const BigNumberCell: FunctionComponent<IBigNumberCellCellProps> = ({
    value,
    className,
    large,
    onClick,
}) => {
    const { showAnimations } = usePreferences(["showAnimations"]);

    return (
        <div className={classNames("big-number-cell", className, { large })} onClick={onClick}>
            <CountUp end={value} duration={showAnimations ? 2 : 0} />
        </div>
    );
};
