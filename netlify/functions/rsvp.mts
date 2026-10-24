import type { Config, Context } from "@netlify/functions";
import { store, getAll, totals, type Rsvp } from "../lib/rsvps.mts";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const clean = (v: unknown, max: number) =>
  String(v ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);

const clamp = (v: unknown, lo: number, hi: number) => {
  const n = Math.floor(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
};

export default async (req: Request, _context: Context) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  let body: any;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Bad request" }, 400);
  }

  // Honeypot: bots fill the hidden field. Pretend success, save nothing.
  if (body?.website) return json({ ok: true });

  const name = clean(body?.name, 60);
  if (!name) return json({ error: "Name required" }, 400);

  const attending = body?.attending === true;
  const kids = attending ? clamp(body?.kids, 0, 10) : 0;
  const adults = attending ? clamp(body?.adults, 0, 10) : 0;
  if (attending && kids + adults < 1) return json({ error: "Add at least one guest" }, 400);
  const note = clean(body?.note, 200);

  // One entry per name, so a guest changing their answer overwrites the old one.
  const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "guest";
  const s = store();
  const existing = (await s.get(id, { type: "json" })) as Rsvp | null;
  const record: Rsvp = { id, name, attending, kids, adults, note, at: new Date().toISOString() };
  await s.setJSON(id, record);

  // Push notification to Elvis's phone via ntfy. Never fail the guest's RSVP if this hiccups.
  const topic = Netlify.env.get("NTFY_TOPIC");
  if (topic) {
    try {
      const t = totals(await getAll());
      const origin = new URL(req.url).origin;
      const key = Netlify.env.get("GUESTS_KEY");
      const people = [kids ? `${kids} kid${kids === 1 ? "" : "s"}` : "", adults ? `${adults} adult${adults === 1 ? "" : "s"}` : ""].filter(Boolean).join(" + ");
      const verb = existing ? "updated: " : "";
      const title = attending ? `🌀 ${name} is IN! (${people})` : `${name} can't make it`;
      const lines = [
        attending ? `${verb}${name} is coming with ${people}.` : `${verb}${name} can't make it.`,
        note ? `Note: ${note}` : "",
        "",
        t.adults ? `Total so far: ${t.people} people (${t.kids} kids + ${t.adults} adults) · ${t.yes} yes, ${t.no} no` : `Total so far: ${t.kids} kids · ${t.yes} yes, ${t.no} no`,
      ].filter((l, i, a) => l !== "" || (i > 0 && i < a.length - 1));
      const res = await fetch("https://ntfy.sh/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          topic,
          title,
          message: lines.join("\n"),
          tags: [attending ? "tada" : "wave"],
          priority: 4,
          ...(key ? { click: `${origin}/guests?key=${encodeURIComponent(key)}` } : {}),
        }),
      });
      if (!res.ok) console.error("ntfy failed", res.status, await res.text());
    } catch (err) {
      console.error("ntfy error", err);
    }
  }

  return json({ ok: true });
};

export const config: Config = { path: "/api/rsvp", method: "POST" };
