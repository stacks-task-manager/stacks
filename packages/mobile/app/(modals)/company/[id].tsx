// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { useQuery } from "@tanstack/react-query";
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import { useCallback, useLayoutEffect, useMemo } from "react";
import { Pressable as RNPressable } from "react-native";

import type { ICompany } from "@stacks/types";

import { Box } from "@/components/ui/box";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Image } from "@/components/ui/image";
import { ScrollView } from "@/components/ui/scroll-view";
import { Spinner } from "@/components/ui/spinner";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";

import { fetchCompany } from "../../../src/api/endpoints";
import { QuickAction } from "../../../src/components/QuickAction";
import {
    InfoRow,
    Section,
    formatAddressLines,
    openEmail,
    openPhone,
    openWebsite,
} from "../../../src/components/entity-detail/DetailBlocks";

function companyInitial(c: ICompany): string {
    return (c.title || "?").trim().charAt(0).toUpperCase() || "?";
}

function companySubtitle(c: ICompany): string | null {
    const parts = [c.industry, c.altCode].filter(Boolean);
    return parts.length ? parts.join(" · ") : null;
}

export default function CompanyScreen() {
    const { id } = useLocalSearchParams<{ id: string }>();
    const navigation = useNavigation();
    const router = useRouter();

    const { data: company, isLoading } = useQuery({
        queryKey: ["company", id],
        queryFn: () => fetchCompany(id),
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
            title: company?.title ?? "Company",
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
    }, [close, navigation, company]);

    const mainAddress = useMemo(
        () =>
            formatAddressLines([
                company?.address,
                company?.address2,
                [company?.zip, company?.city].filter(Boolean).join(" "),
                [company?.county, company?.country].filter(Boolean).join(", "),
            ]),
        [company]
    );

    const registeredOffice = useMemo(
        () =>
            formatAddressLines([
                company?.registeredOfficeAddress,
                company?.registeredOfficeAddress2,
                [company?.registeredOfficeZip, company?.registeredOfficeCity].filter(Boolean).join(" "),
                [company?.registeredOfficeCounty, company?.registeredOfficeCountry]
                    .filter(Boolean)
                    .join(", "),
            ]),
        [company]
    );

    const billingAddress = useMemo(
        () =>
            formatAddressLines([
                company?.billingAddress,
                company?.billingAddress2,
                [company?.billingZip, company?.billingCity].filter(Boolean).join(" "),
                [company?.billingCounty, company?.billingCountry].filter(Boolean).join(", "),
            ]),
        [company]
    );

    const shippingAddress = useMemo(
        () =>
            formatAddressLines([
                company?.shippingAddress,
                company?.shippingAddress2,
                [company?.shippingZip, company?.shippingCity].filter(Boolean).join(" "),
                [company?.shippingCounty, company?.shippingCountry].filter(Boolean).join(", "),
            ]),
        [company]
    );

    if (isLoading || !company) {
        return (
            <Box className="flex-1 justify-center items-center">
                <Spinner />
            </Box>
        );
    }

    const sub = companySubtitle(company);
    const primaryPhone = company.phone || company.cell;

    return (
        <ScrollView
            className="flex-1 bg-background-0"
            contentContainerStyle={{ paddingBottom: 32 }}
        >
            <VStack className="items-center px-6 pt-6 pb-4" space="sm">
                {company.logo ? (
                    <Image
                        source={{ uri: company.logo }}
                        alt={company.title}
                        style={{ width: 96, height: 96, borderRadius: 16 }}
                    />
                ) : (
                    <Box
                        className="rounded-2xl bg-background-200 items-center justify-center"
                        style={{ width: 96, height: 96 }}
                    >
                        <Text
                            size="2xl"
                            className="font-bold text-typography-800"
                        >
                            {companyInitial(company)}
                        </Text>
                    </Box>
                )}

                <VStack className="items-center" space="xs">
                    <Heading size="xl" className="text-center">
                        {company.title}
                    </Heading>
                    {sub ? (
                        <Text
                            size="sm"
                            className="text-typography-600 text-center"
                        >
                            {sub}
                        </Text>
                    ) : null}
                </VStack>

                <HStack space="sm" className="mt-2 flex-wrap justify-center">
                    {company.email ? (
                        <QuickAction
                            label="Email"
                            icon="mail-02"
                            onPress={() => openEmail(company.email as string)}
                        />
                    ) : null}
                    {primaryPhone ? (
                        <QuickAction
                            label="Call"
                            onPress={() => openPhone(primaryPhone as string)}
                        />
                    ) : null}
                    {company.website ? (
                        <QuickAction
                            label="Website"
                            icon="link-external-01"
                            onPress={() => openWebsite(company.website as string)}
                        />
                    ) : null}
                </HStack>
            </VStack>

            <VStack className="px-5">
                <Section title="General">
                    <InfoRow label="Industry" value={company.industry} />
                    <InfoRow label="Alt code" value={company.altCode} />
                </Section>

                <Section title="Contact">
                    <InfoRow
                        label="Email"
                        value={company.email}
                        onPress={company.email ? () => openEmail(company.email as string) : undefined}
                    />
                    <InfoRow
                        label="Phone"
                        value={company.phone}
                        onPress={
                            company.phone ? () => openPhone(company.phone as string) : undefined
                        }
                    />
                    <InfoRow
                        label="Mobile"
                        value={company.cell}
                        onPress={
                            company.cell ? () => openPhone(company.cell as string) : undefined
                        }
                    />
                    <InfoRow label="Fax" value={company.fax} />
                    <InfoRow
                        label="Website"
                        value={company.website}
                        onPress={
                            company.website
                                ? () => openWebsite(company.website as string)
                                : undefined
                        }
                    />
                </Section>

                <Section title="Address">
                    <InfoRow label="Address" value={mainAddress} />
                </Section>

                <Section title="Registered office">
                    <InfoRow label="Address" value={registeredOffice} />
                </Section>

                <Section title="Billing">
                    <InfoRow label="Address" value={billingAddress} />
                </Section>

                <Section title="Shipping">
                    <InfoRow label="Address" value={shippingAddress} />
                </Section>

                <Section title="Payment & banking">
                    <InfoRow label="Payment" value={company.payment} />
                    <InfoRow label="VAT" value={company.vat} />
                </Section>

                <Section title="Notes">
                    <InfoRow label="Notes" value={company.notes} />
                </Section>
            </VStack>
        </ScrollView>
    );
}
