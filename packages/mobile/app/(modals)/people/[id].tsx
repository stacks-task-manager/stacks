// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useMemo } from "react";
import { Pressable as RNPressable } from "react-native";

import type { IPerson } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchPerson } from "../../../src/api/endpoints";
import { QuickAction } from "../../../src/components/QuickAction";
import {
    InfoRow,
    Section,
    openEmail,
    openPhone,
    openWebsite,
} from "../../../src/components/entity-detail/DetailBlocks";

function displayName(p: IPerson): string {
    const parts = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
    return parts || p.nickname || p.email;
}

function initials(p: IPerson): string {
    const first = (p.firstName || p.nickname || p.email || "?").trim().charAt(0);
    const last = (p.lastName || "").trim().charAt(0);
    return (first + last).toUpperCase() || "?";
}

export default function PersonScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const navigation = useNavigation();
    const router = useRouter();

    const { data: person, isLoading } = useQuery({
        queryKey: ["person", id],
        queryFn: () => fetchPerson(id),
        enabled: !!id,
    });

    const close = useCallback(() => {
        if (router.canGoBack()) {
            router.back();
            return;
        }
        router.replace("/(app)/people" as never);
    }, [router]);

    useLayoutEffect(() => {
        navigation.setOptions({
            title: person ? displayName(person) : "Person",
            headerLeft: () => (
                <RNPressable
                    onPress={close}
                    hitSlop={10}
                    android_ripple={null}
                    style={{
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        backgroundColor: "transparent",
                        shadowColor: "transparent",
                        shadowOpacity: 0,
                        shadowRadius: 0,
                        shadowOffset: { width: 0, height: 0 },
                        elevation: 0,
                    }}
                >
                    <Text size="md" className="text-primary-600">
                        Close
                    </Text>
                </RNPressable>
            ),
        });
    }, [close, navigation, person]);

    const fullAddress = useMemo(
        () =>
            [
                person?.address,
                person?.address2,
                [person?.zip, person?.city].filter(Boolean).join(" "),
                [person?.county, person?.country].filter(Boolean).join(", "),
            ]
                .filter(Boolean)
                .join("\n") || null,
        [person]
    );

    if (isLoading || !person) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    return (
        <ScrollView className="flex-1 bg-background-0" contentContainerStyle={{ paddingBottom: 32 }}>
            <VStack className="items-center px-6 pt-6 pb-4" space="sm">
                {person.avatar ? (
                    <Image
                        source={{ uri: person.avatar }}
                        alt={displayName(person)}
                        style={{ width: 96, height: 96, borderRadius: 48 }}
                    />
                ) : (
                    <Box
                        className="rounded-full bg-background-200 items-center justify-center"
                        style={{ width: 96, height: 96 }}
                    >
                        <Text size="2xl" className="font-bold text-typography-800">
                            {initials(person)}
                        </Text>
                    </Box>
                )}

                <VStack className="items-center" space="xs">
                    <Heading size="xl" className="text-center">
                        {displayName(person)}
                    </Heading>
                    {person.jobTitle || person.company ? (
                        <Text size="sm" className="text-typography-600 text-center">
                            {[person.jobTitle, person.company].filter(Boolean).join(" · ")}
                        </Text>
                    ) : null}
                    {person.nickname ? (
                        <Text size="xs" className="text-typography-500">
                            “{person.nickname}”
                        </Text>
                    ) : null}
                </VStack>

                <HStack space="sm" className="mt-2 flex-wrap justify-center">
                    {person.email ? (
                        <QuickAction label="Email" icon="mail-02" onPress={() => openEmail(person.email)} />
                    ) : null}
                    {person.cellPhone ? (
                        <QuickAction label="Call" onPress={() => openPhone(person.cellPhone as string)} />
                    ) : null}
                    {person.website ? (
                        <QuickAction
                            label="Website"
                            icon="link-external-01"
                            onPress={() => openWebsite(person.website as string)}
                        />
                    ) : null}
                </HStack>
            </VStack>

            <VStack className="px-5">
                <Section title="Contact">
                    <InfoRow label="Email" value={person.email} onPress={() => openEmail(person.email)} />
                    <InfoRow
                        label="Mobile"
                        value={person.cellPhone}
                        onPress={person.cellPhone ? () => openPhone(person.cellPhone as string) : undefined}
                    />
                    <InfoRow
                        label="Office"
                        value={person.officePhone}
                        onPress={
                            person.officePhone ? () => openPhone(person.officePhone as string) : undefined
                        }
                    />
                    <InfoRow
                        label="Home"
                        value={person.homePhone}
                        onPress={person.homePhone ? () => openPhone(person.homePhone as string) : undefined}
                    />
                    <InfoRow label="Fax" value={person.fax} />
                    <InfoRow
                        label="Website"
                        value={person.website}
                        onPress={person.website ? () => openWebsite(person.website as string) : undefined}
                    />
                </Section>

                <Section title="Work">
                    <InfoRow label="Company" value={person.company} />
                    <InfoRow label="Job title" value={person.jobTitle} />
                    <InfoRow label="Role" value={person.role} />
                </Section>

                <Section title="Address">
                    <InfoRow label="Address" value={fullAddress} />
                </Section>

                <Section title="Personal">
                    <InfoRow
                        label="Birthday"
                        value={
                            person.birthday
                                ? new Date(person.birthday).toLocaleDateString(undefined, {
                                      day: "numeric",
                                      month: "long",
                                      year: "numeric",
                                  })
                                : null
                        }
                    />
                    <InfoRow label="Age" value={person.age} />
                    <InfoRow label="Gender" value={person.gender || null} />
                </Section>

                <Section title="Social">
                    <InfoRow
                        label="Twitter"
                        value={person.socialTwitter}
                        onPress={
                            person.socialTwitter
                                ? () => openWebsite(person.socialTwitter as string)
                                : undefined
                        }
                    />
                    <InfoRow
                        label="Facebook"
                        value={person.socialFacebook}
                        onPress={
                            person.socialFacebook
                                ? () => openWebsite(person.socialFacebook as string)
                                : undefined
                        }
                    />
                    <InfoRow
                        label="LinkedIn"
                        value={person.socialLinkedin}
                        onPress={
                            person.socialLinkedin
                                ? () => openWebsite(person.socialLinkedin as string)
                                : undefined
                        }
                    />
                    <InfoRow
                        label="Instagram"
                        value={person.socialInstagram}
                        onPress={
                            person.socialInstagram
                                ? () => openWebsite(person.socialInstagram as string)
                                : undefined
                        }
                    />
                    <InfoRow label="Other" value={person.socialOther} />
                </Section>

                <Section title="Notes">
                    <InfoRow label="Notes" value={person.notes} />
                </Section>
            </VStack>
        </ScrollView>
    );
}
