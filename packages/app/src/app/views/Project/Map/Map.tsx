// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { AnchorButton } from "@blueprintjs/core";
import L from "leaflet";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";
import { MapContainer, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";

import { ProjectsActions } from "app/store/actions";
import Log from "app/utils/log";

// import MarkerIcon from "../../../../assets/marker-icon.png";
// import MarkerIcon2X from "../../../../assets/marker-icon-2x.png";
// import MarkerShadow from "../../../../assets/marker-shadow.png";

// const MarkerPoint = new L.Icon({
//     iconUrl: MarkerIcon,
//     iconRetinaUrl: MarkerIcon2X,
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -26],
//     iconSize: [25, 41],
//     shadowUrl: MarkerShadow,
//     shadowSize: [41, 41],
//     shadowAnchor: [12, 41],
// });

// const MarkerArchivedPoint = new L.Icon({
//     iconUrl: MarkerArchivedIcon,
//     iconRetinaUrl: MarkerIconArchived2X,
//     iconAnchor: [12, 41],
//     popupAnchor: [1, -26],
//     iconSize: [25, 41],
//     shadowUrl: MarkerShadow,
//     shadowSize: [41, 41],
//     shadowAnchor: [12, 41],
// });

export const Map = () => {
    const [isPopupVisible, setIsPopupVisible] = useState(false);

    const handleTogglePopups = (e: React.MouseEvent<HTMLElement>) => {
        e.stopPropagation();
        e.preventDefault();
        setIsPopupVisible(!isPopupVisible);
    };

    Log.info("[Component][MapNested]", "render");

    return (
        <div id="map">
            <MapContainer zoom={10} center={[0, 0]}>
                <TileLayer
                    attribution='&amp;copy <a href="http://osm.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <Markers isPopupVisible={isPopupVisible} />

                <Tooltip content="Show all marker tooltips" className="popup-toggle-button">
                    <AnchorButton icon="chat" active={isPopupVisible} onClick={handleTogglePopups} />
                </Tooltip>
            </MapContainer>
        </div>
    );
};

interface IMarkersProps {
    isPopupVisible: boolean;
}
type coordinatesType = [number, number][];
const Markers: FunctionComponent<IMarkersProps> = () => {
    const map = useMap();
    useMapEvents({
        zoomend: () => {
            setZoom(map.getZoom());
        },
    });
    const [, setZoom] = useState<number | undefined>(map.getZoom());
    // const navigate = useNavigate();
    // const params = useParams();
    const coordinates = useRef<coordinatesType>([]);

    useEffect(() => {
        handleFitBounds();
    }, []);

    // const handleMarkerClick = (task: ITask) => {
    //     navigate(`/project/${params.id}/${task.id}`);
    // };

    const renderMarkers = () => {
        const project = ProjectsActions.getCurrentProject();
        if (!project) return null;
        // const { stacks } = project;
        const markers: React.ReactElement[] = [];
        // const shouldShowTooltip = isPopupVisible || (zoom && zoom >= 7);

        // stacks.forEach((stack: IStack) => {
        //     stack.tasks.forEach((task: ITask) => {
        //         if (task.extensions) {
        //             task.extensions.forEach((info: ITaskInfoGroup) => {
        //                 if (info.type === "location" && info.content) {
        //                     info.content.forEach((marker: [number, number], index: number) => {
        //                         coordinates.current.push(marker);
        //                         markers.push(
        //                             <Marker
        //                                 key={`${task.id}-${index}`}
        //                                 icon={MarkerPoint}
        //                                 position={marker}
        //                                 eventHandlers={{
        //                                     dblclick: () => handleMarkerClick(task),
        //                                 }}
        //                             >
        //                                 {shouldShowTooltip && (
        //                                     <Tooltip direction="top" offset={[0, -30]} opacity={1} permanent>
        //                                         {md(task.title)}
        //                                     </Tooltip>
        //                                 )}
        //                             </Marker>
        //                         );
        //                     });
        //                 }
        //             });
        //         }
        //     });
        // });

        return markers;
    };

    const handleFitBounds = () => {
        const markers = coordinates.current.map((coords: [number, number]) => {
            return L.marker(coords);
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
        }
    };

    return <>{renderMarkers()}</>;
};
