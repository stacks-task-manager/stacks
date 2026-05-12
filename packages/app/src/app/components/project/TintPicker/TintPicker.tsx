// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, H6, InputGroup, Intent } from "@blueprintjs/core";
import { Col, Grid, Icon, Row } from "app/components/common";
import { ButtonTooltip, ColorButton } from "app/widgets";
import React, { FunctionComponent, useRef, useState } from "react";
import { HexColorPicker } from "react-colorful";

const DEFAULT_COLORS = [
    ["#ffbe0b", "#fb5607", "#ff006e", "#8338ec", "#3a86ff"],
    ["#8ac926", "#c81d25", "#3a7ca5", "#e27396", "#474747"],
    ["#b5179e", "#00fea9", "#ff9a00", "#ff6e6e", "#e8ffc1"],
    ["#1f1c2c", "#5d54a4", "#7d94c1", "#bde0fe", "#fe5f55"],
];

interface ITintPickerProps {
    value?: string;
    canClear?: boolean;
    onChange: (color: string | undefined) => void;
}
export const TintPicker: FunctionComponent<ITintPickerProps> = ({ value, canClear, onChange }) => {
    const [advanced, setAdvanced] = useState(false);
    const [color, setColor] = useState(value);
    const [validColor, setValidColor] = useState(false);
    const debounce = useRef<NodeJS.Timeout | null>(null);

    const handleToggleAdvanced = () => {
        setAdvanced(!advanced);
    };

    const handleChangeColor = (theColor: string) => {
        if (debounce.current) {
            clearTimeout(debounce.current);
            debounce.current = null;
        }

        setValidColor(true);
        setColor(theColor);

        debounce.current = setTimeout(() => {
            onChange(theColor);
        }, 500);
    };

    const handleChangeHexColor = (event: React.ChangeEvent<HTMLInputElement>) => {
        const theColor = event.currentTarget.value;
        const isValid = /^#([0-9a-f]{3}){1,2}$/i.test(theColor);

        if (isValid) {
            onChange(theColor);
        }

        setValidColor(isValid);
        setColor(theColor.length > 0 ? (theColor.startsWith("#") ? theColor : `#${theColor}`) : theColor);
    };

    return (
        <div style={{ width: 200 }} data-testid="tint-picker">
            <Grid gap={5}>
                <Row>
                    <Col align="center">
                        <H6 style={{ margin: 0 }}>Select tint</H6>
                    </Col>
                    <Col justify="right">
                        <ButtonTooltip
                            buttonProps={{
                                icon: <Icon icon={advanced ? "colors" : "dropper"} />,
                                minimal: true,
                                small: true,
                                onClick: handleToggleAdvanced,
                            }}
                            tooltipProps={{
                                content: advanced
                                    ? "Switch to palette color picker"
                                    : "Switch to advanced color picker",
                                placement: "top",
                            }}
                        />
                    </Col>
                </Row>
                {advanced ? (
                    <Grid gap={10}>
                        <HexColorPicker color={value} onChange={handleChangeColor} />
                        <InputGroup
                            value={color}
                            leftIcon={<Icon icon="hash-02" />}
                            placeholder="Hex color"
                            rightElement={
                                <Button
                                    small
                                    minimal
                                    disabled
                                    icon={<Icon icon={validColor ? "check" : "x-close"} />}
                                    intent={Intent.SUCCESS}
                                />
                            }
                            onChange={handleChangeHexColor}
                        />
                    </Grid>
                ) : (
                    <Grid gap={5} padding={[5, 0]}>
                        {DEFAULT_COLORS.map((colorsRow, i) => (
                            <Row key={i}>
                                {colorsRow.map(color => (
                                    <Col justify="center" key={color}>
                                        <ColorButton
                                            color={color}
                                            isSelected={color === value}
                                            onClick={onChange}
                                        />
                                    </Col>
                                ))}
                            </Row>
                        ))}
                    </Grid>
                )}

                {value != null && canClear && (
                    <Button
                        small
                        minimal
                        fill
                        intent={Intent.WARNING}
                        className={Classes.POPOVER_DISMISS}
                        onClick={() => onChange(undefined)}
                    >
                        Remove tint
                    </Button>
                )}
            </Grid>
        </div>
    );
};
