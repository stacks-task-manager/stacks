// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, InputGroup, Intent, Menu, MenuItem, Popover } from "@blueprintjs/core";
import axios, { AxiosResponse } from "axios";
import React, { FunctionComponent, useEffect, useRef, useState } from "react";

import { BlankSlate, Col, Grid, Icon, RoundButton, Row, Scroller } from "app/components/common";
import { APPICONS, ILocation } from "@stacks/types";
import { TasksActions } from "app/store/actions";
import { highlightText } from "app/utils/string";
import Toast from "app/utils/toast";
import { uuidv4 } from "app/utils/uuid";
interface ITaskDetailsLocationsProps {
    taskId: string;
    locations?: ILocation[];
    disabled?: boolean;
}
export const TaskDetailsLocations: FunctionComponent<ITaskDetailsLocationsProps> = ({
    taskId,
    locations,
    disabled,
}) => {
    const handleSaveLocation = (location: ILocation) => {
        TasksActions.addLocation(taskId, { ...location, id: uuidv4() });
    };

    const handleRemoveLocation = (event: React.MouseEvent, location: ILocation) => {
        event.stopPropagation();
        TasksActions.removeLocation(taskId, location.id);
    };

    const handleCopyLocation = (location: ILocation) => {
        navigator.clipboard.writeText(
            `${location.title}\nLatitutde: ${location.coordinates[0]}\nLongitute: ${location.coordinates[1]}\nhttps://www.google.com/maps/place/${location.coordinates[0]},${location.coordinates[1]}`
        );
        Toast.show(translate("Location info copied to clipboard"), "map-marker");
    };

    if (locations == null || (locations != null && locations.length === 0)) {
        return (
            <Row>
                <Col justify="center">
                    <BlankSlate
                        icon={APPICONS.LOCATION}
                        title={translate("No locations")}
                        description={translate("This task does not have any locations yet Click the button bellow to add the first one")}
                        small
                        maxWidth={250}
                    >
                        {disabled ? null : (
                            <LocationPicker onSelect={handleSaveLocation}>
                                <RoundButton
                                    minimal
                                    title={translate("Add location")}
                                    icon="globe-05"
                                />
                            </LocationPicker>
                        )}
                    </BlankSlate>
                </Col>
            </Row>
        );
    }

    return (
        <Grid padding={[0, 30]}>
            <Menu className={Classes.ELEVATION_0}>
                {locations.map((location: ILocation) => (
                    <MenuItem
                        className="location-menu-item"
                        icon={<Icon icon="marker-pin-02" />}
                        text={location.title}
                        key={location.id}
                        multiline
                        labelElement={
                            <Row>
                                <Col align="center" gap={5}>
                                    <small>{location.coordinates.join(", ")}</small>{" "}
                                    <Button
                                        small
                                        minimal
                                        icon={<Icon icon="trash" />}
                                        intent={Intent.DANGER}
                                        onClick={event => handleRemoveLocation(event, location)}
                                    />
                                </Col>
                            </Row>
                        }
                        onClick={() => handleCopyLocation(location)}
                    />
                ))}
            </Menu>

            <LocationPicker onSelect={handleSaveLocation}>
                <RoundButton dashed title={translate("Add location")} />
            </LocationPicker>
        </Grid>
    );
};

interface IOSMLocation {
    display_name: string;
    lat: number;
    lon: number;
}
interface ILocationPickerProps {
    children: React.ReactNode;
    onSelect: (location: ILocation) => void;
}
const LocationPicker: FunctionComponent<ILocationPickerProps> = ({ children, onSelect }) => {
    const debounce = useRef<NodeJS.Timeout | null>(null);
    const [query, setQuery] = useState("");
    const [locations, setLocations] = useState<ILocation[]>([]);

    useEffect(() => {
        if (query.trim().length) {
            axios
                .get(
                    `https://nominatim.openstreetmap.org/search?format=json&q=${query
                        .trim()
                        .replace(/ /g, "+")}`
                )
                .then((response: AxiosResponse) => {
                    setLocations(
                        response.data.map((location: IOSMLocation) => {
                            return {
                                title: location.display_name,
                                coordinates: [location.lat, location.lon],
                            };
                        })
                    );
                });
        } else {
            setLocations([]);
        }
    }, [query]);

    const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        const query: string = event.currentTarget.value;

        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }

        debounce.current = setTimeout(() => {
            setQuery(query);
        }, 500);
    };

    const handleSelectLocation = (location: ILocation) => {
        onSelect(location);
        setQuery("");
    };

    return (
        <Popover
            content={
                <div className="search-list-popover">
                    <InputGroup
                        placeholder={translate("Search location")}
                        type="search"
                        leftElement={<Icon icon="search" />}
                        autoFocus
                        onChange={handleChangeQuery}
                    />
                    {locations.length > 0 && (
                        <Scroller maxWidth={400} maxHeight={500} vertical thin>
                            <Menu>
                                {locations.map((location: ILocation, i: number) => {
                                    return (
                                        <MenuItem
                                            icon={<Icon icon="marker-pin-02" />}
                                            text={highlightText(location.title, query)}
                                            key={i}
                                            multiline
                                            onClick={() => handleSelectLocation(location)}
                                        />
                                    );
                                })}
                            </Menu>
                        </Scroller>
                    )}

                    {locations.length === 0 && (
                        <BlankSlate small title={translate("Search a location")} icon="marker-pin-04" />
                    )}
                </div>
            }
            lazy
        >
            {children}
        </Popover>
    );
};
