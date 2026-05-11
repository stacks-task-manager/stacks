// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField } from "@/components/ui/input";
import {
    Modal,
    ModalBackdrop,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@/components/ui/modal";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useEffect, useRef, useState } from "react";
import { RECORDTYPE } from "@stacks/types";

import { createDocument } from "../api/endpoints";

type Kind = RECORDTYPE.PROJECT | RECORDTYPE.NOTEPAD | RECORDTYPE.FOLDER;

const KIND_OPTIONS: { value: Kind; label: string }[] = [
    { value: RECORDTYPE.PROJECT, label: "Project" },
    { value: RECORDTYPE.NOTEPAD, label: "Notepad" },
    { value: RECORDTYPE.FOLDER, label: "Folder" },
];

export function NewDocumentModal({
    visible,
    parentId,
    parentTitle,
    onClose,
    onCreated,
}: {
    visible: boolean;
    /** When set, the new document is created under this folder. */
    parentId?: string | null;
    /** Used for the sheet header to give context. */
    parentTitle?: string | null;
    onClose: () => void;
    onCreated: () => void;
}) {
    const [title, setTitle] = useState("");
    const [kind, setKind] = useState<Kind>(RECORDTYPE.PROJECT);
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        if (!visible) {
            setTitle("");
            setKind(RECORDTYPE.PROJECT);
        }
    }, [visible]);

    const submit = async () => {
        const t = title.trim();
        if (!t || busy) return;
        setBusy(true);
        try {
            await createDocument({
                title: t,
                type: kind,
                parent: parentId ?? null,
                data: kind === RECORDTYPE.PROJECT ? {} : undefined,
            });
            onCreated();
            onClose();
        } finally {
            setBusy(false);
        }
    };

    return (
        <Modal isOpen={visible} onClose={onClose} finalFocusRef={ref}>
            <ModalBackdrop />
            <ModalContent>
                <ModalHeader>
                    <VStack>
                        <Heading size="md">New document</Heading>
                        {parentTitle ? (
                            <Text size="xs" className="text-typography-500">
                                in “{parentTitle}”
                            </Text>
                        ) : null}
                    </VStack>
                </ModalHeader>
                <ModalBody>
                    <VStack space="md">
                        <Input variant="outline" size="md">
                            <InputField
                                placeholder="Title"
                                value={title}
                                onChangeText={setTitle}
                                autoFocus
                            />
                        </Input>
                        <VStack space="xs">
                            <Text size="sm" className="text-typography-600">
                                Type
                            </Text>
                            <HStack space="sm" className="flex-wrap">
                                {KIND_OPTIONS.map(opt => {
                                    const selected = kind === opt.value;
                                    return (
                                        <Pressable
                                            key={opt.value}
                                            onPress={() => setKind(opt.value)}
                                            className={`px-3 py-2 border rounded-sm ${
                                                selected
                                                    ? "border-primary-500 bg-primary-50"
                                                    : "border-outline-300 bg-background-0"
                                            }`}
                                        >
                                            <Text
                                                className={
                                                    selected
                                                        ? "text-primary-700"
                                                        : "text-typography-900"
                                                }
                                            >
                                                {opt.label}
                                            </Text>
                                        </Pressable>
                                    );
                                })}
                            </HStack>
                        </VStack>
                    </VStack>
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="outline"
                        onPress={onClose}
                        disabled={busy}
                        className="mr-2"
                    >
                        <ButtonText>Cancel</ButtonText>
                    </Button>
                    <Button onPress={() => void submit()} disabled={busy || !title.trim()}>
                        <ButtonText>{busy ? "…" : "Create"}</ButtonText>
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
