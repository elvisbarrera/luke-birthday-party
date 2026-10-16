import type { Config } from "@netlify/functions";
import { store, getAll, totals } from "../lib/rsvps.mts";

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

const pl = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;

export default async (req: Request) => {
  const secret = Netlify.env.get("GUESTS_KEY");
  if (!secret) return new Response("Not found", { status: 404 });

  // Delete a single RSVP. The secret key must be in the body.
  if (req.method === "POST") {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Bad request" }, 400);
    }
    if (body?.key !== secret) return new Response("Not found", { status: 404 });
    if (body.action === "delete" && typeof body.id === "string" && body.id) {
      await store().delete(body.id);
      return json({ ok: true });
    }
    return json({ error: "Unknown action" }, 400);
  }

  const key = new URL(req.url).searchParams.get("key");
  if (key !== secret) return new Response("Not found", { status: 404 });

  const all = await getAll();
  const t = totals(all);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const cards = [...all]
    .reverse()
    .map((r) => {
      const people = r.kids + r.adults;
      const chips = r.attending
        ? `<span class="chip">🧒 ${pl(r.kids, "kid")}</span><span class="chip">🧑 ${pl(r.adults, "adult")}</span><span class="chip sum">${pl(people, "person").replace("persons", "people")}</span>`
        : `<span class="chip muted">Can't make it</span>`;
      return `<article class="g ${r.attending ? "in" : "out"}">
  <div class="gh"><h3>${esc(r.name)}</h3><span class="badge">${r.attending ? "IN" : "OUT"}</span></div>
  <div class="chips">${chips}</div>
  ${r.note ? `<p class="note">“${esc(r.note)}”</p>` : ""}
  <div class="gf"><time>${fmt.format(new Date(r.at))}</time><button type="button" data-act="delete" data-id="${esc(r.id)}" data-name="${esc(r.name)}">Delete</button></div>
</article>`;
    })
    .join("");

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex"><meta name="theme-color" content="#070b1f">
<title>Luke's Battle Roster</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Russo+One&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
<style>
:root{--cyan:#29d8ff;--orange:#ff7a1a;--gold:#ffd23f;--pink:#ff2e88;--violet:#7a4dff;--green:#19d36c;--muted:#a3b4e6;--line:rgba(120,160,255,.28);--display:'Russo One',Impact,sans-serif;--body:'Rajdhani','Segoe UI',system-ui,sans-serif}
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:var(--body);font-weight:600;font-size:18px;line-height:1.3;color:#eef3ff;min-height:100vh;
 background:radial-gradient(800px 520px at 50% -8%,#2d1b78 0%,transparent 62%),radial-gradient(600px 420px at 105% 100%,#0b3f78aa 0%,transparent 60%),#070b1f;background-attachment:fixed;
 padding:calc(18px + env(safe-area-inset-top)) 16px calc(40px + env(safe-area-inset-bottom))}
main{max-width:560px;margin:0 auto}
header{display:flex;align-items:center;gap:14px;padding:6px 2px 4px}
.top{width:64px;height:64px;flex:none;animation:spin 1.4s linear infinite;filter:drop-shadow(0 0 14px #ff7a1a99) drop-shadow(0 0 22px #29d8ff55)}
@keyframes spin{to{transform:rotate(360deg)}}
.eyebrow{font-size:12px;letter-spacing:.28em;text-transform:uppercase;color:var(--cyan);font-weight:700}
h1{font-family:var(--display);font-weight:400;font-size:clamp(26px,8vw,34px);line-height:1;text-transform:uppercase;margin-top:4px;
 background:linear-gradient(180deg,#fff 0%,#d6ecff 35%,#29d8ff 62%,#7a4dff 100%);-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 3px 0 #1b1f6b)}
.sub{color:var(--muted);font-size:16px;margin-top:4px}
.stats{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:18px}
.tile{position:relative;background:rgba(16,22,56,.8);border:1.5px solid var(--line);border-radius:16px;padding:12px 14px 12px 18px;overflow:hidden}
.tile::before{content:"";position:absolute;left:0;top:0;bottom:0;width:5px;background:linear-gradient(180deg,var(--cyan),var(--violet))}
.tile:nth-child(3)::before{background:linear-gradient(180deg,var(--gold),var(--orange))}
.tile:nth-child(4)::before{background:linear-gradient(180deg,#8bffb0,var(--green))}
.tile:nth-child(5)::before{background:linear-gradient(180deg,var(--pink),var(--violet))}
.tile .lbl{display:block;font-size:12px;letter-spacing:.22em;text-transform:uppercase;color:var(--muted);font-weight:700}
.tile b{display:block;font-family:var(--display);font-weight:400;font-size:34px;line-height:1.05;margin-top:2px}
.tile.big{grid-column:1/-1;padding:16px 18px 16px 22px;border-color:#7a4dff88;box-shadow:0 0 34px #7a4dff33,inset 0 0 34px #29d8ff10;
 background:linear-gradient(180deg,rgba(30,20,90,.9),rgba(12,18,48,.92))}
.tile.big::before{background:linear-gradient(180deg,var(--gold),var(--orange));width:7px}
.tile.big b{font-size:clamp(60px,20vw,86px);line-height:.95;background:linear-gradient(180deg,#fff7c2,var(--gold) 45%,var(--orange));-webkit-background-clip:text;background-clip:text;color:transparent;filter:drop-shadow(0 4px 0 #6b2200) drop-shadow(0 0 22px #ff7a1a77)}
.tile.big small{display:block;color:var(--muted);font-size:17px;margin-top:4px}
.bar{display:flex;align-items:center;justify-content:space-between;margin:26px 2px 10px}
.bar h2{font-family:var(--display);font-weight:400;font-size:18px;letter-spacing:.06em;text-transform:uppercase}
.bar h2 span{color:var(--gold)}
button{font:700 15px var(--body);letter-spacing:.06em;text-transform:uppercase;border-radius:10px;cursor:pointer;-webkit-tap-highlight-color:transparent;touch-action:manipulation}
#refresh{border:1.5px solid #29d8ff66;background:transparent;color:var(--cyan);padding:9px 14px}
#refresh:active{background:#29d8ff22}
.g{position:relative;background:rgba(16,22,56,.82);border:1.5px solid var(--line);border-radius:16px;padding:14px 16px 12px 20px;margin-bottom:10px;overflow:hidden}
.g::before{content:"";position:absolute;left:0;top:0;bottom:0;width:6px}
.g.in::before{background:linear-gradient(180deg,#8bffb0,var(--green))}
.g.out::before{background:linear-gradient(180deg,#5a6496,#2a3260)}
.g.out{opacity:.78}
.gh{display:flex;align-items:center;justify-content:space-between;gap:10px}
.gh h3{font-family:var(--display);font-weight:400;font-size:22px;line-height:1.1;overflow-wrap:anywhere}
.badge{flex:none;font-family:var(--display);font-size:14px;letter-spacing:.08em;padding:5px 12px;border-radius:8px}
.g.in .badge{background:linear-gradient(180deg,#8bffb0,var(--green));color:#04140c;box-shadow:0 0 16px #19d36c66}
.g.out .badge{background:#2a3260;color:#c7d2f5}
.chips{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.chip{background:#ffffff12;border:1.5px solid var(--line);border-radius:999px;padding:4px 12px;font-size:16px}
.chip.sum{border-color:#ffd23f88;color:var(--gold)}
.chip.muted{color:var(--muted)}
.note{margin-top:10px;color:#cfdcff;font-size:17px;font-weight:500;font-style:italic;overflow-wrap:anywhere}
.gf{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)}
time{color:var(--muted);font-size:15px}
.gf button{border:1.5px solid #ff6b8a99;background:transparent;color:#ffb3c4;padding:8px 14px}
.gf button:active{background:#ff6b8a33}
.empty{text-align:center;color:var(--muted);padding:34px 12px;border:1.5px dashed var(--line);border-radius:16px;font-size:19px}
@media (prefers-reduced-motion:reduce){.top{animation:none}}
</style></head><body><main>
<svg width="0" height="0" style="position:absolute" aria-hidden="true"><defs>
<linearGradient id="gB" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ffd36b"/><stop offset=".55" stop-color="#ff7a1a"/><stop offset="1" stop-color="#d12c0a"/></linearGradient>
<linearGradient id="gR" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#29d8ff"/><stop offset="1" stop-color="#7a4dff"/></linearGradient>
<radialGradient id="gM" cx=".38" cy=".32" r=".85"><stop offset="0" stop-color="#6f7fb8"/><stop offset=".55" stop-color="#2a3262"/><stop offset="1" stop-color="#0f1330"/></radialGradient>
<radialGradient id="gC" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#fffbd1"/><stop offset=".5" stop-color="#ffd23f"/><stop offset="1" stop-color="#e07a00"/></radialGradient>
<symbol id="t" viewBox="0 0 200 200"><circle cx="100" cy="100" r="97" fill="none" stroke="url(#gR)" stroke-width="3" stroke-dasharray="16 9"/>
<g stroke="#ffffff55" stroke-width="1.2" fill="url(#gB)"><path id="b" d="M100 3 C121 14 130 36 121 56 L100 48 L79 56 C70 36 79 14 100 3 Z"/>
<use href="#b" transform="rotate(60 100 100)"/><use href="#b" transform="rotate(120 100 100)"/><use href="#b" transform="rotate(180 100 100)"/><use href="#b" transform="rotate(240 100 100)"/><use href="#b" transform="rotate(300 100 100)"/></g>
<circle cx="100" cy="100" r="72" fill="url(#gM)" stroke="#29d8ff" stroke-width="2.5"/>
<polygon points="100,64 131,82 131,118 100,136 69,118 69,82" fill="#141a3d" stroke="#ffd23f" stroke-width="3"/>
<circle cx="100" cy="100" r="20" fill="url(#gC)"/><circle cx="100" cy="100" r="7" fill="#1a1030"/></symbol></defs></svg>

<header>
  <svg class="top" viewBox="0 0 200 200" aria-hidden="true"><use href="#t"/></svg>
  <div><div class="eyebrow">Battle roster</div><h1>Luke's Guest List</h1><div class="sub">Sun, Nov 1 · 11:30 AM · Main Event</div></div>
</header>

<section class="stats" aria-label="Totals">
  <div class="tile big"><span class="lbl">Total people</span><b>${t.people}</b><small>${pl(t.kids, "kid")} + ${pl(t.adults, "adult")}</small></div>
  <div class="tile"><span class="lbl">Kids</span><b>${t.kids}</b></div>
  <div class="tile"><span class="lbl">Adults</span><b>${t.adults}</b></div>
  <div class="tile"><span class="lbl">Families in</span><b>${t.yes}</b></div>
  <div class="tile"><span class="lbl">Can't make it</span><b>${t.no}</b></div>
</section>

<div class="bar"><h2>Challengers <span>${all.length}</span></h2><button id="refresh" type="button">↻ Refresh</button></div>
${cards || '<div class="empty">No challengers yet.<br>Share the invite and let the battle begin! 🌀</div>'}

</main>
<script>
var key=new URLSearchParams(location.search).get('key');
document.getElementById('refresh').addEventListener('click',function(){location.reload()});
document.addEventListener('click',function(e){
  var b=e.target.closest('button[data-act="delete"]'); if(!b) return;
  if(!confirm('Delete the RSVP from "'+b.dataset.name+'"?')) return;
  b.disabled=true;
  fetch('/guests',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({key:key,action:'delete',id:b.dataset.id})})
    .then(function(r){if(!r.ok)throw 0;location.reload()})
    .catch(function(){b.disabled=false;alert('Something went wrong. Try again.')});
});
</script>
</body></html>`;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } });
};

export const config: Config = { path: "/guests", method: ["GET", "POST"] };
