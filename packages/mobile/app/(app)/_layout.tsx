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
                    name="tasks"
                    options={{ title: "Tasks", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="calendar"
                    options={{ title: "Calendar", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="notifications"
                    options={{ title: "Notifications", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="timelogs"
                    options={{ title: "Timelogs", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="roles"
                    options={{ title: "Roles", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="approvals"
                    options={{ title: "Approvals", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="timesheet"
                    options={{ title: "Timesheet", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="reports"
                    options={{ title: "Reports", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="planner"
                    options={{ title: "Planner", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="timebox"
                    options={{ title: "Timebox", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="goals"
                    options={{ title: "Goals", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="files"
                    options={{ title: "Files", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="workspaces"
                    options={{ title: "Workspaces", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="document/[id]"
                    options={{ title: "Document", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-overview/[id]"
                    options={{ title: "Overview", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-table/[id]"
                    options={{ title: "Table", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-time/[id]"
                    options={{ title: "Time", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-attachments/[id]"
                    options={{ title: "Attachments", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-board-overview/[id]"
                    options={{ title: "Board Overview", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-notes/[id]"
                    options={{ title: "Notes", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-links/[id]"
                    options={{ title: "Links", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-map/[id]"
                    options={{ title: "Map", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="project-world/[id]"
                    options={{ title: "World", drawerItemStyle: { display: "none" } }}
                />
                <Drawer.Screen
                    name="preferences"
                    options={{ title: "Preferences", drawerItemStyle: { display: "none" } }}
                />
            </Drawer>
        </RealtimeProvider>
    );
}
