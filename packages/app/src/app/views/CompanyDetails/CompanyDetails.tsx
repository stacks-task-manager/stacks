// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Button,
    Classes,
    Collapse,
    Colors,
    Drawer,
    FormGroup,
    InputGroup,
    Intent,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Tag,
    TextArea,
    Tooltip,
} from "@blueprintjs/core";
import { shallowEqual } from "app/hooks/store";
import classNames from "classnames";
import isEqual from "lodash/isEqual";
import xor from "lodash/xor";
import React, { FunctionComponent, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import { APPICONS, FILES_TYPE, IAttachment, ICompany, IPerson } from "@stacks/types";
import { BlankSlate, Col, Grid, Icon, RoundButton, Row, Scroller } from "app/components/common";
import { TaskDetailsSection } from "app/components/project";
import { useCompany, useCompanyStaff, useElementHotkey, useOnClickOutside } from "app/hooks";
import { useUpload } from "app/hooks/fileUpload";
import { PeopleActions } from "app/store/actions";
import { RecentsActions } from "app/store/actions/recents";
import { toggleNewBookmark } from "app/store/global";
import { PeopleStore } from "app/store/people";
import Dialog from "app/utils/dialog";
import { share } from "app/utils/url";
import {
    AssigneesPopover,
    CompanyDetailsEditButton,
    CompanyDetailsLogo,
    CompanyDetailsUpdateButton,
    CountryPicker,
    IndustryPicker,
    NewPersonPopover,
    PersonItem,
} from "app/widgets";

export const CompanyDetails = () => {
    const navigate = useNavigate();
    const companyRef = useRef<HTMLDivElement | null>(null);

    const handleClose = () => {
        navigate("/people/");
    };

    useOnClickOutside(companyRef, () => handleClose(), [".company-keep", `.${Classes.PORTAL}`]);

    return (
        <div
            className={classNames(["person-drawer embedded", Classes.DRAWER, Classes.POSITION_RIGHT])}
            ref={companyRef}
        >
            <Company onClose={handleClose} />
        </div>
    );
};

export const CompanyDetailsPanel = () => {
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
            <Company onClose={handleDialogClose} />
        </Drawer>
    );
};

interface CompanyProps {
    onClose: () => void;
}
const Company: FunctionComponent<CompanyProps> = ({ onClose }) => {
    const [isEditing, setIsEditing] = useState(false);
    const params = useParams<"id">();
    const { isLoading, company } = useCompany(params.id);

    const handleToggleEditing = () => {
        setIsEditing(!isEditing);
    };

    useEffect(() => {
        if (!company) return;
        RecentsActions.add({
            title: company.title,
            icon: APPICONS.COMPANY,
            url: `/company/${company.id}`,
        });
    }, [company]);

    const handleSaveCompany = (companyData?: ICompany) => {
        handleToggleEditing();

        if (companyData) {
            PeopleActions.updateCompany(companyData);
        }
    };

    if (!isLoading && company && !isEditing) {
        return <CompanyRead company={company} onClose={onClose} onEdit={handleToggleEditing} />;
    }

    if (!isLoading && company && isEditing) {
        return <CompanyEditing company={company} onClose={onClose} onSave={handleSaveCompany} />;
    }

    return null;
};

interface ICompanyEditingProps {
    company: ICompany;
    onClose: () => void;
    onSave: (company?: ICompany) => void;
}
const CompanyEditing: FunctionComponent<ICompanyEditingProps> = ({ company, onClose, onSave }) => {
    const [updatedCompany, setUpdatedCompany] = useState<ICompany>(company);
    const [visibleSections, setVisibleSections] = useState<string[]>(["general", "mainAddress", "contact"]);
    const { pickFiles } = useUpload();

    const canSave = useMemo(() => {
        return !isEqual(company, updatedCompany);
    }, [company, updatedCompany]);

    const handleCancel = () => {
        onSave();
    };

    const update = (key: keyof ICompany, value: ICompany[keyof ICompany]) => {
        setUpdatedCompany({ ...updatedCompany, [key]: value });
    };

    const handleAddLogo = async () => {
        pickFiles({
            recordId: company.id,
            type: FILES_TYPE.COMPANY_LOGO,
            acceptedFileTypes: "image/*",
            onUploaded: async (uploadedFiles: IAttachment[]) => {
                if (uploadedFiles.length && uploadedFiles[0].previewUrl) {
                    const logo = await PeopleActions.setLogo(company.id, uploadedFiles[0].previewUrl);
                    update("logo", logo);
                    window.toaster.show({
                        message: "Logo image changed successfully!",
                        intent: Intent.SUCCESS,
                    });
                } else {
                    window.toaster.show({
                        message: "Logo image could not been changed!",
                        intent: Intent.WARNING,
                    });
                }
            },
        });
    };

    const handleUpdateCompany = () => {
        onSave(updatedCompany);
    };

    const handleToggleSection = (section: string) => {
        setVisibleSections(xor(visibleSections, [section]));
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
                </div>
                <div>
                    <Tooltip content="Close company detail" placement="bottom-end">
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
                    <CompanyDetailsLogo company={updatedCompany} onClick={handleAddLogo} />
                    <Grid gap={5} align="center">
                        <h3>{updatedCompany.title}</h3>
                        <Tag round minimal>
                            {updatedCompany.industry || "Unknown industry"}
                        </Tag>
                    </Grid>
                </div>
                <Scroller className="person-details__content editing" vertical shadows thin>
                    <Grid gap={0}>
                        <SectionHeader
                            name="general"
                            onClick={handleToggleSection}
                            isOpen={visibleSections.includes("general")}
                        >
                            General
                        </SectionHeader>

                        <Collapse isOpen={visibleSections.includes("general")}>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label="Company name">
                                        <InputGroup
                                            defaultValue={updatedCompany?.title}
                                            placeholder="Title"
                                            size="large"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("title", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row padding={20} gutter={20}>
                                <Col>
                                    <FormGroup label="Industry">
                                        <IndustryPicker
                                            defaultValue={updatedCompany?.industry}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                update("industry", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row padding={20}>
                                <Col>
                                    <FormGroup label="Alternative code">
                                        <InputGroup
                                            defaultValue={updatedCompany?.altCode ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("altCode", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>

                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Notes")} labelFor="notes">
                                        <TextArea
                                            fill
                                            id="notes"
                                            rows={5}
                                            defaultValue={updatedCompany?.notes ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                                update("notes", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Collapse>

                        <SectionHeader
                            name="mainAddress"
                            onClick={handleToggleSection}
                            isOpen={visibleSections.includes("mainAddress")}
                        >
                            Main address
                        </SectionHeader>
                        <Collapse isOpen={visibleSections.includes("mainAddress")}>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label="Address" labelFor="address">
                                        <InputGroup
                                            defaultValue={updatedCompany?.address ?? undefined}
                                            id="address"
                                            placeholder="Address"
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
                                            defaultValue={updatedCompany?.address2 ?? undefined}
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
                                            defaultValue={updatedCompany?.city ?? undefined}
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
                                            defaultValue={updatedCompany?.zip ?? undefined}
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
                                            defaultValue={updatedCompany?.county ?? undefined}
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
                                            defaultValue={updatedCompany?.country ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                update("country", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Collapse>

                        <SectionHeader
                            name="contact"
                            onClick={handleToggleSection}
                            isOpen={visibleSections.includes("contact")}
                        >
                            {translate("Contact")}
                        </SectionHeader>

                        <Collapse isOpen={visibleSections.includes("contact")}>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Email")} labelFor="email">
                                        <InputGroup
                                            defaultValue={updatedCompany?.email ?? undefined}
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
                                    <FormGroup label={translate("Website")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.website ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("website", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Phone")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.phone ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("phone", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Cell")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.cell ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("cell", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Fax")} labelFor="fax">
                                        <InputGroup
                                            defaultValue={updatedCompany?.fax ?? undefined}
                                            id="fax"
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("fax", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Collapse>

                        <SectionHeader
                            name="registeredOfficeAddress"
                            onClick={handleToggleSection}
                            isOpen={visibleSections.includes("registeredOfficeAddress")}
                        >
                            {translate("Registered office address")}
                        </SectionHeader>

                        <Collapse isOpen={visibleSections.includes("registeredOfficeAddress")}>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Address")}>
                                        <InputGroup
                                            defaultValue={
                                                updatedCompany?.registeredOfficeAddress ?? undefined
                                            }
                                            placeholder={translate("Address")}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("registeredOfficeAddress", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Address Alternative")}>
                                        <InputGroup
                                            defaultValue={
                                                updatedCompany?.registeredOfficeAddress2 ?? undefined
                                            }
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("registeredOfficeAddress2", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20} gutter={20}>
                                <Col>
                                    <FormGroup label={translate("City")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.registeredOfficeCity ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("registeredOfficeCity", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                                <Col>
                                    <FormGroup label={translate("Zip Postal Code")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.registeredOfficeZip ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("registeredOfficeZip", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20} gutter={20}>
                                <Col>
                                    <FormGroup label={translate("County State")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.registeredOfficeCounty ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("registeredOfficeCounty", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                                <Col>
                                    <FormGroup label={translate("Country")}>
                                        <CountryPicker
                                            defaultValue={
                                                updatedCompany?.registeredOfficeCountry ?? undefined
                                            }
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                update("registeredOfficeCountry", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Collapse>

                        <SectionHeader
                            name="billingAddress"
                            onClick={handleToggleSection}
                            isOpen={visibleSections.includes("billingAddress")}
                        >
                            {translate("Billing address")}
                        </SectionHeader>

                        <Collapse isOpen={visibleSections.includes("billingAddress")}>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Address")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.billingAddress ?? undefined}
                                            placeholder={translate("Address")}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("billingAddress", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Address Alternative")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.billingAddress2 ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("billingAddress2", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20} gutter={20}>
                                <Col>
                                    <FormGroup label={translate("City")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.billingCity ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("billingCity", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                                <Col>
                                    <FormGroup label={translate("Zip Postal Code")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.billingZip ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("billingZip", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20} gutter={20}>
                                <Col>
                                    <FormGroup label={translate("County State")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.billingCounty ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("billingCounty", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                                <Col>
                                    <FormGroup label={translate("Country")}>
                                        <CountryPicker
                                            defaultValue={updatedCompany?.billingCountry ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                update("billingCountry", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Collapse>

                        <SectionHeader
                            name="shippingAddress"
                            onClick={handleToggleSection}
                            isOpen={visibleSections.includes("shippingAddress")}
                        >
                            {translate("Shipping address")}
                        </SectionHeader>

                        <Collapse isOpen={visibleSections.includes("shippingAddress")}>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Address")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.shippingAddress ?? undefined}
                                            placeholder={translate("Address")}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("shippingAddress", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Address Alternative")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.shippingAddress2 ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("shippingAddress2", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20} gutter={20}>
                                <Col>
                                    <FormGroup label={translate("City")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.shippingCity ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("shippingCity", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                                <Col>
                                    <FormGroup label={translate("Zip Postal Code")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.shippingZip ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("shippingZip", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20} gutter={20}>
                                <Col>
                                    <FormGroup label={translate("County State")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.shippingCounty ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("shippingCounty", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                                <Col>
                                    <FormGroup label={translate("Country")}>
                                        <CountryPicker
                                            defaultValue={updatedCompany?.shippingCountry ?? undefined}
                                            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                                                update("shippingCountry", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Collapse>

                        <SectionHeader
                            name="payment"
                            onClick={handleToggleSection}
                            isOpen={visibleSections.includes("payment")}
                        >
                            {translate("Payment & Banking")}
                        </SectionHeader>

                        <Collapse isOpen={visibleSections.includes("payment")}>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("VAT")}>
                                        <InputGroup
                                            defaultValue={updatedCompany?.vat ?? undefined}
                                            placeholder={translate("VAT")}
                                            large
                                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                                                update("vat", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                            <Row padding={20}>
                                <Col>
                                    <FormGroup label={translate("Other payment details")}>
                                        <TextArea
                                            fill
                                            rows={5}
                                            defaultValue={updatedCompany?.payment ?? undefined}
                                            placeholder={translate("IBAN, SWIFT")}
                                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                                                update("payment", e.currentTarget.value)
                                            }
                                        />
                                    </FormGroup>
                                </Col>
                            </Row>
                        </Collapse>
                    </Grid>
                </Scroller>
                <div className="person-details__footer">
                    <CompanyDetailsUpdateButton disabled={!canSave} onClick={handleUpdateCompany} />
                </div>
            </div>
        </>
    );
};

interface ICompanyProps {
    company: ICompany;
    onClose: () => void;
    onEdit: () => void;
}
const CompanyRead: FunctionComponent<ICompanyProps> = ({ company, onClose, onEdit }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const staff = useCompanyStaff(company.id);

    const backgroundLocation =
        location.state && location.state.backgroundLocation
            ? location.state.backgroundLocation
            : {
                  pathname: `/people/company/${company.id}`,
                  search: "",
                  hash: "",
                  state: null,
              };

    const nonStaffIds = useMemo(() => {
        return PeopleActions.getNonCompanyPeople(company.id).map(p => p.id);
    }, [company.id]);

    const openPerson = (person: IPerson) => {
        navigate(`/person/${person.id}`, {
            state: { backgroundLocation },
        });
    };

    const handleDeleteCompany = () => {
        PeopleActions.removeAlertCompany(company.id);
        onClose();
    };

    const handleExport = (format: "json" | "pdf" | "excel") => {
        PeopleActions.exportCompany(format, company.id);
    };

    const handleClearStaff = async () => {
        const response = await Dialog.confirm(
            translate("Remove all members?"),
            translate("Are you sure you want to remove all members from this company?")
        );

        if (response) {
            for (const contact of staff) {
                PeopleActions.toggleCompany(contact.id, company.id);
            }
        }
    };

    return (
        <>
            <div className={Classes.DRAWER_HEADER}>
                <div>
                    <Popover
                        content={
                            <Menu>
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
                                    onClick={() => share(`c/${company.id}`)}
                                />
                                <MenuItem
                                    text={`${translate("Bookmark")}...`}
                                    icon={<Icon icon="bookmark" />}
                                    onClick={toggleNewBookmark}
                                />
                                <MenuDivider />
                                <MenuItem
                                    text={translate("Delete company...")}
                                    intent={Intent.DANGER}
                                    icon={<Icon icon="trash" />}
                                    onClick={handleDeleteCompany}
                                />
                            </Menu>
                        }
                        placement="bottom-end"
                    >
                        <Button size="small" variant="minimal" icon={<Icon icon="dots-vertical" />} />
                    </Popover>

                    <FavoriteCompanyButton companyId={company.id} />

                    <CompanyDetailsEditButton onClick={onEdit} />
                </div>
                <div>
                    <Tooltip content={translate("Close company detail")} placement="bottom-end">
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
                    {company.logo ? (
                        <div className="person-details__avatar" style={{ padding: "15px 0" }}>
                            <img
                                src={company.logo}
                                style={{ maxHeight: 80, maxWidth: 200, mixBlendMode: "multiply" }}
                            />
                        </div>
                    ) : null}

                    <Grid gap={5} align="center">
                        <h3>{company.title}</h3>

                        <Tag round minimal>
                            {company.industry || "Unknown industry"}
                        </Tag>
                    </Grid>
                </div>
                <Scroller className="person-details__content" vertical thin shadows>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Address")}>
                            {company.address || "-"}
                            <br />
                            {company.city} {company.zip} {company.county && <>({company.county})</>}
                            {company.country && (
                                <>
                                    <br />
                                    {company.country}
                                </>
                            )}
                            {company.address2 && (
                                <>
                                    <br />
                                    <small className={Classes.TEXT_MUTED}>{company.address2}</small>
                                </>
                            )}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title="Alt. code" centered>
                            {company.altCode || "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Notes")}>{company.notes}</TaskDetailsSection>
                    </div>

                    <h4>{translate("Contact")}</h4>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Email")} centered>
                            {company.email ? <a href={`mailto:${company.email}`}>{company.email}</a> : "-"}
                        </TaskDetailsSection>
                    </div>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Phone")} centered>
                            {company.phone || "-"}
                        </TaskDetailsSection>
                    </div>
                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Cell")} centered>
                            {company.cell || "-"}
                        </TaskDetailsSection>
                    </div>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Fax")} centered>
                            {company.fax || "-"}
                        </TaskDetailsSection>
                    </div>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Website")} centered>
                            {company.email ? (
                                <a href={company.website ?? undefined} target="_blank" rel="noreferrer">
                                    {company.website}
                                </a>
                            ) : (
                                "-"
                            )}
                        </TaskDetailsSection>
                    </div>

                    <h4>{translate("Other addresses")}</h4>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Registered office")}>
                            {company.registeredOfficeAddress || "-"}
                            <br />
                            {company.registeredOfficeCity} {company.registeredOfficeZip}{" "}
                            {company.registeredOfficeCounty && <>({company.registeredOfficeCounty})</>}
                            {company.registeredOfficeCountry && (
                                <>
                                    <br />
                                    {company.registeredOfficeCountry}
                                </>
                            )}
                            {company.registeredOfficeAddress2 && (
                                <>
                                    <br />
                                    <small className={Classes.TEXT_MUTED}>
                                        {company.registeredOfficeAddress2}
                                    </small>
                                </>
                            )}
                        </TaskDetailsSection>
                    </div>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Billing")}>
                            {company.billingAddress || "-"}
                            <br />
                            {company.billingCity} {company.billingZip}{" "}
                            {company.billingCounty && <>({company.billingCounty})</>}
                            {company.billingCountry && (
                                <>
                                    <br />
                                    {company.billingCountry}
                                </>
                            )}
                            {company.billingAddress2 && (
                                <>
                                    <br />
                                    <small className={Classes.TEXT_MUTED}>{company.billingAddress2}</small>
                                </>
                            )}
                        </TaskDetailsSection>
                    </div>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Shipping")}>
                            {company.shippingAddress || "-"}
                            <br />
                            {company.shippingCity} {company.shippingZip}{" "}
                            {company.shippingCounty && <>({company.shippingCounty})</>}
                            {company.shippingCountry && (
                                <>
                                    <br />
                                    {company.shippingCountry}
                                </>
                            )}
                            {company.shippingAddress2 && (
                                <>
                                    <br />
                                    <small className={Classes.TEXT_MUTED}>{company.shippingAddress2}</small>
                                </>
                            )}
                        </TaskDetailsSection>
                    </div>

                    <h4>{translate("Payment & Banking")}</h4>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("VAT")} centered>
                            {company.vat || "-"}
                        </TaskDetailsSection>
                    </div>

                    <div className="person-details__section">
                        <TaskDetailsSection title={translate("Details")}>
                            {company.payment}
                        </TaskDetailsSection>
                    </div>

                    <h4>
                        <Row>
                            <Col gap={5} align="center">
                                {translate("Staff")}
                                <Tag minimal round>
                                    {staff.length}
                                </Tag>
                            </Col>
                            <Col justify="right">
                                <AssigneesPopover
                                    value={staff.map(p => p.id)}
                                    onToggle={(personId: string) =>
                                        PeopleActions.toggleCompany(personId, company.id)
                                    }
                                    onClear={handleClearStaff}
                                    disallowed={nonStaffIds}
                                >
                                    <Tooltip content={translate("Add staff member")} placement="top-end">
                                        <Button
                                            variant="minimal"
                                            size="small"
                                            icon={<Icon icon="user-add" />}
                                        />
                                    </Tooltip>
                                </AssigneesPopover>
                            </Col>
                        </Row>
                    </h4>

                    {staff && staff.length > 0 ? (
                        <Menu>
                            {staff.map((person: IPerson) => {
                                return (
                                    <PersonItem
                                        key={person.id}
                                        person={person}
                                        dismissable
                                        onClick={() => openPerson(person)}
                                    />
                                );
                            })}
                        </Menu>
                    ) : (
                        <Grid align="center" gap={0} style={{ marginBottom: 50 }}>
                            <BlankSlate small title={translate("No staff members")} icon="user" padding={0} />

                            <NewPersonPopover company={company.id}>
                                <RoundButton title={translate("Add person")} />
                            </NewPersonPopover>
                        </Grid>
                    )}
                </Scroller>
            </div>
        </>
    );
};

interface IFavoriteCompanyButtonProps {
    companyId: string;
}
const FavoriteCompanyButton: FunctionComponent<IFavoriteCompanyButtonProps> = ({ companyId }) => {
    const favorites = PeopleStore.use(state => state.favoriteCompanies, shallowEqual);

    const handleToggleFavorite = () => {
        PeopleActions.toggleFavoriteCompany(companyId);
    };

    useElementHotkey("shift+f", "cd-favorite");

    const isFavorite = useMemo(() => {
        return favorites.includes(companyId);
    }, [favorites]);

    return (
        <Tooltip
            content={
                isFavorite
                    ? translate("Remove company from favorites")
                    : translate("Add company to favorites")
            }
            placement="bottom"
        >
            <Button
                small
                minimal
                id="cd-favorite"
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

interface SectionHeaderProps {
    children: React.ReactNode;
    name: string;
    isOpen: boolean;
    onClick: (section: string) => void;
}

const SectionHeader: FunctionComponent<SectionHeaderProps> = ({ children, name, isOpen, onClick }) => {
    return (
        <h4 className="interactive" onClick={() => onClick(name)}>
            {children} <Icon icon={isOpen ? "chevron-down" : "chevron-right"} />
        </h4>
    );
};
