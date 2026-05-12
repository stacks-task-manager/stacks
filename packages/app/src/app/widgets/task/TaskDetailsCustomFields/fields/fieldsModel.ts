// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { IField } from "@stacks/types";

export interface CustomFieldProps extends IField {
    value: any;
    onChange: (id: string, value: any) => void;
}
