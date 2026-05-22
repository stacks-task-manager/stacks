// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { Suspense, Fragment } from "react";

// eslint-disable-next-line @typescript-eslint/no-empty-function
const infiniteThenable = { then() {} };

function Suspender({ freeze, children }: { freeze: boolean; children: React.ReactNode }) {
    if (freeze) {
        throw infiniteThenable;
    }

    return <Fragment>{children}</Fragment>;
}

interface Props {
    freeze: boolean;
    children: React.ReactNode;
    placeholder?: React.ReactNode;
}

export function Freeze({ freeze, children, placeholder = null }: Props) {
    return (
        <Suspense fallback={placeholder}>
            <Suspender freeze={freeze}>{children}</Suspender>
        </Suspense>
    );
}
