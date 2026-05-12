// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes } from "@blueprintjs/core";
import { Col, Grid, Row } from "app/components/common";
import { TagsWrapper } from "app/widgets/common";
import React from "react";

export const TaskRowSkeleton = () => {
    return (
        <Row gutter={10}>
            <Col collapse>
                <Button size="small" className={Classes.SKELETON} />
            </Col>
            <Col fill justify="stretch">
                <Grid gap={5}>
                    <div className={Classes.SKELETON}>Lorem ipsum dolor sit amet</div>
                    <div>
                        <span className={Classes.SKELETON}>Lorem ipsum dolor sit amet</span>
                    </div>

                    <TagsWrapper>
                        <Button size="small" className={Classes.SKELETON} />
            <Button size="small" className={Classes.SKELETON} />
            <Button size="small" className={Classes.SKELETON} />
            <Button size="small" className={Classes.SKELETON} />
            <Button size="small" className={Classes.SKELETON} />
            <Button size="small" className={Classes.SKELETON} />
                    </TagsWrapper>
                </Grid>
            </Col>
        </Row>
    );
};
