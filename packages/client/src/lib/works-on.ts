/**
 * What the "Works on the computer of" field shows for an agent (ADR 0202), one rule for web and phone: the agents it may
 * be put on (what the agents alone decide; who may do it is the server's answer), its locked state while it works on
 * one, an agent that has others working on its computer, and the bounded list of those.
 */
export interface WorksOnAgent {
  id: string;
  name: string;
  handle: string;
  ownerUserId: string | null;
  machineId: string | null;
  archivedAt: string | null;
  builtin: string | null;
  worksOnAgentId: string | null;
}

export type WorksOnField =
  /** The right hand: no field. */
  | { kind: "none" }
  /** It works on another's computer: the picker is locked on it (null: that agent is not in the list). */
  | { kind: "member"; lead: WorksOnAgent | null }
  /** Others work on its computer (archived ones count: back, they would make a chain): no picker. */
  | { kind: "lead"; crew: WorksOnAgent[] }
  | { kind: "pick"; options: WorksOnAgent[] }
  /** Nobody to choose: say so. */
  | { kind: "empty" };

export function worksOnField(agent: WorksOnAgent, agents: readonly WorksOnAgent[]): WorksOnField {
  if (agent.builtin) return { kind: "none" };
  if (agent.worksOnAgentId) return { kind: "member", lead: agents.find((a) => a.id === agent.worksOnAgentId) ?? null };
  const members = agents.filter((a) => a.worksOnAgentId === agent.id);
  if (members.length > 0) return { kind: "lead", crew: members.filter((a) => !a.archivedAt) };
  const options = agents.filter(
    (a) =>
      a.id !== agent.id &&
      !a.builtin &&
      !a.archivedAt &&
      !a.worksOnAgentId &&
      a.machineId !== null &&
      agent.ownerUserId !== null &&
      a.ownerUserId === agent.ownerUserId,
  );
  return options.length > 0 ? { kind: "pick", options } : { kind: "empty" };
}

/** The lead's list, `limit` names and how many more. */
export function worksOnCrewShown<T>(crew: readonly T[], limit: number) {
  return { shown: crew.slice(0, limit), more: Math.max(0, crew.length - limit) };
}
