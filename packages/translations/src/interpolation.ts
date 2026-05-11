// Copyright (C) 2026 Cristian Barlutiu — Licensed under AGPL v3. See LICENSE.
export type Segment =
  | { type: "text"; value: string }
  | { type: "ph"; name: string };

const PLACEHOLDER = /%\{([A-Za-z0-9_]+)\}/g;

export function parseTemplate(template: string): Segment[] {
  const segments: Segment[] = [];
  let lastEnd = 0;
  let m: RegExpExecArray | null;
  const re = new RegExp(PLACEHOLDER.source, "g");
  while ((m = re.exec(template)) !== null) {
    if (m.index > lastEnd) {
      segments.push({ type: "text", value: template.slice(lastEnd, m.index) });
    }
    segments.push({ type: "ph", name: m[1] });
    lastEnd = m.index + m[0].length;
  }
  if (lastEnd < template.length) {
    segments.push({ type: "text", value: template.slice(lastEnd) });
  }
  if (segments.length === 0) {
    segments.push({ type: "text", value: template });
  }
  return segments;
}

export type ParamValues = Record<string, string | number | boolean>;

export function interpolate(
  segments: Segment[],
  params: ParamValues | undefined,
): string {
  const p = params ?? {};
  let out = "";
  for (const seg of segments) {
    if (seg.type === "text") {
      out += seg.value;
    } else {
      const v = p[seg.name];
      out += v === undefined ? "" : String(v);
    }
  }
  return out;
}
