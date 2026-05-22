// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { DrawerActions } from "@react-navigation/native";
import { Drawer } from "expo-router/drawer";
import { useNavigation } from "expo-router";
import { Pressable, Text } from "react-native";

import { DrawerContent } from "../../src/components/DrawerContent";
import { RealtimeProvider } from "../../src/realtime/RealtimeContext";
import { useUpdates } from "../../src/realtime/hooks";

function MenuButton() {
    const navigation = useNavigation();
    return (
        <Pressable
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            hitSlop={10}
            style={{ paddingHorizontal: 14, paddingVertical: 4 }}
        >
            <Text style={{ fontSize: 22 }}>☰</Text>
        </Pressable>
    );
}

function RealtimeBridge() {
    useUpdates();
    return null;
}

export default function AppLayout() {
    return (
        <RealtimeProvider>
            <RealtimeBridge />
            <Drawer
                drawerContent={props => <DrawerContent {...props} />}
                screenOptions={{
                    headerShown: true,
                    drawerType: "slide",
                    swipeEnabled: true,
                    swipeEdgeWidth: 48,
                    headerLeft: () => <MenuButton />,
                }}
            >
                <Drawer.Screen
                    name="index"
                    options={{
                        title: "",
                        headerTransparent: true,
                        headerStyle: { backgroundColor: "transparent" },
                        headerShadowVisible: false,
                    }}
                />
                <Drawer.Screen
                    name="people"
                    options={{ title: "People", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="inbox"
                    options={{ title: "Inbox", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="my-tasks"
                    options={{ title: "My tasks", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="document/[id]"
                    options={{ title: "Document", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="preferences"
                    options={{ title: "Preferences", drawerItemStyle: { display: "none" } }}
                />
            </Drawer>
        </RealtimeProvider>
    );
}
