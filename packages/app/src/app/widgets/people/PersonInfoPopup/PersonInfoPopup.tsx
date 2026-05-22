// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, Divider, Intent, Popover } from "@blueprintjs/core";
import React, { FunctionComponent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { Avatar, Col, Grid, Row } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { usePerson } from "app/hooks";
import { TAGSECTION } from "@stacks/types";
import { Status, Tags, TagsWrapper } from "app/widgets/common";

interface PersonInfoPopupProps {
    personId: string;
    children: React.ReactNode;
}
export const PersonInfoPopup: FunctionComponent<PersonInfoPopupProps> = ({ personId, children }) => {
    return (
        <Popover content={<PersonInfo personId={personId} />} popoverClassName="popover-padded">
            {children}
        </Popover>
    );
};

interface PersonInfoProps {
    personId: string;
}
export const PersonInfo: FunctionComponent<PersonInfoProps> = ({ personId }) => {
    const { person } = usePerson(personId);
    const location = useLocation();
    const navigate = useNavigate();

    if (!person) {
        return <>Person not found</>;
    }

    const handleOpenPerson = () => {
        navigate(`/person/${person.id}`, {
            state: { backgroundLocation: location },
        });
    };

    return (
        <div style={{ width: 300, maxWidth: 400 }}>
            <Grid>
                <Grid>
                    <Row gutter={20}>
                        <Col width="auto">
                            <Avatar person={person} large />
                        </Col>
                        <Col>
                            <Grid gap={5}>
                                <h5 className={Classes.HEADING} style={{ marginBottom: 0 }}>
                                    {person.firstName} {person.lastName}
                                </h5>
                                {person.email != null ? <div>{person.email}</div> : null}
                            </Grid>
                        </Col>
                    </Row>

                    <Grid gap={10}>
                        {person.status != null ? (
                            <TaskDetailsSection title={translate("Status")} width={100}>
                                <Status status={person.status} section={TAGSECTION.PEOPLE} />
                            </TaskDetailsSection>
                        ) : null}
                        {person.tags && person.tags.length > 0 ? (
                            <TaskDetailsSection title={translate("Tags")} width={100}>
                                <TagsWrapper>
                                    <Tags value={person.tags} section={TAGSECTION.PEOPLE} />
                                </TagsWrapper>
                            </TaskDetailsSection>
                        ) : null}

                        <TaskDetailsSection
                            title={translate("Office phone")}
                            centered
                            width={100}
                        >
                            {person.officePhone || "-"}
                        </TaskDetailsSection>

                        <TaskDetailsSection
                            title={translate("Cell phone")}
                            centered
                            width={100}
                        >
                            {person.cellPhone || "-"}
                        </TaskDetailsSection>

                        <TaskDetailsSection
                            title={translate("Home phone")}
                            centered
                            width={100}
                        >
                            {person.homePhone || "-"}
                        </TaskDetailsSection>
                    </Grid>
                </Grid>

                <Grid gap={5}>
                    <Divider />

                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button className={Classes.POPOVER_DISMISS} variant="minimal">
                            {translate("Cancel")}
                        </Button>
                        <Button
                            className={Classes.POPOVER_DISMISS}
                            intent={Intent.PRIMARY}
                            onClick={handleOpenPerson}
                        >
                            Open person details
                        </Button>
                    </div>
                </Grid>
            </Grid>
        </div>
    );
};
