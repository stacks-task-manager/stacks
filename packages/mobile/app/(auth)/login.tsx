// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform } from "react-native";

import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { pingServer } from "../../src/api/client";
import { normalizeBaseUrl } from "../../src/config/server";
import { useAuth } from "../../src/state/AuthContext";

export default function LoginScreen() {
    const router = useRouter();
    const { login, serverUrl, setServerUrl } = useAuth();
    const [url, setUrl] = useState(serverUrl ?? "");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (serverUrl) setUrl(serverUrl);
    }, [serverUrl]);

    const submit = async () => {
        const normalized = normalizeBaseUrl(url);
        if (!normalized) {
            Alert.alert("Server URL", "Enter a valid URL (e.g. http://192.168.1.10:3000)");
            return;
        }
        if (!email.trim() || !password) {
            Alert.alert("Missing credentials", "Enter your email and password.");
            return;
        }
        setBusy(true);
        try {
            try {
                await pingServer(normalized);
            } catch {
                Alert.alert(
                    "Cannot reach server",
                    `Check the URL and that the Stacks server is running. Tried: ${normalized}`
                );
                return;
            }
            await setServerUrl(normalized);
            try {
                await login(email.trim(), password);
            } catch {
                Alert.alert("Login failed", "Check email and password.");
                return;
            }
            router.replace("/(app)" as never);
        } finally {
            setBusy(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
            <Box className="flex-1 justify-center px-6">
                <VStack space="lg">
                    <Heading size="xl">Sign in</Heading>

                    <VStack space="xs">
                        <Text size="sm" className="font-medium text-typography-700">Server</Text>
                        <Input variant="outline" size="md">
                            <InputField
                                value={url}
                                onChangeText={setUrl}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="url"
                                placeholder="http://192.168.x.x:3000"
                            />
                        </Input>
                        <Text size="xs" className="text-typography-500">
                            Use your machine LAN IP and port. Ping uses GET /ping.
                        </Text>
                    </VStack>

                    <VStack space="xs">
                        <Text size="sm" className="font-medium text-typography-700">Email</Text>
                        <Input variant="outline" size="md">
                            <InputField
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                autoCorrect={false}
                                keyboardType="email-address"
                                placeholder="you@example.com"
                            />
                        </Input>
                    </VStack>

                    <VStack space="xs">
                        <Text size="sm" className="font-medium text-typography-700">Password</Text>
                        <Input variant="outline" size="md">
                            <InputField
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                placeholder="••••••••"
                            />
                        </Input>
                    </VStack>

                    <Button onPress={() => void submit()} disabled={busy}>
                        <ButtonText>{busy ? "Signing in…" : "Sign in"}</ButtonText>
                    </Button>
                </VStack>
            </Box>
        </KeyboardAvoidingView>
    );
}
