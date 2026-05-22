// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Pressable, Text, View } from "react-native";

export function ListRow({
    title,
    subtitle,
    onPress,
    onDelete,
    deleteLabel = "Delete",
}: {
    title: string;
    subtitle?: string;
    onPress: () => void;
    onDelete?: () => void;
    deleteLabel?: string;
}) {
    return (
        <View style={{ flexDirection: "row", alignItems: "center", borderBottomWidth: 1, borderBottomColor: "#eee" }}>
            <Pressable onPress={onPress} style={{ flex: 1, paddingVertical: 10, paddingHorizontal: 8 }}>
                <Text style={{ fontSize: 16 }}>{title}</Text>
                {subtitle ? <Text style={{ fontSize: 12, color: "#666" }}>{subtitle}</Text> : null}
            </Pressable>
            {onDelete ? (
                <Pressable onPress={onDelete} style={{ padding: 12 }}>
                    <Text style={{ color: "#c00" }}>{deleteLabel}</Text>
                </Pressable>
            ) : null}
        </View>
    );
}
