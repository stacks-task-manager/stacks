#!/usr/bin/env node
// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import React from "react";
import { render } from "ink";
import { App } from "./App.js";
import { TuiViewportProvider } from "./tuiChrome.js";

render(
    <TuiViewportProvider>
        <App />
    </TuiViewportProvider>,
);
