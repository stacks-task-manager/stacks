// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IconName, Intent, MaybeElement } from "@blueprintjs/core";

const show = (message: string, icon?: IconName | MaybeElement, intent?: Intent) => {
    return window.toaster.show({
        message,
        intent,
        icon,
    });
};

const info = (message: string, icon?: IconName | MaybeElement) => {
    return window.toaster.show({
        message,
        intent: Intent.PRIMARY,
        icon: icon ?? "notifications",
    });
};

const warn = (message: string, icon?: IconName | MaybeElement) => {
    return window.toaster.show({
        message,
        intent: Intent.WARNING,
        icon: icon ?? "warning-sign",
    });
};
const success = (message: string, icon?: IconName | MaybeElement) => {
    return window.toaster.show({
        message,
        intent: Intent.SUCCESS,
        icon: icon ?? "tick",
    });
};

const error = (message: string, icon?: IconName | MaybeElement) => {
    return window.toaster.show({
        message,
        intent: Intent.DANGER,
        icon: icon ?? "error",
    });
};

const clear = () => {
    window.toaster.clear();
};

const dismiss = (toastId: string) => {
    window.toaster.dismiss(toastId);
};

export default {
    show,
    info,
    warn,
    success,
    error,
    clear,
    dismiss,
};
