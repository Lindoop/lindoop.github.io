// roster.ts — who you've recruited and who actually fights. Deliberately NOT in
// characters.json (that stays read-only data). Everything goes through these
// functions so a save/load layer can wrap them later without touching callers.

export const MAX_PARTY = 4;

type RosterState = { recruited: string[]; party: string[]; hp: Record<string, number> };
const state: RosterState = { recruited: ["mags"], party: ["mags"], hp: {} };

export const currentHp = (id: string, max: number) => Math.min(max, state.hp[id] ?? max);
export const setHp = (id: string, n: number) => { state.hp[id] = Math.max(0, Math.round(n)); };
export const restParty = () => { state.hp = {}; };

export const isRecruited = (id: string) => state.recruited.includes(id);
export const inParty = (id: string) => state.party.includes(id);
export const partyIds = () => [...state.party];
export const recruitedIds = () => [...state.recruited];

// recruit + auto-add to the active party if there's room
export function recruit(id: string): void {
  if (!state.recruited.includes(id)) state.recruited.push(id);
  if (!state.party.includes(id) && state.party.length < MAX_PARTY) state.party.push(id);
}

export function setParty(ids: string[]): void {
  state.party = ids.filter((id) => state.recruited.includes(id)).slice(0, MAX_PARTY);
}

export function resetRoster(): void {
  state.recruited = ["mags"];
  state.party = ["mags"];
  state.hp = {};
}

export const serializeRoster = (): RosterState => ({ recruited: [...state.recruited], party: [...state.party], hp: { ...state.hp } });

export function hydrateRoster(saved: Partial<RosterState> | null | undefined): void {
  if (!saved) return;
  if (saved.recruited?.length) state.recruited = [...new Set(["mags", ...saved.recruited])];
  if (saved.party?.length) setParty(saved.party);
  if (saved.hp) state.hp = { ...saved.hp };
}