// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Alert } from "react-native";

export function confirmDelete(
    title: string,
    message: string,
    onConfirm: () => void | Promise<void>,
    /** Overrides the confirm button label (default "Delete"). */
    confirmLabel: string = "Delete"
): void {
    Alert.alert(title, message, [
        { text: "Cancel", style: "cancel" },
        {
            text: confirmLabel,
            style: "destructive",
            onPress: () => {
                void onConfirm();
            },
        },
    ]);
}
