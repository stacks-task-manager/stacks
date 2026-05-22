// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, HTMLTable, Popover } from "@blueprintjs/core";
import React from "react";

import { Icon, Scroller } from "app/components/common";

export const TipTapHelpPopover = () => {
    return (
        <Popover
            content={
                <Scroller maxHeight={300} maxWidth={400} thin>
                    <HTMLTable striped bordered interactive={false}>
                        <thead>
                            <tr>
                                <th>Element</th>
                                <th>Syntax</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Header 1</td>
                                <td># Header text</td>
                            </tr>
                            <tr>
                                <td>Header 2</td>
                                <td>## Header text</td>
                            </tr>
                            <tr>
                                <td>Header 3</td>
                                <td>### Header text</td>
                            </tr>
                            <tr>
                                <td>Bold</td>
                                <td>**bold text**</td>
                            </tr>
                            <tr>
                                <td>Italic</td>
                                <td>*italic text*</td>
                            </tr>
                            <tr>
                                <td>Strike</td>
                                <td>~~striked text~~</td>
                            </tr>
                            <tr>
                                <td>Code</td>
                                <td>`this is code`</td>
                            </tr>
                            <tr>
                                <td>Highlight</td>
                                <td>==highlighted text==</td>
                            </tr>
                            <tr>
                                <td>Horizontal rule</td>
                                <td>---</td>
                            </tr>
                            <tr>
                                <td>#text</td>
                                <td>Autocomplete documents</td>
                            </tr>
                            <tr>
                                <td>@person</td>
                                <td>Autocomplete a person</td>
                            </tr>
                            <tr>
                                <td>::star</td>
                                <td>Emoji ⭐</td>
                            </tr>
                        </tbody>
                    </HTMLTable>
                </Scroller>
            }
        >
            <Button variant="minimal" size="small" icon={<Icon icon="help-circle" />} />
        </Popover>
    );
};
