// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import "../global.css";
import "react-native-gesture-handler";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { Box } from "@/components/ui/box";
import { Spinner } from "@/components/ui/spinner";
import { QueryClientProvider } from "@tanstack/react-query";
import { Stack, useRouter } from "expo-router";
import { useCallback } from "react";
import { useColorScheme } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AuthProvider, useAuth } from "../src/state/AuthContext";
import { queryClient } from "../src/state/queryClient";

function AuthGate({ children }: { children: React.ReactNode }) {
    const { isReady } = useAuth();
    if (!isReady) {
        return (
            <Box className="flex-1 items-center justify-center">
                <Spinner />
            </Box>
        );
    }
    return <>{children}</>;
}

function RootNavigator() {
    const router = useRouter();
    const onUnauthorized = useCallback(() => {
        router.replace("/(auth)/login" as never);
    }, [router]);

    return (
        <AuthProvider onUnauthorized={onUnauthorized}>
            <AuthGate>
                <Stack screenOptions={{ headerShown: false }}>
                    <Stack.Screen name="index" />
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(app)" />
                    <Stack.Screen
                        name="(modals)"
                        options={{ presentation: "modal", headerShown: false }}
                    />
                </Stack>
            </AuthGate>
        </AuthProvider>
    );
}

export default function RootLayout() {
    const scheme = useColorScheme();
    const mode = scheme === "dark" ? "dark" : "light";

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaProvider>
                <GluestackUIProvider mode={mode}>
                    <QueryClientProvider client={queryClient}>
                        <RootNavigator />
                    </QueryClientProvider>
                </GluestackUIProvider>
            </SafeAreaProvider>
        </GestureHandlerRootView>
    );
}
