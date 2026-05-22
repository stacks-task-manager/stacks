// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { HTMLTable, Popover } from "@blueprintjs/core";

import { Scroller } from "../Scroller/Scroller";

interface IMarkdownHelpPopoverProps {
    children?: React.ReactNode;
}

export class MarkdownHelpPopover extends React.PureComponent<IMarkdownHelpPopoverProps> {
    render() {
        return <Popover content={this.renderPopoverContent()}>{this.props.children}</Popover>;
    }

    private renderPopoverContent = () => {
        return (
            <Scroller maxHeight={300} maxWidth={400} thin>
                <HTMLTable striped bordered interactive={false}>
                    <thead>
                        <tr>
                            <th>Element</th>
                            <th>Markdown Syntax</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#bold"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Bold
                                </a>
                            </td>
                            <td>**bold text**</td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#italic"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Italic
                                </a>
                            </td>
                            <td>*italicized text*</td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/extended-syntax/#strikethrough"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Strikethrough
                                </a>
                            </td>
                            <td>~~The world is flat.~~</td>
                        </tr>
                        <tr>
                            <td>Underline</td>
                            <td>&lt;u&gt;underlined text&lt;/u&gt;</td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#horizontal-rules"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Horizontal Rule
                                </a>
                            </td>
                            <td>---</td>
                        </tr>
                        <tr>
                            <td>Highlight</td>
                            <td>I need to highlight these ::very important words::</td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#links"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Link
                                </a>
                            </td>
                            <td>[title](https://www.example.com)</td>
                        </tr>
                        <tr>
                            <td>Link to local file</td>
                            <td>
                                <div>[title](&lt;/!C:\Documents\document.pdf&gt;)</div>
                                <div>[title](&lt;/!/Documents/document.pdf&gt;)</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#blockquotes-1"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Blockquote
                                </a>
                            </td>
                            <td>&gt; blockquote</td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#code"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Code
                                </a>
                            </td>
                            <td>`code`</td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/extended-syntax/#fenced-code-blocks"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Block Code
                                </a>
                            </td>
                            <td>
                                <code>
                                    {"```"}
                                    <br />
                                    {`{`}
                                    <br />
                                    &nbsp;&nbsp;{`"firstName"`}: {`"John"`},
                                    <br />
                                    &nbsp;&nbsp;{`"lastName"`}: {`"Smith"`},
                                    <br />
                                    &nbsp;&nbsp;{`"age"`}: 25
                                    <br />
                                    {`}`}
                                    <br />
                                    {"```"}
                                </code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#images-1"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Image
                                </a>
                            </td>
                            <td>![alt text](image.jpg)</td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#unordered-lists"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Unordered List
                                </a>
                            </td>
                            <td>
                                <div>- First item</div>
                                <div>- Second item</div>
                                <div>- Third item</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/basic-syntax/#ordered-lists"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Ordered List
                                </a>
                            </td>
                            <td>
                                <div>1. First item</div>
                                <div>2. Second item</div>
                                <div>3. Third item</div>
                            </td>
                        </tr>
                        <tr>
                            <td>Checked List</td>
                            <td>
                                <div>- [] First item</div>
                                <div>- [] Second item</div>
                                <div>- [x] Third item</div>
                            </td>
                        </tr>
                        <tr>
                            <td>Callouts</td>
                            <td>
                                <div>!&gt; Info callout</div>
                                <div>v&gt; Success callout</div>
                                <div>?&gt; Warning callout</div>
                                <div>x&gt; Error callout</div>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/extended-syntax/#tables"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Table
                                </a>
                            </td>
                            <td>
                                <code>
                                    | Syntax | Description |<br />
                                    | ----------- | ----------- |<br />
                                    | Header | Title |<br />| Paragraph | Text |
                                </code>
                            </td>
                        </tr>
                        <tr>
                            <td>
                                <a
                                    href="https://www.markdownguide.org/extended-syntax/#emoji"
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    Emoji
                                </a>
                            </td>
                            <td>That is so funny! :joy:</td>
                        </tr>
                        <tr>
                            <td>Confidential text</td>
                            <td>This {`{{text is private}}`}</td>
                        </tr>
                    </tbody>
                </HTMLTable>
            </Scroller>
        );
    };
}
