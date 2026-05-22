// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import chunk from "lodash/chunk";
import React, { useMemo } from "react";

import { BlankSlate, Col, Grid, Row, Scroller } from "app/components/common";
import { useNav, useProjectAttachments } from "app/hooks";
import { snapshotTaskModalBackground } from "app/hooks/router";
import { useAttachmentsQuery } from "app/hooks/projectFilters";
import { APPICONS } from "@stacks/types";
import { PreferencesStore } from "app/store/preferences";
import { Attachment } from "app/widgets";
import { useParams } from "react-router-dom";

export const Attachments = () => {
    const navigate = useNav();
    const { id } = useParams();
    const query = useAttachmentsQuery();
    const attachments = useProjectAttachments(id ?? "");

    const filteredAttachments = useMemo(() => {
        return attachments.filter(attachment => attachment.originalName.toLowerCase().includes(query.toLowerCase()));
    }, [attachments, query]);

    const handleOpenTask = (taskId: string) => {
        if (PreferencesStore.get().embeddedTask) {
            navigate(`/project/${id}/${taskId}`);
        } else {
            navigate(`/task/${taskId}`, {
                state: {
                    backgroundLocation: snapshotTaskModalBackground(),
                },
            });
        }
    };

    if (attachments.length === 0) {
        return (
            <Grid vertical>
                <BlankSlate
                    icon={APPICONS.FILE}
                    title="No attachments"
                    description="This project does not contain any tasks with attachments. Open any task details to add the first attachment."
                />
            </Grid>
        );
    }

    return (
        <Scroller id="attachments-view" vertical>
            <Grid>
                {chunk(filteredAttachments, 3).map((row, i) => {
                    return (
                        <Row gutter={15} key={i}>
                            {row.map((attachment, j) => {
                                return (
                                    <Col key={j} align="stretch">
                                        <Attachment
                                            file={attachment}
                                            canDelete={false}
                                            onOpenTask={() => handleOpenTask(attachment.recordId)}
                                        />
                                    </Col>
                                );
                            })}

                            {row.length < 3
                                ? [...Array(3 - row.length).keys()].map(i => <Col key={i}>&nbsp;</Col>)
                                : null}
                        </Row>
                    );
                })}
            </Grid>
        </Scroller>
    );
};
