// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent, useMemo } from "react";

import { Link } from "app/components/common";
import { RECORDTYPE } from "@stacks/types";
import { PeopleActions } from "app/store/actions";

interface CompanyTableCellProps {
    companyId: string;
}
const CompanyTableCellPure: FunctionComponent<CompanyTableCellProps> = ({ companyId }) => {
    const company = useMemo(() => {
        return PeopleActions.getCompany(companyId);
    }, [companyId]);

    if (!company?.id) return null;

    return (
        <Link type={RECORDTYPE.COMPANY} id={companyId} showIcon>
            <strong>{company.title || "Unknown"}</strong>
        </Link>
    );
};

export const CompanyTableCell = React.memo(CompanyTableCellPure);
