// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import { Button, Classes, FormGroup, Intent, TextArea, Tooltip } from "@blueprintjs/core";
import axios from "axios";
import React, { FunctionComponent, useEffect, useMemo, useState } from "react";

import Storage from "app/utils/storage";
import { Icon } from "../Icon/Icon";

import { PeopleActions } from "app/store/actions";
import { openInNewTab } from "app/utils/browser";
import config from "config";

interface FeedbackMessageProps {
    onToggleCheckbox: (doNotShow: boolean) => void;
}
const FeedbackMessage: FunctionComponent<FeedbackMessageProps> = ({ onToggleCheckbox }) => {
    const me = PeopleActions.getPerson(PeopleActions.getMe());
    const [happy, setHappy] = useState<undefined | number>(undefined);
    const [message, setMessage] = useState<string>("");
    const [email] = useState<string>(me?.email ?? "");
    const [doNotShow, setDoNotShow] = useState(false);
    const [sending, setSending] = useState<boolean>(false);

    useEffect(() => {
        onToggleCheckbox(doNotShow);
    }, [doNotShow]);

    const sendable = useMemo(() => {
        return (
            message.length > 0 &&
            email.length > 0 &&
            /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(email)
        );
    }, [message, email]);

    const handleSendMessage = () => {
        setSending(true);
        axios
            .post(
                "https://getstacksapp.com/feedbacks/",
                JSON.stringify({
                    message,
                    email,
                    happy,
                    os: window.platform,
                    version: config.version,
                    stop: doNotShow,
                }),
                {
                    headers: {
                        "Content-Type": "application/json",
                    },
                }
            )
            .then(() => {
                setHappy(undefined);
                setMessage("");
                setDoNotShow(false);
                window.toaster.show({
                    message: "Thanks for your feedback!",
                    intent: "success",
                    icon: "tick",
                });
            })
            .catch(() => {
                window.toaster.show({
                    message: "We couldn't send your feedback. Please try again later.",
                    intent: "danger",
                    icon: "error",
                });
            })
            .finally(() => {
                setSending(false);
            });
    };

    return (
        <div style={{ width: 250 }}>
            <h4 style={{ margin: 0 }}>Hey, got a minute?</h4>
            <div>
                How satisfied are you with Stacks at the moment?
                <div
                    style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 5,
                    }}
                >
                    <Tooltip
                        portalClassName="feedback-item-tooltip"
                        content="Highly dissatisfied"
                        position="top"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref, ...props }) => (
                            <Button
                                variant="minimal"
                                size="large"
                                active={happy === -2}
                                icon={<Icon icon="face-sad" size={28} />}
                                className="satisfaction"
                                intent={Intent.DANGER}
                                onClick={() => setHappy(-2)}
                                ref={ref}
                                {...props}
                            />
                        )}
                    />

                    <Tooltip
                        portalClassName="feedback-item-tooltip"
                        content="Dissatisfied"
                        position="top"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref, ...props }) => (
                            <Button
                                variant="minimal"
                                size="large"
                                active={happy === -1}
                                icon={<Icon icon="face-frown" size={28} />}
                                className="satisfaction"
                                intent={Intent.WARNING}
                                onClick={() => setHappy(-1)}
                                ref={ref}
                                {...props}
                            />
                        )}
                    />

                    <Tooltip
                        portalClassName="feedback-item-tooltip"
                        content="It's OK"
                        position="top"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref, ...props }) => (
                            <Button
                                variant="minimal"
                                size="large"
                                active={happy === 0}
                                icon={<Icon icon="face-neutral" size={28} />}
                                className="satisfaction"
                                intent={Intent.NONE}
                                onClick={() => setHappy(0)}
                                ref={ref}
                                {...props}
                            />
                        )}
                    />

                    <Tooltip
                        portalClassName="feedback-item-tooltip"
                        content="Satisfied"
                        position="top"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref, ...props }) => (
                            <Button
                                variant="minimal"
                                size="large"
                                active={happy === 1}
                                icon={<Icon icon="face-smile" size={28} />}
                                className="satisfaction"
                                intent={Intent.PRIMARY}
                                onClick={() => setHappy(1)}
                                ref={ref}
                                {...props}
                            />
                        )}
                    />

                    <Tooltip
                        portalClassName="feedback-item-tooltip"
                        content="Highly satisfied"
                        position="top"
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                        renderTarget={({ isOpen, ref, ...props }) => (
                            <Button
                                variant="minimal"
                                size="large"
                                active={happy === 2}
                                icon={<Icon icon="face-happy" size={28} />}
                                className="satisfaction"
                                intent={Intent.SUCCESS}
                                onClick={() => setHappy(2)}
                                ref={ref}
                                {...props}
                            />
                        )}
                    />
                </div>
            </div>
            {happy != null && (
                <React.Fragment>
                    <div style={{ marginTop: 10 }}>
                        <FormGroup label="Tell us why">
                            <TextArea
                                fill
                                onChange={e => setMessage(e.currentTarget.value)}
                                disabled={sending}
                                rows={5}
                            />
                        </FormGroup>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                            <div>
                                <a
                                    className={Classes.TEXT_SMALL}
                                    href="https://discussions.getstacksapp.com"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    Discussions
                                </a>
                            </div>
                        </div>
                        <Button
                            intent="primary"
                            icon="send-message"
                            disabled={!sendable}
                            loading={sending}
                            onClick={handleSendMessage}
                        >
                            Send
                        </Button>
                    </div>
                </React.Fragment>
            )}
        </div>
    );
};

const NEVER = 90000000000000;
const TWO_WEEKS = 1209600000;
const TWO_DAYS = 259200000;
const FEEDBACK_KEY = "appFeedback";

export const Feedback = {
    now: Date.now(),
    doNotShow: false,
    openFeedback: () => {
        Storage.remove(FEEDBACK_KEY);
        window.toaster.show({
            message: <FeedbackMessage onToggleCheckbox={doNotShow => (Feedback.doNotShow = doNotShow)} />,
            icon: "comment",
            timeout: 0,
            action: {
                text: "Survey",
                onClick: () => {
                    // Storage.set(`appFeedback${feedbackCount}`, monthFromNow.toString(), false);
                    window.open("https://forms.gle/n8RaiJGCZz9J4yvX9", "_blank", "noopener,noreferrer");
                },
            },
            onDismiss: () => {
                Storage.set(
                    FEEDBACK_KEY,
                    (Feedback.now + (Feedback.doNotShow ? NEVER : TWO_WEEKS)).toString()
                );
            },
        });
    },
    appFeedback: () => {
        const appFeedbackToggle = Number(Storage.get<string>(FEEDBACK_KEY));

        if (isNaN(appFeedbackToggle)) {
            Storage.set(FEEDBACK_KEY, (Feedback.now + TWO_DAYS).toString());
        } else if (Feedback.now >= appFeedbackToggle) {
            Feedback.openFeedback();
        }
    },
};

const SurveyMessage = ({ onClose }: { onClose: () => void }) => {
    const handleLater = () => {
        Storage.set("appSurvey", (Date.now() + TWO_DAYS).toString());
        onClose();
    };

    const handleTakeSurvey = () => {
        Storage.set("appSurvey", (Date.now() + NEVER).toString());
        openInNewTab("https://forms.gle/oYEQ1vNhxgzjjFZC6");
        onClose();
    };

    return (
        <div style={{ width: 350 }}>
            <h4 style={{ marginTop: 0, marginBottom: 10 }}>Help us improve your experience!</h4>
            <p>
                We are always looking for ways to improve our project management app and your feedback can
                help us do just that. Please take a moment to complete our quick survey and let us know about
                your experience with our app. The survey will only take a few minutes to complete and we would
                greatly appreciate your input.
                <br />
                Thank you for your time and support!
            </p>
            <Button intent={Intent.PRIMARY} onClick={handleTakeSurvey}>
                Take the Survey Now
            </Button>
            &nbsp;
            <Button variant="minimal" onClick={handleLater}>
                {translate("Maybe later")}
            </Button>
        </div>
    );
};

export const Survey = {
    toastId: "",
    openSurvey: () => {
        Storage.remove("appFeedback");
        function close() {
            window.toaster.dismiss(Survey.toastId);
        }

        Survey.toastId = window.toaster.show({
            message: <SurveyMessage onClose={close} />,
            icon: "crown",
            timeout: 0,
            onDismiss: () => {
                Storage.set("appSurvey", (Date.now() + TWO_DAYS).toString());
            },
        });
    },
    appSurvay: () => {
        const appSurveyToggle = Number(Storage.get<string>("appSurvey"));

        if (Date.now() >= appSurveyToggle || isNaN(appSurveyToggle)) {
            Survey.openSurvey();
        }
    },
};
