// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { ILocation, ITask } from "@stacks/types";
import L from "leaflet";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap, useMapEvents } from "react-leaflet";
import { useNavigate, useParams } from "react-router-dom";
import { AnchorButton } from "@blueprintjs/core";

import MarkerIcon from "../../../../assets/marker-icon.png";
import MarkerIcon2X from "../../../../assets/marker-icon-2x.png";
import MarkerShadow from "../../../../assets/marker-shadow.png";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { PreferencesStore } from "app/store/preferences";

const MarkerPoint = new L.Icon({
    iconUrl: MarkerIcon,
    iconRetinaUrl: MarkerIcon2X,
    iconAnchor: [12, 41],
    popupAnchor: [1, -26],
    iconSize: [25, 41],
    shadowUrl: MarkerShadow,
    shadowSize: [41, 41],
    shadowAnchor: [12, 41],
});

interface ILocationExtended extends ILocation {
    task: ITask;
}

export const World = () => {
    const params = useParams();
    const [isPopupVisible, setIsPopupVisible] = useState(false);
    const [locations, setLocations] = useState<ILocationExtended[]>([]);

    useEffect(() => {
        console.log("Loading world locations is missing");

        // api("tasks/loadLocations", { projectId: params.id }).then((tasks: ITask[]) => {
        //     const loadedLocations: ILocationExtended[] = [];

        //     for (const task of tasks) {
        //         for (const location of task.locations!) {
        //             loadedLocations.push({
        //                 ...location,
        //                 task: { ...task },
        //             });
        //         }
        //     }

        //     setLocations(loadedLocations);
        // });
    }, []);

    const handleTogglePopups = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        e.preventDefault();
        setIsPopupVisible(!isPopupVisible);
    };

    return (
        <div id="world">
            <MapContainer zoom={10} center={[0, 0]}>
                <TileLayer
                    attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Markers isPopupVisible={isPopupVisible} locations={locations} />

                <Tooltip content="Show all marker tooltips" className="popup-toggle-button">
                    <AnchorButton icon="chat" active={isPopupVisible} onClick={handleTogglePopups} />
                </Tooltip>
            </MapContainer>
        </div>
    );
};

interface IMarkersProps {
    isPopupVisible: boolean;
    locations: ILocationExtended[];
}
const Markers: FunctionComponent<IMarkersProps> = ({ isPopupVisible, locations }) => {
    const map = useMap();
    useMapEvents({
        zoomend: () => {
            setZoom(map.getZoom());
        },
    });
    const [zoom, setZoom] = useState<number | undefined>(map.getZoom());
    const navigate = useNavigate();

    const shouldShowTooltip = useMemo(() => isPopupVisible || (zoom && zoom >= 7), [isPopupVisible, zoom]);

    useEffect(() => {
        handleFitBounds();
    }, [locations]);

    const handleMarkerClick = (task: ITask) => {
        if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${task.project}/${task.id}`);
        } else {
            navigate(`/task/${task.id}`, {
                state: {
                    backgroundLocation: snapshotTaskModalBackground(),
                },
            });
        }
    };

    const handleFitBounds = () => {
        const markers = locations.map((location: ILocationExtended) => {
            return L.marker(location.coordinates);
        });
        const markersGroup = L.featureGroup(markers);

        if (markers.length) {
            const bounds = markersGroup.getBounds();

            if (markers.length > 1) {
                map.fitBounds(bounds, {
                    padding: [40, 40],
                });
            } else {
                map.setView(markers[0].getLatLng(), 10);
            }
        } else {
            map.setView([0, 0], 2);
        }
    };

    return (
        <>
            {locations.map(location => {
                return (
                    <Marker
                        key={location.id}
                        icon={MarkerPoint}
                        position={location.coordinates}
                        eventHandlers={{
                            dblclick: () => handleMarkerClick(location.task),
                        }}
                    >
                        {shouldShowTooltip && (
                            <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent>
                                {location.title}
                            </Tooltip>
                        )}
                    </Marker>
                );
            })}
        </>
    );
};
