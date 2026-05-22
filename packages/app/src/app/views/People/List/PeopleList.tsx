// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, Classes, Colors, Intent, Tag, Tooltip } from "@blueprintjs/core";
import { translate } from "@stacks/translations";
import { PEOPLE_TITLE_LABELS } from "app/locale/dynamic-messages";
import { format, isSameDay } from "date-fns";
import React, { FunctionComponent, useMemo } from "react";
import { useNavigate } from "react-router";
import { useLocation } from "react-router-dom";

import { IPerson, ITableColumns, PEOPLE_GROUPING_TYPE, PERSONTITLE, TAGSECTION } from "@stacks/types";
import {
    Avatar,
    ClickStop,
    Col,
    Icon,
    Row,
    TablePersistent,
    TablePersistentCellProps,
    TablePersistentGroupData,
    TablePersistentGroupProps,
} from "app/components/common";
import { getTag, useFilteredPeople, usePeopleStatuses } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { PeopleActions } from "app/store/actions";
import { PeopleStore, defaultColumnsList } from "app/store/people";
import { PreferencesStore } from "app/store/preferences";
import { RecordsStore } from "app/store/records";
import { setClipboard } from "app/utils/browser";
import { formatDate, formatDateDiff } from "app/utils/date";
import Toast from "app/utils/toast";
import { AppViewContent, CompanyTableCell, PersonRole, Statuses, Tags, TagsWrapper } from "app/widgets";

const tableColumns: ITableColumns<IPerson> = {
    name: {
        title: translate("Name"),
        width: 300,
        minWidth: 100,
        maxWidth: 500,
        isSortable: true,
        sortAccessor: row => row.firstName || "",
        unhideable: true,
        resizable: true,
        clickable: true,
    },
    role: {
        title: translate("Role"),
        width: 100,
        minWidth: 50,
        maxWidth: 250,
        isSortable: false,
        resizable: true,
    },
    tags: {
        title: translate("Tags"),
        width: 150,
        minWidth: 150,
        isSortable: false,
        resizable: true,
    },
    status: {
        title: translate("Status"),
        width: 150,
        minWidth: 150,
        maxWidth: 250,
        isSortable: false,
        resizable: true,
    },
    personalId: {
        title: translate("ID"),
        width: 120,
        minWidth: 100,
        resizable: true,
        isSortable: true,
    },
    gender: {
        title: translate("Gender"),
        width: 120,
        minWidth: 120,
        maxWidth: 200,
        resizable: true,
        isSortable: true,
    },
    nickname: {
        title: translate("Nickname"),
        width: 150,
        minWidth: 100,
        resizable: true,
        isSortable: true,
    },
    birthday: {
        title: translate("Birthday"),
        width: 150,
        minWidth: 100,
        resizable: true,
        isSortable: true,
    },
    age: {
        title: translate("Age"),
        width: 100,
        minWidth: 100,
        maxWidth: 150,
        isSortable: true,
        sortAccessor: row =>
            row.birthday ? new Date().getFullYear() - row.birthday.getFullYear() : null,
        resizable: true,
    },
    company: {
        title: translate("Company"),
        width: 150,
        minWidth: 100,
        isSortable: true,
        resizable: true,
    },
    jobTitle: {
        title: translate("Job title"),
        width: 150,
        minWidth: 100,
        isSortable: false,
        resizable: true,
    },
    officePhone: { title: translate("Office phone"), width: 200, minWidth: 100, isSortable: false },
    cellPhone: { title: translate("Cell phone"), width: 200, minWidth: 100, isSortable: false },
    homePhone: { title: translate("Home phone"), width: 200, minWidth: 100, isSortable: false },
    fax: { title: translate("Fax"), width: 200, minWidth: 100, isSortable: false },
    address: { title: translate("Address"), width: 200, minWidth: 100, isSortable: false },
    county: {
        title: translate("County State"),
        width: 200,
        minWidth: 100,
        isSortable: true,
    },
    zip: {
        title: translate("Zip Postal Code"),
        width: 130,
        minWidth: 100,
        isSortable: true,
    },
    city: {
        title: translate("City"),
        width: 200,
        minWidth: 100,
        isSortable: true,
    },
    country: {
        title: translate("Country"),
        width: 150,
        minWidth: 100,
        isSortable: true,
        resizable: true,
    },
    address2: { title: translate("Address Alternative"), width: 200, minWidth: 100, isSortable: false },
    socialTwitter: {
        title: translate("Twitter"),
        width: 200,
        minWidth: 100,
        isSortable: false,
        resizable: true,
    },
    socialLinkedin: {
        title: translate("LinkedIn"),
        width: 200,
        minWidth: 100,
        isSortable: false,
        resizable: true,
    },
    socialFacebook: {
        title: translate("Facebook"),
        width: 200,
        minWidth: 100,
        isSortable: false,
        resizable: true,
    },
    socialInstagram: {
        title: translate("Instagram"),
        width: 200,
        minWidth: 100,
        isSortable: false,
        resizable: true,
    },
    website: { title: translate("Website"), width: 150, minWidth: 100, isSortable: false, resizable: true },
    socialOther: {
        title: translate("Other URL"),
        width: 150,
        minWidth: 100,
        isSortable: false,
        resizable: true,
    },
    notes: {
        title: translate("Notes"),
        width: 200,
        minWidth: 100,
        isSortable: false,
        resizable: true,
    },
    created: {
        title: translate("Created on"),
        width: 160,
        minWidth: 100,
        isSortable: true,
        resizable: true,
    },
    updated: {
        title: translate("Updated on"),
        width: 160,
        minWidth: 100,
        isSortable: true,
        resizable: true,
    },
};

export const PeopleList = () => {
    const { isLoading, companies, grouping, selected } = PeopleStore.use(
        state => ({
            isLoading: state.isLoading,
            companies: state.companies,
            grouping: state.grouping,
            selected: state.selectedPeople,
        }),
        shallowEqual
    );
    const filteredPeople = useFilteredPeople();

    const data = useMemo(() => {
        if (grouping === PEOPLE_GROUPING_TYPE.COMPANY) {
            const group: TablePersistentGroupData<IPerson>[] = [];

            for (const company of [...companies].sort((a, b) => a.title.localeCompare(b.title))) {
                group.push({
                    groupId: company.id,
                    title: company.title,
                    data: filteredPeople.filter(person => person.company === company.id),
                });
            }

            const peopleWithoutCompany = filteredPeople.filter(
                person => person.company == null || person.company === ""
            );
            if (peopleWithoutCompany.length) {
                group.push({
                    groupId: "none",
                    title: translate("No company"),
                    data: peopleWithoutCompany,
                });
            }

            return group;
        }

        return filteredPeople;
    }, [filteredPeople, grouping, companies]);

    const handleSelect = (row: IPerson) => {
        PeopleActions.togglePersonSelection(row.id);
    };

    if (isLoading) return null;

    return (
        <AppViewContent padded className="person-keep people-list">
            <TablePersistent<IPerson>
                id="people"
                sticky
                columns={tableColumns}
                defaultVisibleColumns={defaultColumnsList}
                data={data}
                components={{
                    cell: TableCell,
                    groupAppend:
                        grouping === PEOPLE_GROUPING_TYPE.COMPANY ? TableGroupCompany : TableGroupProject,
                }}
                onSelect={handleSelect}
                selected={selected}
            />
        </AppViewContent>
    );
};

const TableGroupCompany: FunctionComponent<TablePersistentGroupProps> = ({ groupId, count }) => {
    const location = useLocation();
    const navigate = useNavigate();

    const handleOpenCompany = () => {
        navigate(`/company/${groupId}`, {
            state: { backgroundLocation: location },
        });
    };

    return (
        <>
            <Tag minimal round>
                {count}
            </Tag>
            {groupId !== "none" ? (
                <Button
                    variant="minimal"
                    size="small"
                    icon={<Icon icon="link-external-01" />}
                    onClick={handleOpenCompany}
                />
            ) : null}
        </>
    );
};

const TableGroupProject: FunctionComponent<TablePersistentGroupProps> = ({ groupId, count }) => {
    const navigate = useNavigate();

    const handleOpenProject = () => {
        navigate(`/project/${groupId}`);
    };

    return (
        <>
            <Tag minimal round>
                {count}
            </Tag>
            {groupId !== "none" ? (
                <Button
                    variant="minimal"
                    size="small"
                    icon={<Icon icon="link-external-01" />}
                    onClick={handleOpenProject}
                />
            ) : null}
        </>
    );
};

const TableCell: FunctionComponent<TablePersistentCellProps<IPerson>> = ({ row, column }) => {
    const statuses = usePeopleStatuses();
    const location = useLocation();
    const navigate = useNavigate();

    const handleCopyPerson = async (event: React.MouseEvent, person: IPerson) => {
        event.stopPropagation();
        event.preventDefault();

        const personInfo = [`${person.firstName} ${person.lastName}`];

        // basic
        const basic = [];
        if (person.birthday != null) {
            basic.push(`${translate("Birthday")}: ${format(new Date(person.birthday), "PP")}`);
        }
        if (person.nickname != null && person.nickname.length > 0) {
            basic.push(`${translate("Nickname")}: ${person.nickname}`);
        }
        basic.push(`${translate("Gender")}: ${person.gender}`);
        if (basic.length) {
            personInfo.push(`\n${basic.join("\n")}`);
        }

        // tags
        if (person.tags != null && person.tags.length > 0) {
            const personTags = [];
            const tags = RecordsStore.get().tags;
            for (const tag of tags) {
                if (person.tags.includes(tag.id)) {
                    personTags.push(tag.title);
                }
            }
            personInfo.push(`${translate("Tags")}: ${personTags.join(", ")}`);
        }

        // status
        if (person.status != null) {
            const status = getTag(person.status);
            if (status) {
                personInfo.push(`${translate("Status")}: ${status.title}`);
            }
        }

        // contact
        const contact = [];
        if (person.email != null && person.email.length > 0) {
            contact.push(`${translate("Email")}: ${person.email}`);
        }
        if (person.homePhone != null && person.homePhone.length > 0) {
            contact.push(`${translate("Home phone")}: ${person.homePhone}`);
        }
        if (person.cellPhone != null && person.cellPhone.length > 0) {
            contact.push(`${translate("Cell phone")}: ${person.cellPhone}`);
        }
        if (person.officePhone != null && person.officePhone.length > 0) {
            contact.push(`${translate("Office phone")}: ${person.officePhone}`);
        }

        // address
        const addressFields = [
            {
                field: "address",
                format: "$,",
            },
            {
                field: "city",
                format: "$",
            },
            {
                field: "zip",
                format: "$",
            },
            {
                field: "county",
                format: "$",
            },
            {
                field: "country",
                format: "($)",
            },
        ];
        const address = addressFields
            .map(
                ({ field, format }) =>
                    person[field as keyof IPerson] &&
                    format.replace("$", person[field as keyof IPerson] as string)
            )
            .filter(Boolean);
        if (address.length) contact.push(`${translate("Address")}: ${address}`);

        if (contact.length) {
            personInfo.push(`\nContact\n${contact.join("\n")}`);
        }

        // company
        const company = [];
        if (person.company != null) {
            company.push(`${translate("Name")}: ${PeopleActions.getCompany(person.company)?.title || "Unknown"}`);
        }
        if (person.jobTitle != null && person.jobTitle.length > 0) {
            company.push(`${translate("Job title")}: ${person.jobTitle}`);
        }
        if (company.length) {
            personInfo.push(`\nCompany\n${company.join("\n")}`);
        }

        // social
        const social = [];
        if (person.website != null && person.website.length > 0) {
            social.push(`${translate("Website")}: ${person.website}`);
        }
        if (person.socialLinkedin != null && person.socialLinkedin.length > 0) {
            social.push(`${translate("LinkedIn")}: ${person.socialLinkedin}`);
        }
        if (person.socialTwitter != null && person.socialTwitter.length > 0) {
            social.push(`${translate("Twitter")}: ${person.socialTwitter}`);
        }
        if (person.socialInstagram != null && person.socialInstagram.length > 0) {
            social.push(`${translate("Instagram")}: ${person.socialInstagram}`);
        }
        if (person.socialFacebook != null && person.socialFacebook.length > 0) {
            social.push(`${translate("Facebook")}: ${person.socialFacebook}`);
        }
        if (person.socialOther != null && person.socialOther.length > 0) {
            social.push(`${translate("Other")}: ${person.socialOther}`);
        }
        if (social.length) {
            personInfo.push(`\nSocial\n${social.join("\n")}`);
        }

        if (person.notes != null && person.notes.length > 0) {
            personInfo.push(`\nNotes: ${person.notes}`);
        }

        await setClipboard(personInfo.join("\n"));
        Toast.success(translate("Person info copied to clipboard"), "clipboard");
    };

    const openPerson = (person: IPerson) => {
        if (PreferencesStore.get().peopleEmbeddedPerson) {
            navigate(`/people/person/${person.id}`);
        } else {
            navigate(`/person/${person.id}`, {
                state: { backgroundLocation: location },
            });
        }
    };

    if (column === "name") {
        let title = "";
        if (row.title && row.title !== PERSONTITLE.NONE) {
            if (Object.values(PERSONTITLE).includes(row.title)) {
                title = `${PEOPLE_TITLE_LABELS[row.title]} `;
            } else {
                title = `${row.title} `;
            }
        }
        return (
            <>
                <Row
                    gutter={8}
                    cursor="pointer"
                    style={{ opacity: row.disabled ? 0.5 : 1 }}
                    onClick={() => openPerson(row)}
                >
                    <Col unshrinkable width="auto">
                        <Avatar person={row} />
                    </Col>
                    <Col className="person-name" width="auto" vertical>
                        <div>
                            <strong>{`${title}${row.firstName} ${row.lastName}`}</strong>
                        </div>
                        <div className={Classes.TEXT_MUTED}>{row.email}</div>
                    </Col>
                </Row>

                {row.birthday && isSameDay(new Date(row.birthday), new Date()) && (
                    <Tooltip content={`Today is ${row.firstName}'s birthday! 🎉`} placement="top">
                        <Button
                            size="small"
                            variant="minimal"
                            outlined
                            intent={Intent.SUCCESS}
                            icon={<Icon icon="award-01" />}
                        />
                    </Tooltip>
                )}

                {row.userId && (
                    <Tooltip
                        content="System user - this user can login into the current workspace"
                        placement="top"
                    >
                        <Icon icon="key-01" />
                    </Tooltip>
                )}

                {row.admin && (
                    <Tooltip
                        content="Admin user - this user has full access to the current workspace"
                        placement="top"
                    >
                        <Icon icon="star-filled" color={Colors.GOLD3} />
                    </Tooltip>
                )}

                {row.disabled && (
                    <Tooltip
                        content="Disabled user - this user cannot login into the current workspace"
                        placement="top"
                    >
                        <Icon icon="lock-01" color={Colors.RED3} />
                    </Tooltip>
                )}

                {row.token && row.token.length && (
                    <Tooltip content="User account not yet activated" placement="top">
                        <Icon icon="key-01" color={Colors.BLUE3} />
                    </Tooltip>
                )}

                <Tooltip
                    content="Click to copy person info"
                    placement="top"
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    renderTarget={({ isOpen, ref, ...props }) => (
                        <ClickStop>
                            <Button
                                variant="minimal"
                                size="small"
                                icon={<Icon icon="copy" />}
                                ref={ref}
                                {...props}
                                className="copy-person"
                                onClick={(event: React.MouseEvent) => handleCopyPerson(event, row)}
                            />
                        </ClickStop>
                    )}
                />
            </>
        );
    } else if (column === "role" && row.role != null) {
        return <PersonRole roleId={row.role} />;
    } else if (column === "tags") {
        return (
            <TagsWrapper nowrap>
                <Tags value={row.tags ?? []} section={TAGSECTION.PEOPLE} />
            </TagsWrapper>
        );
    } else if (column === "status") {
        const personStatus = statuses.find(status => status.id === row.status);
        return (
            <TagsWrapper nowrap>
                <Statuses statuses={personStatus ? [personStatus] : []} />
            </TagsWrapper>
        );
    } else if (column === "gender") {
        return (
            <>
                {
                    row.gender === "male" ? translate("Male") : row.gender === "female" ? translate("Female") : translate("Other")
                }
            </>
        );
    } else if (column === "birthday" && row.birthday != null) {
        return <>{formatDate(row.birthday, "PP")}</>;
    } else if (column === "age" && row.birthday != null) {
        return <>{formatDateDiff(row.birthday)}</>;
    } else if (column === "company" && row.company != null) {
        return <CompanyTableCell companyId={row.company} />;
    } else if (
        [
            "socialTwitter",
            "socialFacebook",
            "socialLinkedin",
            "socialInstagram",
            "website",
            "socialOther",
        ].includes(column)
    ) {
        return (
            <a href={row[column as keyof IPerson] as string} target="_blank" rel="noopener noreferrer">
                {row[column as keyof IPerson] as string}
            </a>
        );
    } else if (column === "created" && row.created != null) {
        return <>{formatDate(row.created)}</>;
    } else if (column === "updated" && row.updated != null) {
        return <>{formatDate(row.updated)}</>;
    }

    return (
        <>
            {(row[column as keyof IPerson] as React.ReactNode) ?? (
                <span className={Classes.TEXT_DISABLED}>-</span>
            )}
        </>
    );
};
