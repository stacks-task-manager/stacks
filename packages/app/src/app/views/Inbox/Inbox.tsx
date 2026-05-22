// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Card, CardList, Classes, Colors, Divider, Intent } from "@blueprintjs/core";
import classNames from "classnames";
import { format, formatDistanceToNow } from "date-fns";
import React, { FC, FunctionComponent, useCallback, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import { APPICONS, INotification, NOTIFICATION_RECORD_TYPE } from "@stacks/types";
import { BlankSlate, Col, Grid, Icon, IconPill, Row, Scroller } from "app/components/common";
import { useFilterQuerySync, useHasFilters, useInboxFilterMerge, useNotifications } from "app/hooks";
import { defaultFilters } from "app/store/projectFilters";
import { NotificationsActions } from "app/store/actions";
import { toggleNewTask } from "app/store/global";
import { AppView, AppViewContent, InboxToolbar, TaskRowSkeleton } from "app/widgets";

type NotificationIconType = Record<NOTIFICATION_RECORD_TYPE | "notification", string>;

const NotificationIcon: NotificationIconType = {
    notification: "bell-ringing-01",
    [NOTIFICATION_RECORD_TYPE.TASK]: APPICONS.TASK,
    [NOTIFICATION_RECORD_TYPE.TIMELOG]: APPICONS.TIMELOG,
    [NOTIFICATION_RECORD_TYPE.PROJECT]: APPICONS.PROJECT,
    [NOTIFICATION_RECORD_TYPE.COMMENT]: APPICONS.COMMENT,
    [NOTIFICATION_RECORD_TYPE.PERSON]: APPICONS.PERSON,
    [NOTIFICATION_RECORD_TYPE.NOTEPAD]: APPICONS.NOTEPAD,
};

const IconColor: NotificationIconType = {
    notification: Colors.BLUE4,
    [NOTIFICATION_RECORD_TYPE.TASK]: Colors.RED2,
    [NOTIFICATION_RECORD_TYPE.TIMELOG]: Colors.INDIGO2,
    [NOTIFICATION_RECORD_TYPE.PROJECT]: Colors.GREEN2,
    [NOTIFICATION_RECORD_TYPE.COMMENT]: Colors.ORANGE2,
    [NOTIFICATION_RECORD_TYPE.PERSON]: Colors.VIOLET2,
    [NOTIFICATION_RECORD_TYPE.NOTEPAD]: Colors.GOLD2,
};

export const Inbox = () => {
    const notifications = useNotifications();
    const [selected, setSelected] = useState<string | undefined>(undefined);

    const notification = useMemo(
        () => notifications.find(notification => notification.id === selected),
        [notifications, selected]
    );

    const handleSelectNotification = useCallback((id: string) => {
        setSelected(id);

        NotificationsActions.read(id);
    }, []);

    return (
        <AppView toolbar={<InboxToolbar />}>
            <AppViewContent>
                <div id="notifications">
                    <div className="notifications__sidebar">
                        {notifications.length > 0 ? (
                            <CardList bordered={false}>
                                <Scroller thin vertical>
                                    {notifications.map(notification => (
                                        <Notification
                                            key={notification.id}
                                            notification={notification}
                                            isSelected={selected === notification.id}
                                            onSelect={handleSelectNotification}
                                        />
                                    ))}
                                </Scroller>
                            </CardList>
                        ) : (
                            <BlankSlate
                                title="No notifications"
                                description="All new updates in your inbox will appear here"
                                icon="message-chat-square"
                            />
                        )}
                    </div>
                    <div className="notifications__content">
                        {notification ? (
                            <Grid>
                                <Row className="notifications__block" gutter={5}>
                                    <Col width={30}>
                                        <IconPill
                                            icon={NotificationIcon[notification.recordType ?? "notification"]}
                                            size="large"
                                            color={IconColor[notification.recordType ?? "notification"]}
                                        />
                                    </Col>
                                    <Col fill vertical>
                                        <h2 style={{ margin: 0 }}>{notification.subject}</h2>
                                        <div className={Classes.TEXT_MUTED}>
                                            {format(notification.created, "PP pp")}
                                        </div>
                                    </Col>
                                    <Col unshrinkable width={200} justify="right" align="center">
                                        <NotificationButton
                                            recordId={notification.recordId}
                                            recordType={notification.recordType}
                                        />
                                    </Col>
                                </Row>
                                <Divider />
                                <div className="notifications__block">{notification.message}</div>
                                <pre>{JSON.stringify(notification.data)}</pre>
                            </Grid>
                        ) : (
                            <Grid vertical>
                                <BlankSlate
                                    title="Nothing to preview"
                                    description="Select a notification to preview its details"
                                    icon="lightbulb-04"
                                />
                            </Grid>
                        )}
                    </div>
                </div>
            </AppViewContent>
        </AppView>
    );
};

interface NotificationProps {
    notification: INotification;
    isSelected?: boolean;
    onSelect: (id: string) => void;
}
const Notification: FunctionComponent<NotificationProps> = ({ notification, isSelected, onSelect }) => {
    return (
        <Card
            interactive
            selected={isSelected}
            className={classNames({ selected: isSelected })}
            key={notification.id}
            onClick={() => onSelect(notification.id)}
        >
            <Grid
                gap={0}
                className={classNames("notifications__notification", { unread: !notification.read })}
            >
                <div className="notifications__column">
                    <IconPill
                        icon={NotificationIcon[notification.recordType ?? "notification"]}
                        color={IconColor[notification.recordType ?? "notification"]}
                    />
                    <div>
                        <div className="notifications__subject">{notification.subject}</div>
                        <div className="notifications__message">{notification.message}</div>
                        <div className="notifications__date">
                            {formatDistanceToNow(notification.created, { addSuffix: true })}
                        </div>
                    </div>
                </div>
            </Grid>
        </Card>
    );
};

interface NotificationButtonProps {
    recordId?: string;
    recordType?: NOTIFICATION_RECORD_TYPE;
}
const NotificationButton: FC<NotificationButtonProps> = ({ recordId, recordType }) => {
    const navigate = useNavigate();

    const buttonLabel = useMemo(() => {
        switch (recordType) {
            case NOTIFICATION_RECORD_TYPE.TASK:
                return "Open task";

            default:
                return "Open";
        }
    }, [recordType]);

    if (!recordId) {
        return null;
    }

    const handleOpenRecord = () => {
        if (recordType === NOTIFICATION_RECORD_TYPE.TASK) {
            navigate(`/tasks/${recordId}`);
        } else {
            navigate(`/projects/${recordId}`);
        }
    };

    return (
        <Button endIcon={<Icon icon="link-external-01" />} intent={Intent.PRIMARY} onClick={handleOpenRecord}>
            {buttonLabel}
        </Button>
    );
};

const InboxLoading = () => {
    return (
        <Grid>
            {[...Array(5).keys()].map(i => (
                <TaskRowSkeleton key={i} />
            ))}
        </Grid>
    );
};

const InboxBlankSlate = () => {
    const hasFilters = useHasFilters();

    return (
        <Grid vertical>
            <BlankSlate
                icon={APPICONS.INBOX}
                title={translate("No inbox tasks")}
                description={translate(
                    hasFilters
                        ? "Oops No tasks match your current filter settings in your inbox Give it another try by adjusting your filter settings"
                        : "You don t have any tasks in your inbox yet Click the button bellow to add a task"
                )}
            >
                <Button text={translate("Add task")} intent="primary" onClick={toggleNewTask} />
            </BlankSlate>
        </Grid>
    );
};
