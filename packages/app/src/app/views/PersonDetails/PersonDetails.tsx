// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import {
    Button,
    Callout,
    Classes,
    Colors,
    CompoundTag,
    Drawer,
    FormGroup,
    HTMLSelect,
    InputGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Radio,
    RadioGroup,
    Dialog as SystemDialog,
    TextArea,
    Tooltip,
} from "@blueprintjs/core";
import { DatePicker } from "@blueprintjs/datetime";
import { translate } from "@stacks/translations";
import { shallowEqual } from "app/hooks/store";
import { PEOPLE_GENDER_LABELS, PEOPLE_TITLE_LABELS } from "app/locale/dynamic-messages";
import classNames from "classnames";
import isEqual from "lodash/isEqual";
import xor from "lodash/xor";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import {
    APPICONS,
    FILES_TYPE,
    IAttachment,
    IPerson,
    ITag,
    PERSONTITLE,
    RECORDTYPE,
    TAGSECTION,
    UUID,
} from "@stacks/types";
import {
    Avatar,
    BlankSlate,
    Col,
    Grid,
    Icon,
    Link,
    PopupNewGeneric,
    Row,
    Scroller,
} from "app/components/common";
import { FeeInputPopup, TaskDetailsSection } from "app/components/project";
import { useElementHotkey, useMe, useOnClickOutside, usePerson, useRoles } from "app/hooks";
import { useUpload } from "app/hooks/fileUpload";
import { PeopleActions } from "app/store/actions";
import { RecentsActions } from "app/store/actions/recents";
import { toggleNewBookmark } from "app/store/global";
import { PeopleStore } from "app/store/people";
import { formatDate, formatDateDiff } from "app/utils/date";
import { share } from "app/utils/url";
import {
    CompanyPicker,
    CountryPicker,
    PersonDetailsAvatar,
    PersonDetailsEditButton,
    PersonDetailsStatus,
    PersonDetailsTags,
    PersonDetailsUpdateButton,
    PersonRole,
    Status,
    Tags,
    TagsWrapper,
} from "app/widgets";

export const PersonDetails = () => {
    const navigate = useNavigate();
    const personRef = useRef<HTMLDivElement | null>(null);

    const handleClose = () => {
        navigate("/people/");
    };

    useOnClickOutside(personRef, () => handleClose(), [".person-keep", `.${Classes.PORTAL}`]);

    return (
        <div
            className={classNames(["person-drawer embedded", Classes.DRAWER, Classes.POSITION_RIGHT])}
            ref={personRef}
        >
            <Person onClose={handleClose} />
        </div>
    );
};

export const PersonDetailsPanel = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const locationState = location.state as { backgroundLocation?: Location };
    const [open, setOpen] = useState(true);

    const handleDialogClose = () => {
        setOpen(false);
    };

    const handleDialogClosed = () => {
        navigate(locationState?.backgroundLocation?.pathname || "/");
    };

    return (
        <Drawer
            className="person-drawer"
            isOpen={open}
            onClose={handleDialogClose}
            onClosed={handleDialogClosed}
        >
            <Person onClose={handleDialogClose} />
        </Drawer>
    );
};

interface PersonProps {
    onClose: () => void;
}
const Person: FunctionComponent<PersonProps> = ({ onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const params = useParams<"id">();
    const { isLoading, person } = usePerson(params.id);

    useEffect(() => {
        if (!person) return;
        RecentsActions.add({
            title: `${person?.firstName} ${person?.lastName}`,
            icon: APPICONS.PERSON,
            url: `/person/${person.id}`,
        });
    }, [person]);

    const handleToggleEditing = () => {
        setIsEditing(!isEditing);
    };

    const handleSavePerson = (person?: IPerson) => {
        handleToggleEditing();

        if (person) {
            PeopleActions.update(person.id, person);
        }
    };

    if (!isLoading && person && !isEditing) {
        return <PersonRead person={person} onClose={onClose} onEdit={handleToggleEditing} />;
    }

    if (!isLoading && person && isEditing) {
        return <PersonEditing person={person} onClose={onClose} onSave={handleSavePerson} />;
    }

    return null;
};

interface IPersonEditingProps {
    person: IPerson;
    onClose: () => void;
    onSave: (person?: IPerson) => void;
}
const PersonEditing: FunctionComponent<IPersonEditingProps> = ({ person, onClose, onSave }) => {
    const [updatedPerson, setUpdatedPerson] = useState<IPerson>(person);
    const [changePassword, setChangePassword] = useState(false);
    const currentUser = useMe();
    const roles = useRoles();
    const { pickFiles } = useUpload();

    const isAdmin = useMemo(() => {
        return currentUser.admin;
    }, [currentUser]);

    const canSave = useMemo(() => {
        return !isEqual(person, updatedPerson);
    }, [person, updatedPerson]);

    const shouldShowCustomTitle = useMemo(() => {
        return (
            updatedPerson &&
            updatedPerson.title?.length != null &&
            !Object.values(PERSONTITLE).includes(updatedPerson.title)
        );
    }, [updatedPerson]);

    const handleCancel = () => {
        onSave();
    };

    const update = (key: keyof IPerson, value: IPerson[keyof IPerson]) => {
        setUpdatedPerson({ ...updatedPerson, [key]: value });
    };

    const handleAddAvatar = async () => {
        pickFiles({
            recordId: person.id,
            type: FILES_TYPE.AVATAR,
            acceptedFileTypes: "image/*",
            onUploaded: async (uploadedFiles: IAttachment[]) => {
                if (uploadedFiles.length && uploadedFiles[0].previewUrl) {
                    const avatar = await PeopleActions.setAvatar(person.id, uploadedFiles[0].previewUrl);
                    update("avatar", avatar);
                    window.toaster.show({
                        message: "Avatar image changed successfully!",
                        intent: Intent.SUCCESS,
                    });
                } else {
                    window.toaster.show({
                        message: "Avatar image could not been changed!",
                        intent: Intent.WARNING,
                    });
                }
            },
        });
    };

    const handleToggleTag = (tag: ITag) => {
        update("tags", xor(updatedPerson.tags, [tag.id]));
    };

    const handleToggleStatus = (tag: ITag) => {
        update("status", tag.id);
    };

    const handleUpdatePerson = () => {
        onSave(updatedPerson);
    };

    const upsertHourlyRate = (rate: number | undefined, currency: string) => {
        if (rate) {
            update("hourlyRates", { ...updatedPerson.hourlyRates, [currency]: rate });
        }
    };

    const removeHourlyRate = (currency: string) => {
        const { [currency]: removedRate, ...remainingRates } = updatedPerson.hourlyRates;
        update("hourlyRates", remainingRates);
    };

    return (
        <>
            <div className={Classes.DRAWER_HEADER}>
                <div>
                    <Tooltip content="Cancel and back" placement="bottom">
                        <Button
                            size="small"
                            variant="minimal"
                            icon={<Icon icon="arrow-left" />}
                            onClick={handleCancel}
                        />
                    </Tooltip>

                    {isAdmin && (
                        <Popover
                            placement="bottom"
                            content={
                                <Menu>
                                    <MenuItem
                                        text="Change password..."
                                        icon={<Icon icon="lock-keyhole-square" />}
                                        onClick={() => setChangePassword(true)}
                                    />
                                    <MenuItem text="Role" icon={<Icon icon="user-square" />}>
                                        {roles.map(role => (
                                            <MenuItem
                                                key={role.id}
                                                text={role.title}
                                                labelElement={
                                                    updatedPerson.role === role.title ? (
                                                        <Icon icon="check" />
                                                    ) : undefined
                                                }
                                                onClick={() => update("role", role.id)}
                                            />
                                        ))}
                                    </MenuItem>
                                </Menu>
                            }
                        >
                            <Button icon={<Icon icon="dots-vertical" />} size="small" variant="minimal" />
                        </Popover>
                    )}
                </div>
                <div>
                    <Tooltip content="Close person detail" placement="bottom-end">
                        <Button
                            size="small"
                            variant="minimal"
                            icon={<Icon icon="align-right-01" />}
                            onClick={onClose}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={classNames(Classes.DRAWER_BODY, "person-details")}>
                <div className="person-details__header">
                    <PersonDetailsAvatar person={person} onClick={handleAddAvatar} />

                    <Grid gap={5} align="center">
                        <h3>
                            {updatedPerson.title && updatedPerson.title !== PERSONTITLE.NONE
                                ? `${updatedPerson.title} `
                                : null}
                            {updatedPerson.firstName} {updatedPerson.lastName}
                        </h3>

                        <PersonRole roleId={updatedPerson.role} />
                    </Grid>
                </div>
                <Scroller className="person-details__content editing" vertical shadows thin>
                    <Grid gap={0}>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("First name")} labelFor="first-name">
                                    <InputGroup
                                        defaultValue={updatedPerson?.firstName ?? undefined}
                                        id="first-name"
                                        placeholder={translate("First name")}
                                        large
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("firstName", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Last name")} labelFor="last-name">
                                    <InputGroup
                                        defaultValue={updatedPerson?.lastName ?? undefined}
                                        id="last-name"
                                        placeholder={translate("Last name")}
                                        large
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("lastName", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Nickname")} labelFor="nickname">
                                    <InputGroup
                                        defaultValue={updatedPerson?.nickname ?? undefined}
                                        id="nickname"
                                        placeholder={translate("Nickname")}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("nickname", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20} gutter={20}>
                            <Col>
                                <FormGroup
                                    label={`${translate("Birthday")} (${
                                        updatedPerson && updatedPerson.birthday
                                            ? formatDateDiff(updatedPerson.birthday)
                                            : "-"
                                    })`}
                                    labelFor="nickname"
                                    style={{ width: "auto" }}
                                >
                                    <DatePicker
                                        value={updatedPerson.birthday}
                                        className={Classes.ELEVATION_1}
                                        minDate={new Date("1900-01-01")}
                                        maxDate={new Date("2100-01-01")}
                                        onChange={(date: Date | null) => date && update("birthday", date)}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row padding={20} gutter={20}>
                            <Col>
                                <FormGroup label="Title" labelFor="title">
                                    <HTMLSelect
                                        value={updatedPerson?.title ?? undefined}
                                        fill
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            update("title", e.currentTarget.value)
                                        }
                                    >
                                        <option value="">- None -</option>
                                        {Object.values(PERSONTITLE).map((title: PERSONTITLE) => {
                                            return (
                                                <option value={title} key={title}>
                                                    {PEOPLE_TITLE_LABELS[title]}
                                                </option>
                                            );
                                        })}
                                        <option value="">Custom</option>
                                    </HTMLSelect>
                                </FormGroup>
                            </Col>

                            {shouldShowCustomTitle && (
                                <Col>
                                    <FormGroup label="Custom title" labelFor="custom-title">
                                        <InputGroup
                                            defaultValue={updatedPerson?.title ?? undefined}
                                            id="custom-title"
                                            placeholder="Custom title"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("title", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            )}
                        </Row>

                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Gender")}>
                                    <RadioGroup
                                        selectedValue={updatedPerson?.gender}
                                        inline
                                        onChange={(e: React.FormEvent<HTMLInputElement>) =>
                                            update("gender", e.currentTarget.value)
                                        }
                                    >
                                        <Radio label={translate("Male")} value="male" />
                                        <Radio label={translate("Female")} value="female" />
                                        <Radio label={translate("Other")} value="other" />
                                    </RadioGroup>
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row padding={20} gutter={20}>
                            <Col>
                                <FormGroup label={translate("Tags")}>
                                    <PersonDetailsTags
                                        tags={updatedPerson.tags ?? []}
                                        onToggle={handleToggleTag}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <Row padding={20} gutter={20}>
                            <Col>
                                <FormGroup label={translate("Status")}>
                                    <PersonDetailsStatus
                                        value={updatedPerson.status}
                                        onToggle={handleToggleStatus}
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <h4>{translate("Company")}</h4>

                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Company")} labelFor="company">
                                    <Row gutter={10}>
                                        <Col>
                                            <CompanyPicker
                                                defaultValue={updatedPerson?.company ?? undefined}
                                                onChange={(companyId: string) => update("company", companyId)}
                                            />
                                        </Col>
                                        <Col width="auto">
                                            <Tooltip content="Add company" placement="top-end">
                                                <PopupNewGeneric
                                                    placeholder="Untitled company"
                                                    buttonText="Add"
                                                    onAdd={PeopleActions.addCompany}
                                                >
                                                    <Button icon={<Icon icon="plus" />}></Button>
                                                </PopupNewGeneric>
                                            </Tooltip>
                                        </Col>
                                    </Row>
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Job title")} labelFor="jobTitle">
                                    <InputGroup
                                        defaultValue={updatedPerson?.jobTitle ?? undefined}
                                        id="jobTitle"
                                        placeholder={translate("Job title")}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("jobTitle", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <h4>Contact</h4>

                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Email")} labelFor="email">
                                    <InputGroup
                                        defaultValue={updatedPerson?.email}
                                        id="email"
                                        placeholder={translate("Email")}
                                        type="email"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("email", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Office phone")} labelFor="officePhone">
                                    <InputGroup
                                        defaultValue={updatedPerson?.officePhone ?? undefined}
                                        id="officePhone"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("officePhone", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Cell phone")} labelFor="cellPhone">
                                    <InputGroup
                                        defaultValue={updatedPerson?.cellPhone ?? undefined}
                                        id="cellPhone"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("cellPhone", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Home phone")} labelFor="homePhone">
                                    <InputGroup
                                        defaultValue={updatedPerson?.homePhone ?? undefined}
                                        id="homePhone"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("homePhone", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Fax")} labelFor="fax">
                                    <InputGroup
                                        defaultValue={updatedPerson?.fax ?? undefined}
                                        id="fax"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("fax", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <h4>{translate("Address")}</h4>

                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Address")} labelFor="address">
                                    <InputGroup
                                        defaultValue={updatedPerson?.address ?? undefined}
                                        id="address"
                                        placeholder={translate("Address")}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("address", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Address Alternative")} labelFor="address2">
                                    <InputGroup
                                        defaultValue={updatedPerson?.address2 ?? undefined}
                                        id="address2"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("address2", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20} gutter={20}>
                            <Col>
                                <FormGroup label={translate("City")} labelFor="city">
                                    <InputGroup
                                        defaultValue={updatedPerson?.city ?? undefined}
                                        id="city"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("city", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                            <Col>
                                <FormGroup label={translate("Zip Postal Code")} labelFor="zip">
                                    <InputGroup
                                        defaultValue={updatedPerson?.zip ?? undefined}
                                        id="zip"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("zip", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20} gutter={20}>
                            <Col>
                                <FormGroup label={translate("County State")} labelFor="county">
                                    <InputGroup
                                        defaultValue={updatedPerson?.county ?? undefined}
                                        id="county"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("county", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                            <Col>
                                <FormGroup label={translate("Country")} labelFor="country">
                                    <CountryPicker
                                        defaultValue={updatedPerson?.country ?? undefined}
                                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                            update("country", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <h4>Social</h4>

                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Website")} labelFor="website">
                                    <InputGroup
                                        defaultValue={updatedPerson?.website ?? undefined}
                                        id="website"
                                        type="url"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("website", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label="Twitter" labelFor="socialTwitter">
                                    <InputGroup
                                        defaultValue={updatedPerson?.socialTwitter ?? undefined}
                                        id="socialTwitter"
                                        type="url"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("socialTwitter", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label="LinkedIn" labelFor="socialLinkedin">
                                    <InputGroup
                                        defaultValue={updatedPerson?.socialLinkedin ?? undefined}
                                        id="socialLinkedin"
                                        type="url"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("socialLinkedin", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label="Facebook" labelFor="socialFacebook">
                                    <InputGroup
                                        defaultValue={updatedPerson?.socialFacebook ?? undefined}
                                        id="socialFacebook"
                                        type="url"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("socialFacebook", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label="Instagram" labelFor="socialInstagram">
                                    <InputGroup
                                        defaultValue={updatedPerson?.socialInstagram ?? undefined}
                                        id="socialInstagram"
                                        type="url"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("socialInstagram", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label="Other URL" labelFor="socialOther">
                                    <InputGroup
                                        defaultValue={updatedPerson?.socialOther ?? undefined}
                                        id="socialOther"
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                            update("socialOther", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <h4>{translate("Notes")}</h4>
                        <Row padding={20}>
                            <Col>
                                <FormGroup label={translate("Notes")} labelFor="notes">
                                    <TextArea
                                        fill
                                        id="notes"
                                        rows={5}
                                        defaultValue={updatedPerson?.notes ?? undefined}
                                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                            update("notes", e.currentTarget.value)
                                        }
                                    />
                                </FormGroup>
                            </Col>
                        </Row>

                        <h4>Person hourly cost</h4>
                        <Row padding={20} style={{ marginBottom: 20 }}>
                            <Col>
                                {Object.keys(updatedPerson.hourlyRates).length === 0 && (
                                    <BlankSlate
                                        small
                                        title="No hourly rates"
                                        icon="currency-dollar"
                                        description="Add a user hourly rate to view profitability reports."
                                    >
                                        <FeeInputPopup onChange={upsertHourlyRate}>
                                            <Button intent={Intent.PRIMARY}>Add rate</Button>
                                        </FeeInputPopup>
                                    </BlankSlate>
                                )}

                                {Object.keys(updatedPerson.hourlyRates).length > 0 && (
                                    <TagsWrapper>
                                        {Object.entries(updatedPerson.hourlyRates).map(([currency, rate]) => (
                                            <FeeInputPopup
                                                onChange={upsertHourlyRate}
                                                value={rate}
                                                key={currency}
                                                currency={currency}
                                            >
                                                <CompoundTag
                                                    size="large"
                                                    leftContent={window.currencies[currency].symbol}
                                                    minimal
                                                    interactive
                                                    onRemove={() => removeHourlyRate(currency)}
                                                >
                                                    {rate}
                                                </CompoundTag>
                                            </FeeInputPopup>
                                        ))}
                                    </TagsWrapper>
                                )}
                            </Col>
                        </Row>

                        {Object.keys(updatedPerson.hourlyRates).length > 0 && (
                            <Row padding={20}>
                                <Col>
                                    <FeeInputPopup onChange={upsertHourlyRate}>
                                        <Button>Add rate</Button>
                                    </FeeInputPopup>
                                </Col>
                            </Row>
                        )}
                    </Grid>
                </Scroller>
                <div className="person-details__footer">
                    <PersonDetailsUpdateButton disabled={!canSave} onClick={handleUpdatePerson} />
                </div>
            </div>

            {changePassword && (
                <ChangePasswordDialog person={updatedPerson} onClose={() => setChangePassword(false)} />
            )}
        </>
    );
};

interface IChangePasswordDialogProps {
    person: IPerson;
    onClose: () => void;
}
const ChangePasswordDialog: FunctionComponent<IChangePasswordDialogProps> = ({ person, onClose }) => {
    const [open, setOpen] = useState(true);
    const [loading, setLoading] = useState(false);

    const handleClose = () => {
        setOpen(false);
    };

    const handleUpdatePassword = async () => {
        console.log("handleUpdatePassword is not implemented");

        // if (!person.email) return;

        // setLoading(true);
        // const response = await api("people/changePassword", { email: person.email });
        // if (response === true) {
        //     window.toaster.show({
        //         message: "Password reset was requested",
        //         intent: Intent.SUCCESS,
        //     });
        //     handleClose();
        // } else {
        //     window.toaster.show({
        //         message:
        //             "There was a problem while requesting the password reset. Please check your mail setting in the server settings and try again.",
        //         intent: Intent.DANGER,
        //     });
        // }

        // setLoading(false);
    };

    return (
        <SystemDialog
            title="Change password"
            isOpen={open}
            // style={{ width: 320 }}
            onClose={handleClose}
            onClosed={onClose}
        >
            <div className={Classes.DIALOG_BODY}>
                <Callout intent={person.email ? Intent.PRIMARY : Intent.WARNING}>
                    To reset the{" "}
                    <strong>
                        {person.firstName} {person.lastName}
                    </strong>
                    &apos;s password, please click the button below. This will send an email to{" "}
                    <strong>{person.email}</strong> with the password reset link.
                </Callout>
            </div>
            <div className={Classes.DIALOG_FOOTER}>
                <div className={Classes.DIALOG_FOOTER_ACTIONS}>
                    <Button variant="minimal" onClick={handleClose}>
                        {translate("Cancel")}
                    </Button>
                    <Button
                        intent={Intent.PRIMARY}
                        disabled={!Boolean(person.email)}
                        onClick={handleUpdatePassword}
                        loading={loading}
                    >
                        Request password reset
                    </Button>
                </div>
            </div>
        </SystemDialog>
    );
};

interface IPersonProps {
    person: IPerson;
    onClose: () => void;
    onEdit: () => void;
}
const PersonRead: FunctionComponent<IPersonProps> = ({ person, onClose, onEdit }) => {
    const currentUser = useMe();
    const location = useLocation();
    const roles = useRoles();

    const backgroundLocation =
        location.state && location.state.backgroundLocation
            ? location.state.backgroundLocation
            : {
                  pathname: `/people/person/${person.id}`,
                  search: "",
                  hash: "",
                  state: null,
              };

    const isAdmin = Boolean(currentUser.admin);

    const handleDeletePerson = () => {
        PeopleActions.removeAlert(person.id);
        onClose();
    };

    const handleExport = (format: "json" | "pdf" | "excel") => {
        PeopleActions.exportPerson(format, person.id);
    };

    const handleUpdateRole = (role: UUID) => {
        PeopleActions.update(person.id, { role });
    };

    return (
        <>
            <div className={Classes.DRAWER_HEADER}>
                <div>
                    <Popover
                        content={
                            <Menu>
                                {currentUser.admin && (
                                    <>
                                        <MenuItem text="Change role" icon={<Icon icon="user-square" />}>
                                            {roles.map(role => (
                                                <MenuItem
                                                    key={role.id}
                                                    text={role.title}
                                                    icon={<Icon icon="user-square" />}
                                                    labelElement={
                                                        person.role === role.id ? (
                                                            <Icon icon="check" />
                                                        ) : undefined
                                                    }
                                                    onClick={() => handleUpdateRole(role.id)}
                                                />
                                            ))}
                                        </MenuItem>
                                        <MenuDivider />
                                    </>
                                )}
                                <MenuItem text={translate("Export")} icon={<Icon icon="download-04" />}>
                                    <MenuItem
                                        text={translate("Export as", { type: ".xlsx" })}
                                        icon={<Icon icon="download-04" />}
                                        onClick={() => handleExport("excel")}
                                    />
                                    <MenuItem
                                        text={translate("Export as", { type: ".json" })}
                                        icon={<Icon icon="download-04" />}
                                        onClick={() => handleExport("json")}
                                    />
                                    <MenuItem
                                        text={translate("Export as", { type: ".pdf" })}
                                        icon={<Icon icon="download-04" />}
                                        onClick={() => handleExport("pdf")}
                                    />
                                </MenuItem>
                                <MenuDivider />
                                <MenuItem
                                    text={translate("Share link")}
                                    icon={<Icon icon="link-01" />}
                                    onClick={() => share(`e/${person.id}`)}
                                />
                                <MenuItem
                                    text={translate("Bookmark")}
                                    icon={<Icon icon="bookmark" />}
                                    onClick={toggleNewBookmark}
                                />
                                <MenuDivider />
                                <MenuItem
                                    text={translate("Delete person")}
                                    intent={Intent.DANGER}
                                    icon={<Icon icon="trash" />}
                                    onClick={handleDeletePerson}
                                />
                            </Menu>
                        }
                        placement="bottom-end"
                    >
                        <Button size="small" variant="minimal" icon={<Icon icon="dots-vertical" />} />
                    </Popover>

                    <FavoritePersonButton personId={person.id} />

                    {(currentUser?.id === person.id || isAdmin) && (
                        <PersonDetailsEditButton onClick={onEdit} />
                    )}
                </div>
                <div>
                    <Tooltip content="Close person detail" placement="bottom-end">
                        <Button
                            size="small"
                            variant="minimal"
                            icon={<Icon icon="align-right-01" />}
                            onClick={onClose}
                        />
                    </Tooltip>
                </div>
            </div>
            <div className={classNames(Classes.DRAWER_BODY, "person-details")}>
                <div className="person-details__header">
                    <div className="person-details__avatar">
                        <Avatar person={person} huge />
                    </div>
                    <Grid gap={5} align="center">
                        <h3>
                            {person.title && person.title !== PERSONTITLE.NONE ? `${person.title} ` : null}
                            {person.firstName} {person.lastName}
                        </h3>

                        <PersonRole roleId={person.role} />
                    </Grid>
                </div>
                <Scroller className="person-details__content" vertical thin shadows>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Birthday")} gap={10} centered>
                            {person.birthday && (
                                <>
                                    {formatDate(person.birthday, "dd")}{" "}
                                    <span className={Classes.TEXT_DISABLED}>
                                        ({formatDateDiff(person.birthday)}y)
                                    </span>
                                </>
                            )}
                            {!person.birthday && "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Nickname")} centered>
                            {person.nickname || "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Gender")} centered>
                            {person.gender ? PEOPLE_GENDER_LABELS[person.gender] ?? person.gender : "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Tags")} centered>
                            <TagsWrapper>
                                <Tags value={person.tags ?? []} section={TAGSECTION.PEOPLE} />
                            </TagsWrapper>
                        </TaskDetailsSection>
                    </div>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Status")} centered>
                            {person.status ? (
                                <Status status={person.status} section={TAGSECTION.PEOPLE} />
                            ) : null}
                        </TaskDetailsSection>
                    </div>

                    <h4>Contact</h4>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Email")} centered>
                            {person.email || "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Office phone")} centered>
                            {person.officePhone || "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Cell phone")} centered>
                            {person.cellPhone || "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Home phone")} centered>
                            {person.homePhone || "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Address")}>
                            {person.address || "-"}
                            <br />
                            {person.city} {person.zip} {person.county && <>({person.county})</>}
                            {person.country && (
                                <>
                                    <br />
                                    {person.country}
                                </>
                            )}
                        </TaskDetailsSection>
                    </div>

                    <h4>{translate("Company")}</h4>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Company")} centered>
                            {person.company ? (
                                <Link
                                    type={RECORDTYPE.COMPANY}
                                    id={person.company}
                                    showIcon
                                    backgroundLocation={backgroundLocation}
                                >
                                    <strong>
                                        {PeopleActions.getCompany(person.company)?.title || "Unknown"}
                                    </strong>
                                </Link>
                            ) : (
                                "-"
                            )}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Job title")} centered>
                            {person.jobTitle || "-"}
                        </TaskDetailsSection>
                    </div>

                    <h4>Social</h4>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Website")}>
                            {person.website && (
                                <a href={person.website} target="_blank" rel="noreferrer">
                                    {person.website}
                                </a>
                            )}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title="LinkedIn">
                            {person.socialLinkedin && (
                                <a href={person.socialLinkedin} target="_blank" rel="noreferrer">
                                    {person.socialLinkedin}
                                </a>
                            )}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title="Twitter">
                            <a href={person.socialTwitter ?? undefined} target="_blank" rel="noreferrer">
                                {person.socialTwitter}
                            </a>
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title="Instagram">
                            <a href={person.socialInstagram ?? undefined} target="_blank" rel="noreferrer">
                                {person.socialInstagram}
                            </a>
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title="Facebook">
                            <a href={person.socialFacebook ?? undefined} target="_blank" rel="noreferrer">
                                {person.socialFacebook}
                            </a>
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title="Other">
                            <a href={person.socialOther ?? undefined} target="_blank" rel="noreferrer">
                                {person.socialOther}
                            </a>
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Notes")}>{person.notes}</TaskDetailsSection>
                    </div>
                </Scroller>
            </div>
        </>
    );
};

interface IFavoritePersonButtonProps {
    personId: string;
}
const FavoritePersonButton: FunctionComponent<IFavoritePersonButtonProps> = ({ personId }) => {
    const favorites = PeopleStore.use(state => state.favoritePeople, shallowEqual);

    const handleToggleFavorite = () => {
        PeopleActions.toggleFavoritePerson(personId);
    };

    useElementHotkey("shift+f", "pd-favorite");

    const isFavorite = useMemo(() => {
        return favorites.includes(personId);
    }, [favorites]);

    return (
        <Tooltip
            content={translate(isFavorite ? "Remove from favorites" : "Add to favorites")}
            placement="bottom"
        >
            <Button
                small
                minimal
                id="pd-favorite"
                icon={
                    <Icon
                        icon={isFavorite ? "star-filled" : "star"}
                        color={isFavorite ? Colors.GOLD5 : undefined}
                    />
                }
                onClick={handleToggleFavorite}
            />
        </Tooltip>
    );
};
