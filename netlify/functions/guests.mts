import type { Config } from "@netlify/functions";
import { getAll, totals } from "../lib/rsvps.mts";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

export default async (req: Request) => {
  const secret = Netlify.env.get("GUESTS_KEY");
  const key = new URL(req.url).searchParams.get("key");
  if (!secret || key !== secret) return new Response("Not found", { status: 404 });

  const all = await getAll();
  const t = totals(all);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const rows = all
    .map(
      (r) => `<tr class="${r.attending ? "y" : "n"}"><td>${esc(r.name)}</td><td>${r.attending ? "Yes" : "No"}</td><td>${r.kids}</td><td>${r.adults}</td><td>${esc(r.note)}</td><td>${fmt.format(new Date(r.at))}</td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Luke's party guests</title>
<style>body{font:16px system-ui,sans-serif;background:#0b1030;color:#eef3ff;margin:0;padding:20px}h1{font-size:22px;margin:0 0 4px}
.tot{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px}.tot div{background:#1a2260;border-radius:12px;padding:10px 16px}.tot b{font-size:26px;display:block}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:560px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #2b3678}th{color:#8fb0ff;font-size:13px;text-transform:uppercase;letter-spacing:.08em}
tr.n td{opacity:.6}</style></head><body>
<h1>Luke's 6th Birthday — guest list</h1><div style="color:#9db0e0">Sunday, Nov 1 · 11:30 AM · Main Event</div>
<div class="tot"><div><b>${t.kids}</b>kids</div><div><b>${t.adults}</b>adults</div><div><b>${t.yes}</b>families yes</div><div><b>${t.no}</b>can't make it</div></div>
<div class="wrap"><table><thead><tr><th>Name</th><th>Coming?</th><th>Kids</th><th>Adults</th><th>Note</th><th>When</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No RSVPs yet.</td></tr>'}</tbody></table></div>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

export const config: Config = { path: "/guests", method: "GET" };
