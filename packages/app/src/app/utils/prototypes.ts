// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import { format } from "date-fns";

Date.toJSON = function name(date?: Date | null) {
    if (!date) return undefined;
    return date.toJSON();
};

// eslint-disable-next-line no-extend-native
Date.prototype.toJSON = function () {
    const formatString = "yyyy-MM-dd" + (this.allDay ? "" : " HH:mm:ss");
    return format(this, formatString);
};
// eslint-disable-next-line no-extend-native
Date.prototype.allDay = false;

Date.prototype.setAllDay = function (allDay: boolean) {
    this.allDay = allDay;
    return this;
};
