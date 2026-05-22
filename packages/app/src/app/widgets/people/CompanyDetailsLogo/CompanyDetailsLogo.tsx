// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React, { FunctionComponent } from "react";
import { Classes } from "@blueprintjs/core";

import { useMousetrap } from "app/hooks";
import { ICompany } from "@stacks/types";

interface CompanyDetailsLogoProps {
    company: ICompany;
    onClick: () => void;
}
export const CompanyDetailsLogo: FunctionComponent<CompanyDetailsLogoProps> = ({ company, onClick }) => {
    useMousetrap("shift+a", onClick);

    return (
        <div className="person-details__avatar editable" style={{ padding: "15px 0" }} onClick={onClick}>
            {company.logo && <img src={`${company.logo}?size=small`} style={{ maxHeight: 80, maxWidth: 200, mixBlendMode: "multiply" }} />}
            <small className={Classes.TEXT_DISABLED}>Click to change logo</small>
        </div>
    );
};
