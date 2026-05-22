// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
import tinycolor from "tinycolor2";

export const adjustColor = (color: string, amount: number) => {
    return (
        "#" +
        (color ?? "ff0000")
            .replace(/^#/, "")
            .replace(/../g, color =>
                ("0" + Math.min(255, Math.max(0, parseInt(color, 16) + amount)).toString(16)).substr(-2)
            )
    );
};

export const colorToRGBA = (color: string, opacity: number) => {
    let hex = color.replace("#", "");

    if (hex.length === 3) {
        hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    /* Backward compatibility for whole number based opacity values. */
    if (opacity > 1 && opacity <= 100) {
        opacity = opacity / 100;
    }

    return `rgba(${r},${g},${b},${opacity})`;
};

export const colorToHuedColor = (color: string, opacity: number) => {
    let hex = color.replace("#", "");

    if (hex.length === 3) {
        hex = `${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }

    let alpha = opacity;
    if (alpha > 1 && alpha <= 100) {
        alpha = alpha / 100;
    }

    if (alpha < 0) {
        alpha = 0;
    } else if (alpha > 1) {
        alpha = 1;
    }

    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const mixChannel = (channel: number) => {
        const value = Math.round(255 * (1 - alpha) + channel * alpha);
        const clamped = Math.min(255, Math.max(0, value));
        return ("0" + clamped.toString(16)).substr(-2);
    };

    return `#${mixChannel(r)}${mixChannel(g)}${mixChannel(b)}`;
};

export const stringToColour = (str: string | number, amount?: number) => {
    let hash = 0;
    for (let i = 0; i < `${str}`.length; i++) {
        hash = `${str}`.charCodeAt(i) + ((hash << 5) - hash);
    }
    let colour = "#";
    for (let i = 0; i < 3; i++) {
        const value = (hash >> (i * 8)) & 0xff;
        colour += ("00" + value.toString(16)).substr(-2);
    }

    if (amount) return adjustColor(colour, amount);

    return colour;
};

export const stringToHsl = (str: string, s = 88, l = 80) => {
    if (!str) return "hsl(0, 0%, 0%)";
    const name = str.toLowerCase().replace(/ /g, "");
    let hash = 0;

    for (let i = 0; i < name.length; i++) {
        const char = name.charCodeAt(i);
        hash = char + ((hash << 5) - hash);
    }

    const h = hash % 360;
    return `hsl(${Math.abs(h)}, ${s}%, ${l}%)`;
};

export const isLight = (color: string, hspValue?: number) => {
    const { r, g, b } = tinycolor(color).toRgb();

    // HSP (Highly Sensitive Poo) equation from http://alienryderflex.com/hsp.html
    const hsp = Math.sqrt(0.299 * (r * r) + 0.587 * (g * g) + 0.114 * (b * b));

    // Using the HSP value, determine whether the color is light or dark
    if (hsp > (hspValue ? hspValue : 127.5)) {
        return true;
    } else {
        return false;
    }
};

export const encodeSvg = (svgString: string) => {
    return svgString
        .replace("<svg", ~svgString.indexOf("xmlns") ? "<svg" : '<svg xmlns="http://www.w3.org/2000/svg"')
        .replace(/"/g, "'")
        .replace(/%/g, "%25")
        .replace(/#/g, "%23")
        .replace(/{/g, "%7B")
        .replace(/}/g, "%7D")
        .replace(/</g, "%3C")
        .replace(/>/g, "%3E")
        .replace(/\s+/g, " ");
    //
    //    The maybe list (add on documented fail)
    //
    //  .replace(/&/g, '%26')
    //  .replace('|', '%7C')
    //  .replace('[', '%5B')
    //  .replace(']', '%5D')
    //  .replace('^', '%5E')
    //  .replace('`', '%60')
    //  .replace(';', '%3B')
    //  .replace('?', '%3F')
    //  .replace(':', '%3A')
    //  .replace('@', '%40')
    //  .replace('=', '%3D')
};

export const textColor = (color: string) => {
    function run(rgbColor: { r: number; g: number; b: number }) {
        const input = new Float32Array([rgbColor["r"] / 1000, rgbColor["g"] / 1000, rgbColor["b"] / 1000]);
        return {
            black:
                1 /
                (1 +
                    1 /
                        Math.exp(
                            2.1218020915985107 +
                                (7.651826858520508 * 1) /
                                    (1 +
                                        1 /
                                            Math.exp(
                                                -1.7847925424575806 +
                                                    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
                                                    2.5855484008789062 * (input[0] || 0) +
                                                    9.44324779510498 * (input[1] || 0) +
                                                    0.1783096194267273 * (input[2] || 0)
                                            )) -
                                (8.150311470031738 * 1) /
                                    (1 +
                                        1 /
                                            Math.exp(
                                                2.3512930870056152 -
                                                    3.4929566383361816 * (input[0] || 0) -
                                                    11.6708345413208 * (input[1] || 0) -
                                                    0.4266456365585327 * (input[2] || 0)
                                            )) -
                                (6.010054588317871 * 1) /
                                    (1 +
                                        1 /
                                            Math.exp(
                                                1.7376643419265747 -
                                                    2.6715946197509766 * (input[0] || 0) -
                                                    8.96444034576416 * (input[1] || 0) -
                                                    0.5153089761734009 * (input[2] || 0)
                                            ))
                        )),
            white:
                1 /
                (1 +
                    1 /
                        Math.exp(
                            -2.159794330596924 -
                                (7.63887357711792 * 1) /
                                    (1 +
                                        1 /
                                            Math.exp(
                                                -1.7847925424575806 +
                                                    // eslint-disable-next-line @typescript-eslint/no-loss-of-precision
                                                    2.5855484008789062 * (input[0] || 0) +
                                                    9.44324779510498 * (input[1] || 0) +
                                                    0.1783096194267273 * (input[2] || 0)
                                            )) +
                                (8.067206382751465 * 1) /
                                    (1 +
                                        1 /
                                            Math.exp(
                                                2.3512930870056152 -
                                                    3.4929566383361816 * (input[0] || 0) -
                                                    11.6708345413208 * (input[1] || 0) -
                                                    0.4266456365585327 * (input[2] || 0)
                                            )) +
                                (6.164193630218506 * 1) /
                                    (1 +
                                        1 /
                                            Math.exp(
                                                1.7376643419265747 -
                                                    2.6715946197509766 * (input[0] || 0) -
                                                    8.96444034576416 * (input[1] || 0) -
                                                    0.5153089761734009 * (input[2] || 0)
                                            ))
                        )),
        };
    }

    const result = run(tinycolor(color).toRgb());
    return result.white < result.black;
};

export function getContrastText({ r, g, b }: { r: number; g: number; b: number }, threshold: number) {
    const contrast = (Math.round(r * 299) + Math.round(g * 587) + Math.round(b * 114)) / 1000;
    return contrast >= threshold ? "black" : "white";
}

export function getTextColor(backgroundColor: string) {
    return getContrastText(tinycolor(backgroundColor).toRgb(), 128);
}
