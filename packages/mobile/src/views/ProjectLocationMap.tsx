// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import { WebView } from "react-native-webview";
import type { ILocation, ITask } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchTasksForProject } from "../api/endpoints";

interface LocatedTask {
    task: ITask;
    location: ILocation;
}

/**
 * Render an OpenStreetMap tile map over WebView, centering on the project's
 * task locations and dropping a marker per location (L1 read-only). Markers
 * can optionally display the task title as a permanent label (used by World).
 */
export function LocationMap({
    locations,
    labelMarkers,
}: {
    locations: LocatedTask[];
    labelMarkers?: boolean;
}) {
    const markers = locations
        .map(loc => ({
            coords: loc.location.coordinates,
            title: loc.task.title,
        }))
        .filter(m => Array.isArray(m.coords) && m.coords.length === 2);

    if (markers.length === 0) {
        return (
            <VStack className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600 text-center">No located tasks in this project.</Text>
            </VStack>
        );
    }

    const html = buildMapHtml(markers, labelMarkers);
    return (
        <WebView originWhitelist={["*"]} source={{ html }} style={{ flex: 1, backgroundColor: "#f8fafc" }} />
    );
}

export function ProjectLocationMapScreen({ world }: { world?: boolean }) {
    const { id } = useLocalSearchParams<{ id: string }>();

    const {
        data: tasks = [],
        isLoading,
        isError,
    } = useQuery<ITask[]>({
        queryKey: ["tasks", id],
        queryFn: () => fetchTasksForProject(id),
    });

    const locations = useMemo<LocatedTask[]>(() => {
        const out: LocatedTask[] = [];
        for (const task of tasks) {
            for (const location of task.locations ?? []) {
                out.push({ task, location });
            }
        }
        return out;
    }, [tasks]);

    if (isLoading) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    if (isError) {
        return (
            <Box className="flex-1 items-center justify-center p-6">
                <Text className="text-typography-600">Failed to load project locations.</Text>
            </Box>
        );
    }

    return <LocationMap locations={locations} labelMarkers={world} />;
}

function buildMapHtml(markers: { coords: number[]; title: string }[], labelMarkers?: boolean): string {
    const center = markers[0].coords.join(",");
    const markerCalls = markers
        .map(
            (m, i) =>
                `var m${i} = L.marker([${m.coords[0]}, ${m.coords[1]}]).addTo(map).bindPopup(${JSON.stringify(
                    m.title
                )});` + (labelMarkers ? ` m${i}.openPopup();` : "")
        )
        .join("\n");
    return `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<style>html,body,#map{height:100%;margin:0;}</style></head>
<body><div id="map"></div>
<script>
var map = L.map('map').setView([${center}], 8);
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap'
}).addTo(map);
${markerCalls}
setTimeout(function(){ map.invalidateSize(); }, 200);
</script></body></html>`;
}
