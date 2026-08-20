// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useMutation, useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, Appearance } from "react-native";

import type { IPreferences } from "@stacks/types";

import { Button, ButtonText } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { ScrollView } from "@/components/ui/scroll-view";
import { Switch } from "@/components/ui/switch";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HStack } from "@/components/ui/hstack";

import { pingServer } from "../../src/api/client";
import { fetchPreferences, updatePreferences } from "../../src/api/endpoints";
import { queryClient } from "../../src/state/queryClient";
import { normalizeBaseUrl } from "../../src/config/server";
import { useAuth } from "../../src/state/AuthContext";

export default function PreferencesScreen() {
    const router = useRouter();
    const { serverUrl, setServerUrl, logout } = useAuth();
    const [urlDraft, setUrlDraft] = useState(serverUrl ?? "");
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        setUrlDraft(serverUrl ?? "");
    }, [serverUrl]);

    const colorScheme = Appearance.getColorScheme();
    const [darkMode, setDarkMode] = useState(colorScheme === "dark");

    const { data: preferences } = useQuery({
        queryKey: ["preferences"],
        queryFn: fetchPreferences,
    });

    const prefsMutation = useMutation({
        mutationFn: (patch: Partial<IPreferences>) =>
            updatePreferences({ ...(preferences as IPreferences), ...patch }),
        onSuccess: () => {
            void queryClient.invalidateQueries({ queryKey: ["preferences"] });
        },
    });

    const togglePref = (key: "showPriority" | "showDates" | "showAssignees") => {
        if (!preferences) return;
        prefsMutation.mutate({ [key]: !preferences[key] });
    };

    const saveUrl = async () => {
        const n = normalizeBaseUrl(urlDraft);
        if (!n) {
            Alert.alert("Invalid URL");
            return;
        }
        setBusy(true);
        try {
            await pingServer(n);
            await setServerUrl(n);
            Alert.alert("Saved", "Server URL updated. You may need to sign in again if the host changed.");
        } catch {
            Alert.alert("Unreachable", "Could not GET /ping on that URL.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <ScrollView className="bg-background-0">
            <VStack space="md" className="p-5">
                <Heading size="xl">Preferences</Heading>

                <VStack space="xs">
                    <Text size="sm" className="text-typography-600">
                        Server URL
                    </Text>
                    <Input variant="outline">
                        <InputField
                            value={urlDraft}
                            onChangeText={setUrlDraft}
                            autoCapitalize="none"
                            autoCorrect={false}
                            keyboardType="url"
                        />
                    </Input>
                    <Button onPress={() => void saveUrl()} disabled={busy}>
                        <ButtonText>{busy ? "Saving…" : "Save server URL"}</ButtonText>
                    </Button>
                </VStack>

                <Divider />

                <VStack space="xs">
                    <Text size="sm" className="text-typography-600">
                        Language
                    </Text>
                    <Text>English (only)</Text>
                </VStack>

                <VStack space="xs">
                    <Text size="sm" className="text-typography-600">
                        Theme
                    </Text>
                    <Text>Follows system ({colorScheme ?? "unknown"})</Text>
                </VStack>

                <Divider />

                <VStack space="xs">
                    <Heading size="sm">Appearance</Heading>
                    <HStack space="sm" className="items-center justify-between">
                        <Text size="sm" className="text-typography-600">
                            Dark mode
                        </Text>
                        <Switch
                            value={darkMode}
                            onValueChange={v => {
                                setDarkMode(v);
                                Appearance.setColorScheme(v ? "dark" : "light");
                            }}
                        />
                    </HStack>
                </VStack>

                {preferences ? (
                    <>
                        <Divider />

                        <VStack space="xs">
                            <Heading size="sm">Board</Heading>
                            <HStack space="sm" className="items-center justify-between">
                                <Text size="sm" className="text-typography-600">
                                    Show priority
                                </Text>
                                <Switch
                                    value={!!preferences.showPriority}
                                    onValueChange={() => togglePref("showPriority")}
                                />
                            </HStack>
                            <HStack space="sm" className="items-center justify-between">
                                <Text size="sm" className="text-typography-600">
                                    Show dates
                                </Text>
                                <Switch
                                    value={!!preferences.showDates}
                                    onValueChange={() => togglePref("showDates")}
                                />
                            </HStack>
                            <HStack space="sm" className="items-center justify-between">
                                <Text size="sm" className="text-typography-600">
                                    Show assignees
                                </Text>
                                <Switch
                                    value={!!preferences.showAssignees}
                                    onValueChange={() => togglePref("showAssignees")}
                                />
                            </HStack>
                        </VStack>
                    </>
                ) : null}

                <VStack space="xs">
                    <Text size="sm" className="text-typography-600">
                        About
                    </Text>
                    <Text>
                        Stacks mobile · {Constants.expoConfig?.name ?? "Expo"} v
                        {Constants.expoConfig?.version ?? "1.0.0"}
                    </Text>
                </VStack>

                <Divider />

                <Button action="negative" onPress={() => void logout()}>
                    <ButtonText>Log out</ButtonText>
                </Button>
                <Button variant="outline" onPress={() => router.back()}>
                    <ButtonText>Close</ButtonText>
                </Button>
            </VStack>
        </ScrollView>
    );
}
