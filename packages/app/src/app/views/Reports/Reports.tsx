// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Card, Classes, H4 } from "@blueprintjs/core"
import React, { FunctionComponent, useEffect } from "react"
import { useNavigate } from "react-router-dom";

import { IReport, REPORT_TYPE, ROLE_SECTIONS } from "@stacks/types";
import { AccessGate, Col, Grid, IconPill, Row } from "app/components/common"
import { ReportsActions } from "app/store/actions";
import { AppView, AppViewContent, ToolbarReports } from "app/widgets"
import { useReports } from "app/hooks";

export const Reports = () => {
    const { reports, isLoading } = useReports();

    useEffect(() => {
        ReportsActions.loadList();
    }, []);

    return (
        <AppView toolbar={<ToolbarReports />} id="reports">
            <AppViewContent padded>
                <AccessGate section={ROLE_SECTIONS.REPORTS} small={false}>
                    <Grid>
                        <Row gutter={10} wrap justify="left">
                            {isLoading && Array.from(Array(16).keys()).map(i => (
                                <Col key={i} style={{ width: "25%", maxWidth: "25%" }}>
                                    <div style={{ padding: 5, height: "100%", width: "100%" }}>
                                        <ReportCard
                                            title="Lorem ipsum sit amet"
                                            description="Lorem ipsum sit amet"
                                            icon=""
                                            color=""
                                            type={REPORT_TYPE.ESTIMATED_VS_LOGGED}
                                            loading
                                        />
                                    </div>
                                </Col>
                            ))}
                            {!isLoading && reports.map((report) => (
                                <Col key={report.title} style={{ width: "25%", maxWidth: "25%" }}>
                                    <div style={{ padding: 5, height: "100%", width: "100%" }}>
                                        <ReportCard {...report} />
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </Grid>
                </AccessGate>
            </AppViewContent>
        </AppView>
    )
}

interface ReportCardProps extends IReport {
    loading?: boolean;
}
const ReportCard: FunctionComponent<ReportCardProps> = ({ title, icon, description, color, type, loading, disabled }) => {
    const navigate = useNavigate();
    const handleOpenReport = (type: REPORT_TYPE) => {
        navigate(`/reports/${type}`);
    }

    return (
        <Card interactive={!disabled && !loading} style={{ width: "100%", height: "100%", opacity: disabled ? 0.5 : 1, cursor: disabled || loading ? "not-allowed" : "pointer" }} onClick={disabled || loading ? undefined : () => handleOpenReport(type)}>
            <Grid gap={10}>
                <IconPill icon={icon} size="large" color={color} className={loading ? Classes.SKELETON : undefined} />
                <div>
                    <H4 className={loading ? Classes.SKELETON : undefined}>{title}</H4>
                    <p className={loading ? Classes.SKELETON : undefined}>{description}</p>
                </div>
            </Grid>
        </Card>
    )
}