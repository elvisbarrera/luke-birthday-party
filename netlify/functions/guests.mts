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
  const going = all.filter((r) => r.attending);
  const packages = going.filter((r) => r.kids >= 1).length;
  const extraKids = going.reduce((n, r) => n + Math.max(0, r.kids - 1), 0);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: "America/Chicago", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  const cards = [...all]
    .reverse()
    .map((r) => {
      const people = r.kids + r.adults;
      const chips = r.attending
        ? `<span class="chip">🧒 ${pl(r.kids, "kid")}</span><span class="chip">🧑 ${pl(r.adults, "adult")}</span><span class="chip sum">${pl(people, "person").replace("persons", "people")}</span>${r.kids >= 1 ? `<span class="chip pk">🎮 1 package</span>` : ""}${r.kids > 1 ? `<span class="chip warn">+${r.kids - 1} extra ${r.kids - 1 === 1 ? "kid" : "kids"} (not included)</span>` : ""}`
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
<title>Luke's Party Guest List</title>
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
.chip.pk{background:#46e08a22;border-color:#46e08a88;color:#9af0c0}
.chip.warn{background:#ffd23f1f;border-color:#ffd23f88;color:#ffe58a}
.note{margin-top:10px;color:#cfdcff;font-size:17px;font-weight:500;font-style:italic;overflow-wrap:anywhere}
.gf{display:flex;align-items:center;justify-content:space-between;margin-top:12px;padding-top:10px;border-top:1px dashed var(--line)}
time{color:var(--muted);font-size:15px}
.gf button{border:1.5px solid #ff6b8a99;background:transparent;color:#ffb3c4;padding:8px 14px}
.gf button:active{background:#ff6b8a33}
.empty{text-align:center;color:var(--muted);padding:34px 12px;border:1.5px dashed var(--line);border-radius:16px;font-size:19px}
</style></head><body><main>
<header>
  <div><div class="eyebrow">🎉 Birthday party · Guest list</div><h1>Luke's 6th Birthday</h1><div class="sub">Sun, Nov 1 · 11:30 AM · Main Event San Antonio West</div></div>
</header>

<section class="stats" aria-label="Totals">
  <div class="tile big"><span class="lbl">Total people</span><b>${t.people}</b><small>${pl(t.kids, "kid")} + ${pl(t.adults, "adult")}</small></div>
  <div class="tile"><span class="lbl">Kids</span><b>${t.kids}</b></div>
  <div class="tile"><span class="lbl">Adults</span><b>${t.adults}</b></div>
  <div class="tile pkg"><span class="lbl">Packages</span><b>${packages}</b></div>
  <div class="tile"><span class="lbl">Extra kids</span><b>${extraKids}</b></div>
  <div class="tile"><span class="lbl">Families in</span><b>${t.yes}</b></div>
  <div class="tile"><span class="lbl">Can't make it</span><b>${t.no}</b></div>
</section>

<div class="bar"><h2>Guests <span>${all.length}</span></h2><button id="refresh" type="button">↻ Refresh</button></div>
${cards || '<div class="empty">No RSVPs yet.<br>Share the invite and get the party started! 🎉</div>'}

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
