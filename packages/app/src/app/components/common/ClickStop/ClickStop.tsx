// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";


export const ClickStop: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => {
    return (
        <span className={className} onClick={event => event.stopPropagation()}>
            {children}
        </span>
    );
};