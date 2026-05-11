// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Stack } from "expo-router";

/**
 * Modal stack for detail screens (task, person, ...). The parent root layout
 * registers `(modals)` with `presentation: "modal"` so every screen inside
 * slides up from the bottom on iOS and fades in over the current surface
 * on Android, keeping the drawer/project view visible behind it.
 */
export default function ModalsLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: true,
                headerTitleAlign: "center",
                // Flatten the header so custom buttons (Close / dots menu)
                // render without the hairline "embossed" look iOS adds by
                // default. Matches the drawer header used on the project
                // screen, where this shadow never appears.
                headerShadowVisible: false,
            }}
        >
            <Stack.Screen name="task/[id]" options={{ title: "Task" }} />
            <Stack.Screen name="people/[id]" options={{ title: "Person" }} />
            <Stack.Screen name="company/[id]" options={{ title: "Company" }} />
            <Stack.Screen
                name="project-settings/[id]"
                options={{ title: "Project settings" }}
            />
        </Stack>
    );
}
