// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { Button, ButtonText } from "@/components/ui/button";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import {
    Modal,
    ModalBackdrop,
    ModalBody,
    ModalContent,
    ModalFooter,
    ModalHeader,
} from "@/components/ui/modal";
import { useRef, useState } from "react";

export function NewTaskModal({
    visible,
    stackTitle,
    onClose,
    onCreate,
}: {
    visible: boolean;
    stackTitle: string;
    onClose: () => void;
    onCreate: (title: string) => Promise<void>;
}) {
    const [title, setTitle] = useState("");
    const [busy, setBusy] = useState(false);
    const ref = useRef(null);

    const submit = async () => {
        const t = title.trim();
        if (!t || busy) return;
        setBusy(true);
        try {
            await onCreate(t);
            setTitle("");
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
                    <Heading size="md">New task — {stackTitle}</Heading>
                </ModalHeader>
                <ModalBody>
                    <Input variant="outline">
                        <InputField
                            placeholder="Title"
                            value={title}
                            onChangeText={setTitle}
                            autoFocus
                        />
                    </Input>
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onPress={onClose} disabled={busy} className="mr-2">
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
