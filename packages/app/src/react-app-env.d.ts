// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
/// <reference types="node" />
/// <reference types="webpack-env" />

declare namespace NodeJS {
    interface ProcessEnv {
        readonly NODE_ENV: "development" | "production" | "test";
        readonly PUBLIC_URL: string;
    }
}

declare module "*.png" {
    const src: string;
    export default src;
}

declare module "*.jpg" {
    const src: string;
    export default src;
}

declare module "*.jpeg" {
    const src: string;
    export default src;
}

declare module "*.gif" {
    const src: string;
    export default src;
}

declare module "*.webp" {
    const src: string;
    export default src;
}

declare module "*.svg" {
    import * as React from "react";

    export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement> & { title?: string }>;

    const src: string;
    export default src;
}
