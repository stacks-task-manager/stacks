// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { useEffect } from "react";
import { Intent, Dialog, Classes, Button, Checkbox, Card, H5 } from "@blueprintjs/core";
import Storage from "app/utils/storage";
import { usePreferences } from "app/hooks";
import { WebsiteAPI } from "app/api";
import { PreferencesActions } from "app/store/actions/preferences";

export interface IAnnouncement {
    id: number;
    title: string;
    message: string;
    question: string;
    url: string;
    yes?: number;
    no?: number;
    hideTitle?: boolean;
    btnTitle?: string;
    width?: number;
    height?: number;
}

export const Announcement = () => {
    const [checked, setChecked] = React.useState(false);
    const [announcements, setAnnouncements] = React.useState<IAnnouncement[]>([]);
    const [announcement, setAnnouncement] = React.useState<IAnnouncement | undefined>();
    const [sending, setSending] = React.useState(false);
    const { showAnnouncements } = usePreferences(["showAnnouncements"]);

    useEffect(() => {
        const viewedAnnouncements = Storage.get("announcements", true, []);
        const eula = Storage.get<string>("eula");

        if (eula) {
            setTimeout(async () => {
                const announcements = await WebsiteAPI.loadAnnouncements();

                const downloadedAnnouncements = announcements
                    .filter((a: IAnnouncement) => viewedAnnouncements.indexOf(a.id) === -1)
                    .filter(
                        (a: IAnnouncement) =>
                            (a.question.length > 0 && showAnnouncements) ||
                            a.question.length === 0
                    );

                setAnnouncements(downloadedAnnouncements);
            }, 2000);
        }
    }, []);

    useEffect(() => {
        if (announcements.length) handleShow();
    }, [announcements]);

    const handleShow = () => {
        if (announcements.length) {
            const nextAnnouncement = announcements[0];
            setAnnouncement(nextAnnouncement);
        } else {
            setAnnouncement(undefined);
        }
    };

    const handleNext = () => {
        setSending(false);
        setAnnouncement(undefined);
        setTimeout(() => {
            if (announcements.length) {
                setAnnouncements(announcements.slice(1));
            } else {
                setAnnouncements([]);
            }
        }, 1000);
    };

    const handleCheck = (event: React.ChangeEvent<HTMLInputElement>) => {
        const checked = event.target.checked;
        setChecked(checked);

        if (checked) {
            PreferencesActions.update("showAnnouncements", false);

            window.toaster.show({
                message:
                    "Greetings, I'm sorry to hear you don't want to assist us in deciding which new feature to add to Stacks in the future. Since we respect your feedback, just want to let you know that you can always re-enable the announcements notifications in the Preferences.",
                timeout: 0,
                icon: "chat",
                intent: Intent.WARNING,
                action: {
                    text: "Got it",
                    onClick: () => {
                        window.toaster.clear();
                    },
                },
            });
        } else {
            PreferencesActions.update("showAnnouncements", true);
            window.toaster.clear();
            window.toaster.show({
                message: "Thank you for having faith in us and helping us in making Stacks even better!",
                icon: "tick",
                intent: Intent.SUCCESS,
            });
        }
    };

    const handleAnswer = async (answer: boolean) => {
        if (!announcement || sending) return;

        const announcements = Storage.get("announcements", true, []);
        Storage.set("announcements", [...announcements, announcement.id]);

        if (announcement.question.length > 0) {
            setSending(true);
            const response = await WebsiteAPI.sendAnnouncementAnswer(announcement.id, answer);

            setAnnouncement({ ...announcement, yes: response.yes, no: response.no });
            window.toaster.clear();
            window.toaster.show({
                message: "Thank you for your feedback!",
                icon: "tick",
                intent: Intent.SUCCESS,
            });

            setTimeout(handleNext, 2000);
        } else {
            handleNext();
        }
    };

    return (
        <Dialog
            isOpen={Boolean(announcement)}
            icon={announcement && announcement.question.length > 0 ? "help" : "info-sign"}
            title={`Announcement: ${announcement?.hideTitle ? undefined : announcement?.title}`}
            isCloseButtonShown={false}
            style={{
                // paddingBottom: 15,
                width: announcement?.width || 700,
                height: announcement?.height || undefined,
            }}
        >
            <div className={Classes.DIALOG_BODY} style={{ maxHeight: 500, overflow: "auto", padding: 1 }}>
                {announcement && announcement.message && (
                    <div dangerouslySetInnerHTML={{ __html: announcement?.message }} />
                )}
                {announcement && announcement.question && (
                    <div>
                        <Card style={{ marginTop: 15 }}>
                            <H5>Question</H5>
                            {announcement.question}

                            <div className={Classes.DIALOG_FOOTER_ACTIONS} style={{ marginTop: 10 }}>
                                <Button
                                    onClick={() => handleAnswer(true)}
                                    intent={Intent.SUCCESS}
                                    icon="thumbs-up"
                                >
                                    {translate("Yes")}{" "}
                                    {announcement.yes != null && announcement.no != null
                                        ? `${Math.round(
                                            (announcement.yes * 100) / (announcement.yes + announcement.no)
                                        )}%`
                                        : ""}
                                </Button>{" "}
                                &nbsp;
                                <Button
                                    onClick={() => handleAnswer(false)}
                                    intent={Intent.WARNING}
                                    icon="thumbs-down"
                                >
                                    {translate("No")}{" "}
                                    {announcement.yes != null && announcement.no != null
                                        ? `${Math.round(
                                            (announcement.no * 100) / (announcement.yes + announcement.no)
                                        )}%`
                                        : ""}
                                </Button>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            <div className={Classes.DIALOG_FOOTER}>
                {announcement?.question.length === 0 && (
                    <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                        <Button onClick={() => handleAnswer(false)} intent={Intent.PRIMARY}>
                            {announcement.btnTitle && announcement.btnTitle.length > 0
                                ? announcement.btnTitle
                                : translate("OK")}
                        </Button>
                    </div>
                )}
                {announcement && announcement.question.length > 0 && (
                    <Checkbox
                        label="Do not show this kind of announcements any more"
                        style={{ marginBottom: 0 }}
                        checked={checked}
                        onChange={handleCheck}
                    />
                )}
            </div>
        </Dialog>
    );
};
