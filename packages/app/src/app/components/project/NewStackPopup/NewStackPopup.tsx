// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { translate } from "@stacks/translations";
import React from "react";
import {
    Button,
    Classes,
    Colors,
    FormGroup,
    InputGroup,
    Intent,
    Placement,
    Popover,
    Position,
} from "@blueprintjs/core";
import { IStack, StackTemplate } from "@stacks/types";
import { TintPicker } from "app/components/project";
import { FullCircle } from "@blueprintjs/icons";

interface INewStackPopupProps {
    placement?: Placement;
    children?: React.ReactNode;
    onAdd: (stack: IStack) => void;
}

interface INewStackPopupState {
    title: string;
    tint?: string;
}

export class NewStackPopup extends React.PureComponent<INewStackPopupProps, INewStackPopupState> {
    private inputRef: HTMLInputElement | null = null;
    private buttonRef: HTMLButtonElement | null = null;

    constructor(props: INewStackPopupProps) {
        super(props);

        this.state = {
            title: "",
        };
    }

    render() {
        return (
            <Popover
                popoverClassName="popover-padded"
                content={this.renderContent()}
                onOpened={this.handleFocusInput}
                onClosed={this.handleReset}
                placement={this.props.placement || "bottom-end"}
            >
                {this.props.children}
            </Popover>
        );
    }

    private renderContent = () => {
        const { title } = this.state;
        const canSave = title.length > 2;

        return (
            <div className="new-stack-popup">
                <FormGroup label="Stack title" labelFor="text-input">
                    <InputGroup
                        id="text-input"
                        value={this.state.title}
                        placeholder={translate("Untitled stack")}
                        rightElement={this.renderStacksMenu()}
                        style={{ width: 360 }}
                        inputRef={(node: HTMLInputElement | null) => (this.inputRef = node)}
                        onChange={this.handleTitleChange}
                        onKeyDown={this.handleSaveEnter}
                    />
                </FormGroup>

                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                    }}
                >
                    <Button
                        intent={Intent.PRIMARY}
                        className={Classes.POPOVER_DISMISS}
                        disabled={!canSave}
                        onClick={this.handleSave}
                        ref={(node: HTMLButtonElement | null) => (this.buttonRef = node)}
                    >
                        Save stack
                    </Button>
                </div>
            </div>
        );
    };

    private handleSetColor = (tint?: string) => {
        this.setState({ tint });
    };

    private renderStacksMenu = () => {
        const { tint } = this.state;

        const buttonIcon: JSX.Element | null = tint ? <FullCircle color={tint || Colors.GRAY3} /> : null;

        return (
            <Popover
                captureDismiss={true}
                content={<TintPicker value={tint} onChange={this.handleSetColor} />}
                position={Position.BOTTOM_RIGHT}
            >
                <Button variant="minimal" rightIcon="caret-down" icon={buttonIcon}>
                    {tint ? "" : "select tint"}
                </Button>
            </Popover>
        );
    };

    private handleSave = () => {
        const stack: IStack = {
            ...StackTemplate,
            title: this.state.title,
        };

        if (this.state.tint) {
            stack.tint = this.state.tint;
        }

        this.props.onAdd(stack);
    };

    private handleSaveEnter = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.keyCode === 13 && this.buttonRef) {
            this.buttonRef.click();
        }
    };

    private handleTitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        this.setState({
            title: event.currentTarget.value,
        });
    };

    private handleFocusInput = () => {
        if (this.inputRef) {
            this.inputRef.focus();
        }
    };

    private handleReset = () => {
        this.setState({
            title: "",
            tint: undefined,
        });
    };
}
