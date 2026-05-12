// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import "@testing-library/jest-dom";
import { TextDecoder, TextEncoder } from "util";

Object.assign(globalThis, { TextDecoder, TextEncoder });
