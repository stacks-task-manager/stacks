// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { createTableCellFromRegistry, TablePersistent, TablePersistentCellProps } from "app/components/common";
import { useFilteredCompanies } from "app/hooks";
import { ICompany, ITableColumns } from "@stacks/types";
import { PreferencesStore } from "app/store/preferences";
import { AppViewContent, CompanyStaffPopover } from "app/widgets";
import { Classes } from "@blueprintjs/core";
import { formatDate } from "app/utils/date";

export const tableColumns: ITableColumns<ICompany> = {
    title: {
        title: "Company name",
        width: 300,
        minWidth: 100,
        maxWidth: 500,
        isSortable: true,
        unhideable: true,
        resizable: true,
        clickable: true,
    },
    staff: { title: translate("Staff"), width: 100, minWidth: 100, isSortable: false },
    industry: { title: translate("Industry"), width: 160, minWidth: 100, isSortable: false, resizable: true },
    vat: { title: translate("VAT"), width: 160, minWidth: 100, isSortable: false, resizable: true },
    email: { title: translate("Email"), width: 160, minWidth: 100, isSortable: false, resizable: true },
    phone: { title: translate("Phone"), width: 200, minWidth: 100, isSortable: false, resizable: true },
    cell: { title: translate("Cell phone"), width: 200, minWidth: 100, isSortable: false, resizable: true },
    address: { title: translate("Address"), width: 200, minWidth: 100, isSortable: false, resizable: true },
    county: {
        title: translate("County State"),
        width: 200,
        minWidth: 100,
        isSortable: true,
        resizable: true,
    },
    zip: {
        title: translate("Zip Postal Code"),
        width: 150,
        minWidth: 100,
        isSortable: true,
        resizable: true,
    },
    city: {
        title: translate("City"),
        width: 200,
        minWidth: 100,
        isSortable: true,
        resizable: true,
    },
    country: {
        title: translate("Country"),
        width: 150,
        minWidth: 100,
        isSortable: true,
        resizable: true,
    },
    address2: { title: translate("Address Alternative"), width: 200, minWidth: 100, isSortable: false },
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

export const Companies = () => {
    const companies = useFilteredCompanies();
    const location = useLocation();
    const navigate = useNavigate();

    const openCompany = (company: ICompany) => {
        if (PreferencesStore.get().peopleEmbeddedCompany) {
            navigate(`/people/company/${company.id}`);
        } else {
            navigate(`/company/${company.id}`, {
                state: { backgroundLocation: location },
            });
        }
    };

    const handleCellClick = (row: ICompany, column: string) => {
        if (column === "title") {
            openCompany(row);
        }
    };

    return (
        <AppViewContent padded className="company-keep">
            <TablePersistent<ICompany>
                id="companies"
                sticky
                columns={tableColumns}
                data={companies}
                components={{
                    cell: TableCell,
                }}
                onCellClick={handleCellClick}
            />
        </AppViewContent>
    );
};

const CompanyTitleCell: FunctionComponent<TablePersistentCellProps<ICompany>> = ({ row }) => (
    <>
        {row.logo && <img src={`${row.logo}?size=small`} height={20} />}
        <strong>{row.title}</strong>
    </>
);

const CompanyStaffCell: FunctionComponent<TablePersistentCellProps<ICompany>> = ({ row }) => (
    <CompanyStaffPopover companyId={row.id} />
);

const CompanyDefaultCell: FunctionComponent<TablePersistentCellProps<ICompany>> = ({ row, column }) => (
    <>{row[column as keyof ICompany] ?? <span className={Classes.TEXT_DISABLED}>-</span>}</>
);

const CompanyCreatedCell: FunctionComponent<TablePersistentCellProps<ICompany>> = props =>
    props.row.created != null ? (
        <>{formatDate(props.row.created)}</>
    ) : (
        <CompanyDefaultCell {...props} />
    );

const CompanyUpdatedCell: FunctionComponent<TablePersistentCellProps<ICompany>> = props =>
    props.row.updated != null ? (
        <>{formatDate(props.row.updated)}</>
    ) : (
        <CompanyDefaultCell {...props} />
    );

const companyCellRegistry: Partial<
    Record<string, FunctionComponent<TablePersistentCellProps<ICompany>>>
> = {
    title: CompanyTitleCell,
    staff: CompanyStaffCell,
    created: CompanyCreatedCell,
    updated: CompanyUpdatedCell,
};

const TableCell = createTableCellFromRegistry<ICompany, TablePersistentCellProps<ICompany>>(
    companyCellRegistry,
    CompanyDefaultCell
);
