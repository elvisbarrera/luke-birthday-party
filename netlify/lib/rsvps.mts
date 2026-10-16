import { getStore } from "@netlify/blobs";

export type Rsvp = {
  id: string;
  name: string;
  attending: boolean;
  kids: number;
  adults: number;
  note: string;
  at: string;
};

export const store = () => getStore({ name: "rsvps", consistency: "strong" });

export async function getAll(): Promise<Rsvp[]> {
  const s = store();
  const { blobs } = await s.list();
  const rows = await Promise.all(blobs.map((b) => s.get(b.key, { type: "json" }) as Promise<Rsvp | null>));
  return rows.filter((r): r is Rsvp => !!r).sort((a, b) => a.at.localeCompare(b.at));
}

export function totals(all: Rsvp[]) {
  const yes = all.filter((r) => r.attending);
  const kids = yes.reduce((n, r) => n + r.kids, 0);
  const adults = yes.reduce((n, r) => n + r.adults, 0);
  return {
    kids,
    adults,
    people: kids + adults,
    yes: yes.length,
    no: all.length - yes.length,
  };
}
