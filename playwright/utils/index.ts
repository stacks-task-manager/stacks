import { platform } from "node:os";

export const metaOrControl = platform() === "darwin" ? "Meta" : "Control";

export const hexToRgb = (hex: string) => {
    let c: any;
    if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
        c = hex.substring(1).split("");
        if (c.length == 3) {
            c = [c[0], c[0], c[1], c[1], c[2], c[2]];
        }
        c = "0x" + c.join("");
        return "rgb(" + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(", ") + ")";
    }
    throw new Error("Bad Hex");
};
