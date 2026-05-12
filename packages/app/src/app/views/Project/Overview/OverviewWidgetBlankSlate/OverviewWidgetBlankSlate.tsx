// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import { Grid, Row, Col, BlankSlate } from "app/components/common";
import { APPICONS } from "@stacks/types";

export const OverviewWidgetBlankSlate = () => {
    return (
        <Grid vertical>
            <Row>
                <Col justify="center">
                    <BlankSlate
                        icon={APPICONS.DATA}
                        title={translate("No data")}
                        description={translate("There s not enough data to render this widget")}
                        small
                        maxWidth={250}
                    />
                </Col>
            </Row>
        </Grid>
    );
};
