// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import {
    Alignment,
    Button,
    ButtonGroup,
    Colors,
    FormGroup,
    InputGroup,
    Intent,
    Keys,
    Menu,
    MenuDivider,
    MenuItem,
    Popover,
    Tag,
} from "@blueprintjs/core";
import { xor } from "lodash";
import React, { createRef, useEffect, useMemo } from "react";
import { StatusesMenu, TagsMenu } from "app/components/project";
import { usePeopleHasFilters, usePeopleStatuses, usePeopleTags } from "app/hooks";
import { shallowEqual } from "app/hooks/store";
import { ICompany, ITag, PEOPLE_GENDER, TAGSECTION } from "@stacks/types";
import { PeopleActions } from "app/store/actions";
import { PeopleStore } from "app/store/people";
import { FiltersSidebar, StatusChip, Tags, TagsWrapper } from "app/widgets/common";
import { Icon } from "app/components/common";

export const PeopleFilter = () => {
    const { filtersVisible, viewType } = PeopleStore.use(
        state => ({
            filtersVisible: state.filtersVisible,
            viewType: state.viewType,
        }),
        shallowEqual
    );
    const hasFilters = usePeopleHasFilters();

    if (!filtersVisible || viewType !== "contacts") return null;

    return (
        <FiltersSidebar
            header={<strong>Filter people</strong>}
            footer={
                hasFilters ? (
                    <Button
                        variant="minimal"
                        size="small"
                        intent={Intent.WARNING}
                        onClick={PeopleActions.resetFilters}
                    >
                        {translate("Clear all")}
                    </Button>
                ) : null
            }
        >
            <QueryFilter />
            <TagsFilter />
            <StatusesFilter />
            <CompanyFilter />
            <GenderFilter />
        </FiltersSidebar>
    );
};

const QueryFilter = () => {
    const { viewType, query } = PeopleStore.use(
        state => ({
            viewType: state.viewType,
            query: state.query,
        }),
        shallowEqual
    );
    const queryInputRef = createRef<HTMLInputElement>();

    useEffect(() => {
        if (queryInputRef.current) {
            queryInputRef.current.focus();
        }
    }, []);

    const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.keyCode === Keys.ESCAPE || ((event.metaKey || event.ctrlKey) && event.key === "f")) {
            if (query.length) {
                PeopleActions.setQuery("");
            } else {
                PeopleActions.toggleFilters();
            }
        }
    };

    const handleChangeQuery = (event: React.ChangeEvent<HTMLInputElement>) => {
        PeopleActions.setQuery(event.currentTarget.value);
    };

    return (
        <FormGroup label="Search task" helperText="Search in task title or description">
            <InputGroup
                defaultValue={query}
                placeholder={viewType === "contacts" ? translate("Search person") : "Search company"}
                leftIcon={<Icon icon="search" />}
                round
                type="search"
                onChange={handleChangeQuery}
                inputRef={queryInputRef}
                onKeyDown={handleKeyDown}
            />
        </FormGroup>
    );
};

const TagsFilter = () => {
    const tags = PeopleStore.use(state => state.filters.tags, shallowEqual);
    const systemTags = usePeopleTags();

    const label = useMemo(() => {
        if (tags.length === 0) return translate("All tags");
        if (tags.length === 1) return systemTags.find((t: ITag) => t.id === tags.at(0))?.title;
        return "Multiple tags";
    }, [tags, systemTags]);

    const icon = useMemo(() => {
        if (tags.length === 0) return "tags";
        if (tags.length === 1) return "tag-filled";
        return "tags-filled";
    }, [tags]);

    const color = useMemo(() => {
        if (tags.length === 0) return undefined;
        if (tags.length === 1) return systemTags.find((t: ITag) => t.id === tags.at(0))?.color;
        return Colors.BLUE3;
    }, [tags, systemTags]);

    const handleToggleTag = (tag?: ITag) => {
        if (tag) {
            PeopleActions.setFilter("tags", xor(tags, [tag.id]));
        }
    };

    const handleRemoveTag = (tagId: string) => {
        PeopleActions.setFilter("tags", xor(tags, [tagId]));
    };

    return (
        <FormGroup label="Tags">
            <Popover
                content={
                    <TagsMenu
                        value={tags}
                        onChange={handleToggleTag}
                        section={TAGSECTION.PEOPLE}
                        shouldDismiss={false}
                    />
                }
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon={icon} color={color} />}
                    rightIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.LEFT}
                    intent={tags.length > 0 ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>

            {tags.length > 0 && (
                <div style={{ marginTop: 10 }}>
                    <TagsWrapper>
                        <Tags value={tags} section={TAGSECTION.PEOPLE} onRemove={handleRemoveTag} />
                    </TagsWrapper>
                </div>
            )}
        </FormGroup>
    );
};

const StatusesFilter = () => {
    const status = PeopleStore.use(state => state.filters.status, shallowEqual);
    const statuses = usePeopleStatuses();

    const selectedStatus = useMemo(() => {
        if (status == null) return undefined;
        return statuses.find(s => s.id === status);
    }, [status, statuses]);

    const color = useMemo(() => {
        if (!selectedStatus) return Colors.GRAY3;
        return selectedStatus.color;
    }, [selectedStatus]);

    const label = useMemo(() => {
        if (!selectedStatus) return translate("All statuses");
        return selectedStatus.title;
    }, [selectedStatus]);

    const handleRemoveStatus = () => {
        PeopleActions.setFilter("status", undefined);
    };

    return (
        <FormGroup label="Status">
            <Popover
                content={
                    <StatusesMenu
                        value={selectedStatus ? [selectedStatus] : []}
                        section={TAGSECTION.PEOPLE}
                        onChange={(s?: ITag) => PeopleActions.setFilter("status", s ? s.id : undefined)}
                    />
                }
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon="circle-filled" color={color} />}
                    rightIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.LEFT}
                    intent={status != null ? Intent.PRIMARY : Intent.NONE}
                >
                    {label}
                </Button>
            </Popover>

            {selectedStatus != null && (
                <div style={{ marginTop: 10 }}>
                    <StatusChip tag={selectedStatus} fill onRemove={handleRemoveStatus} />
                </div>
            )}
        </FormGroup>
    );
};

const CompanyFilter = () => {
    const { company, companies } = PeopleStore.use(
        state => ({ company: state.filters.company, companies: state.companies }),
        shallowEqual
    );

    const selectedCompany = useMemo(() => {
        return companies.find(c => c.id === company);
    }, [company]);

    const icon = useMemo(() => {
        return company != null ? "building-05" : "building-07";
    }, [company]);

    return (
        <FormGroup label="Status">
            <Popover
                content={
                    <Menu>
                        <MenuItem
                            text={translate("All companies")}
                            icon={<Icon icon="building-07" />}
                            labelElement={company == null ? <Icon icon="check" /> : undefined}
                            onClick={() => PeopleActions.setFilter("company", undefined)}
                        />
                        <MenuDivider />
                        {companies.map((companyItem: ICompany) => {
                            return (
                                <MenuItem
                                    key={companyItem.id}
                                    text={companyItem.title}
                                    icon={<Icon icon="building-05" />}
                                    labelElement={
                                        companyItem.id === company ? <Icon icon="check" /> : undefined
                                    }
                                    onClick={() => PeopleActions.setFilter("company", companyItem.id)}
                                />
                            );
                        })}
                    </Menu>
                }
                minimal
                matchTargetWidth
                placement="bottom"
            >
                <Button
                    fill
                    icon={<Icon icon={icon} />}
                    rightIcon={<Icon icon="chevron-down" />}
                    alignText={Alignment.LEFT}
                    intent={company != null ? Intent.PRIMARY : Intent.NONE}
                >
                    {selectedCompany ? selectedCompany.title : translate("All companies")}
                </Button>
            </Popover>

            {selectedCompany != null && (
                <div style={{ marginTop: 10 }}>
                    <Tag
                        minimal
                        round
                        icon={<Icon icon="building-05" size={12} />}
                        fill
                        onRemove={() => PeopleActions.setFilter("company", undefined)}
                    >
                        {selectedCompany.title}
                    </Tag>
                </div>
            )}
        </FormGroup>
    );
};

const GenderFilter = () => {
    const genders = PeopleStore.use(state => state.filters.genders, shallowEqual);
    return (
        <FormGroup label="Gender">
            <ButtonGroup fill>
                <Button
                    intent={genders.includes(PEOPLE_GENDER.MALE) ? Intent.PRIMARY : Intent.NONE}
                    onClick={() => PeopleActions.setFilter("genders", xor(genders, [PEOPLE_GENDER.MALE]))}
                >
                    {translate("Male")}
                </Button>
                <Button
                    intent={genders.includes(PEOPLE_GENDER.FEMALE) ? Intent.PRIMARY : Intent.NONE}
                    onClick={() => PeopleActions.setFilter("genders", xor(genders, [PEOPLE_GENDER.FEMALE]))}
                >
                    {translate("Female")}
                </Button>
                <Button
                    intent={genders.includes(PEOPLE_GENDER.OTHER) ? Intent.PRIMARY : Intent.NONE}
                    onClick={() => PeopleActions.setFilter("genders", xor(genders, [PEOPLE_GENDER.OTHER]))}
                >
                    {translate("Other")}
                </Button>
            </ButtonGroup>
        </FormGroup>
    );
};
