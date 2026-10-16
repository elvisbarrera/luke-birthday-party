import type { Config } from "@netlify/functions";
import { store, getAll, totals } from "../lib/rsvps.mts";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export default async (req: Request) => {
  const secret = Netlify.env.get("GUESTS_KEY");
  if (!secret) return new Response("Not found", { status: 404 });

  // Delete one RSVP, or reset the whole list. The secret key must be in the body.
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Bad request" }, 400);
    }
    if (body?.key !== secret) return new Response("Not found", { status: 404 });
    const s = store();
    if (body.action === "delete" && typeof body.id === "string" && body.id) {
      await s.delete(body.id);
      return json({ ok: true });
    }
    if (body.action === "reset") {
      const { blobs } = await s.list();
      await Promise.all(blobs.map((b) => s.delete(b.key)));
      return json({ ok: true, deleted: blobs.length });
    }
    return json({ error: "Unknown action" }, 400);
  }

  const key = new URL(req.url).searchParams.get("key");
  if (key !== secret) return new Response("Not found", { status: 404 });

  const all = await getAll();
  const t = totals(all);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const rows = all
    .map(
      (r) => `<tr class="${r.attending ? "y" : "n"}"><td>${esc(r.name)}</td><td>${r.attending ? "Yes" : "No"}</td><td>${r.kids}</td><td>${r.adults}</td><td>${esc(r.note)}</td><td>${fmt.format(new Date(r.at))}</td><td><button data-act="delete" data-id="${esc(r.id)}" data-name="${esc(r.name)}">Delete</button></td></tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Luke's party guests</title>
<style>body{font:16px system-ui,sans-serif;background:#0b1030;color:#eef3ff;margin:0;padding:20px}h1{font-size:22px;margin:0 0 4px}
.tot{display:flex;gap:10px;flex-wrap:wrap;margin:14px 0 20px}.tot div{background:#1a2260;border-radius:12px;padding:10px 16px}.tot b{font-size:26px;display:block}
.wrap{overflow-x:auto}table{border-collapse:collapse;width:100%;min-width:620px}th,td{text-align:left;padding:10px 8px;border-bottom:1px solid #2b3678}th{color:#8fb0ff;font-size:13px;text-transform:uppercase;letter-spacing:.08em}
tr.n td{opacity:.6}button{font:600 14px system-ui,sans-serif;border-radius:8px;border:1px solid #5b6bb8;background:#1a2260;color:#eef3ff;padding:7px 12px;cursor:pointer}
button[data-act=reset]{border-color:#ff6b8a;color:#ffb3c4;margin-top:22px}</style></head><body>
<h1>Luke's 6th Birthday — guest list</h1><div style="color:#9db0e0">Sunday, Nov 1 · 11:30 AM · Main Event</div>
<div class="tot"><div><b>${t.kids}</b>kids</div><div><b>${t.adults}</b>adults</div><div><b>${t.yes}</b>families yes</div><div><b>${t.no}</b>can't make it</div></div>
<div class="wrap"><table><thead><tr><th>Name</th><th>Coming?</th><th>Kids</th><th>Adults</th><th>Note</th><th>When</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="7">No RSVPs yet.</td></tr>'}</tbody></table></div>
<button data-act="reset" type="button">Reset ALL RSVPs</button>
<script>
var key=new URLSearchParams(location.search).get('key');
function act(body){body.key=key;fetch('/guests',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}).then(function(r){if(!r.ok)throw 0;location.reload()}).catch(function(){alert('Something went wrong. Try again.')})}
document.addEventListener('click',function(e){var b=e.target.closest('button[data-act]');if(!b)return;
 if(b.dataset.act==='delete'){if(confirm('Delete the RSVP from "'+b.dataset.name+'"?'))act({action:'delete',id:b.dataset.id})}
 if(b.dataset.act==='reset'){if(confirm('Delete ALL RSVPs? This cannot be undone.')&&confirm('Are you sure? Everything will be erased.'))act({action:'reset'})}
});
</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

export const config: Config = { path: "/guests", method: ["GET", "POST"] };
