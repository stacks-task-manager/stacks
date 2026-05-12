// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React, { FunctionComponent } from "react";
import { shallowEqual } from "app/hooks/store";
import { Button, H5, HTMLTable, InputGroup } from "@blueprintjs/core";
import classNames from "classnames";

import { PreferencesStore } from "app/store/preferences";
export const TableSkeleton: FunctionComponent = () => {
    const darkMode = PreferencesStore.use(state => state.darkMode, shallowEqual);

    const rows = [...Array(15).keys()];

    return (
        <div id="table" className={classNames({ "bp4-dark": darkMode })}>
            <div className="table-header">
                <div>
                    <H5 className="bp4-skeleton">
                        {translate("Filters")}
                    </H5>
                    <InputGroup
                        className="bp4-skeleton"
                        placeholder={translate("Quick search")}
                        leftIcon="search"
                    />

                    <Button icon="alignment-top" className="bp4-skeleton" />
                    <Button icon="alignment-top" className="bp4-skeleton" />
                    <Button icon="alignment-top" className="bp4-skeleton" />
                    <Button icon="alignment-top" className="bp4-skeleton" />
                    <Button icon="alignment-top" className="bp4-skeleton" />
                    <Button icon="alignment-top" className="bp4-skeleton" />
                    <Button icon="alignment-top" className="bp4-skeleton" />
                </div>
                <div>
                    <Button icon="settings" className="bp4-skeleton" />

                    <Button icon="plus" className="bp4-skeleton">
                        {translate("Add a new stack")}
                    </Button>
                    <Button icon="plus" className="bp4-skeleton">
                        {translate("Add task")} &nbsp;
                    </Button>
                </div>
            </div>
            <div className="table-wrapper">
                <HTMLTable bordered striped className="custom-html-table">
                    <thead>
                        <tr>
                            <th>
                                <div className="bp4-skeleton">Column</div>
                            </th>
                            <th>
                                <div className="bp4-skeleton">Column</div>
                            </th>
                            <th>
                                <div className="bp4-skeleton">Column</div>
                            </th>
                            <th>
                                <div className="bp4-skeleton">Column</div>
                            </th>
                            <th>
                                <div className="bp4-skeleton">Column</div>
                            </th>
                            <th>
                                <div className="bp4-skeleton">Column</div>
                            </th>
                            <th>
                                <div className="bp4-skeleton">Column</div>
                            </th>
                            <th>
                                <div className="bp4-skeleton">Column</div>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map(row => {
                            return (
                                <tr key={row}>
                                    <td>
                                        <div className="bp4-skeleton">Lorem ipsum sit amet</div>
                                    </td>
                                    <td>
                                        <div className="bp4-skeleton">Lorem ipsum sit amet</div>
                                    </td>
                                    <td>
                                        <div className="bp4-skeleton">Lorem ipsum sit amet</div>
                                    </td>
                                    <td>
                                        <div className="bp4-skeleton">Lorem ipsum sit amet</div>
                                    </td>
                                    <td>
                                        <div className="bp4-skeleton">Lorem ipsum sit amet</div>
                                    </td>
                                    <td>
                                        <div className="bp4-skeleton">Lorem ipsum sit amet</div>
                                    </td>
                                    <td>
                                        <div className="bp4-skeleton">Lorem ipsum sit amet</div>
                                    </td>
                                    <td>
                                        <div className="bp4-skeleton">Lorem ipsum sit amet</div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </HTMLTable>
            </div>
        </div>
    );
};
