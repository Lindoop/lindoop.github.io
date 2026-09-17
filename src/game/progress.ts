// progress.ts — story flags. Which act bosses are down. Anything that gates on
// story state reads from here; room data stays static and knows only its act.

const beaten = new Set<number>();

export const bossBeaten = (act: number) => beaten.has(act);
export const beatBoss = (act: number) => { beaten.add(act); };
export const resetProgress = () => { beaten.clear(); };

const quests = new Set<string>();

export const questDone = (id: string) => quests.has(id);
export const finishQuest = (id: string) => { quests.add(id); };

export const serializeProgress = () => [...beaten];
export const hydrateProgress = (acts: number[]) => { beaten.clear(); for (const a of acts) beaten.add(a); };