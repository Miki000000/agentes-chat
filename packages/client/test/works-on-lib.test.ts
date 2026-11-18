import { describe, expect, test } from "bun:test";
import { type WorksOnAgent, worksOnCrewShown, worksOnField } from "../src/lib/works-on";

/**
 * What the "Works on the computer of" field shows for an agent, one rule for web and phone (#874): who is offered
 * (the rules that depend on the agents alone; who may do it is the server's answer), the locked state of a member, the
 * explicit empty state, and the bounded list on the lead's side.
 */
const agent = (id: string, over: Partial<WorksOnAgent> = {}): WorksOnAgent => ({
  id,
  name: id,
  handle: id,
  ownerUserId: "ana",
  machineId: "m1",
  archivedAt: null,
  builtin: null,
  worksOnAgentId: null,
  ...over,
});

describe("who is offered", () => {
  test("same non-null owner, on a computer, not archived, not the right hand, not itself a member, not the agent", () => {
    const me = agent("me");
    const field = worksOnField(me, [
      me,
      agent("ok"),
      agent("other-owner", { ownerUserId: "bob" }),
      agent("no-owner", { ownerUserId: null }),
      agent("no-computer", { machineId: null }),
      agent("archived", { archivedAt: "2026-11-01T00:00:00Z" }),
      agent("hand", { builtin: "right_hand" }),
      agent("a-member", { worksOnAgentId: "ok" }),
    ]);
    expect(field.kind).toBe("pick");
    expect(field.kind === "pick" ? field.options.map((a) => a.id) : []).toEqual(["ok"]);
  });

  test("nobody eligible: an explicit empty state, never a blank list", () => {
    const me = agent("me");
    expect(worksOnField(me, [me])).toEqual({ kind: "empty" });
    expect(worksOnField(me, [me, agent("x", { ownerUserId: "bob" })])).toEqual({ kind: "empty" });
  });

  test("an agent with no owner can't work on another's computer: the field is empty for it", () => {
    const me = agent("me", { ownerUserId: null });
    expect(worksOnField(me, [me, agent("x", { ownerUserId: null })])).toEqual({ kind: "empty" });
  });

  test("a 200-character, accented, right-to-left name goes through untouched", () => {
    const long = `${"ção ".repeat(50)}مرحبا`.slice(0, 200);
    const me = agent("me");
    const field = worksOnField(me, [me, agent("l", { name: long })]);
    expect(field.kind === "pick" ? field.options[0]?.name : null).toBe(long);
  });

  test("the right hand has no field", () => {
    const hand = agent("hand", { builtin: "right_hand" });
    expect(worksOnField(hand, [hand, agent("x")])).toEqual({ kind: "none" });
  });
});

describe("the two sides", () => {
  test("a member's picker is locked on its lead, even when the lead is gone from the list", () => {
    const lead = agent("lead");
    const me = agent("me", { worksOnAgentId: "lead" });
    expect(worksOnField(me, [me, lead])).toEqual({ kind: "member", lead });
    expect(worksOnField(me, [me])).toEqual({ kind: "member", lead: null });
  });

  test("a lead lists who works on its computer, and can't become a member while it has any (no picker)", () => {
    const lead = agent("lead");
    const a = agent("a", { worksOnAgentId: "lead" });
    const b = agent("b", { worksOnAgentId: "lead" });
    const field = worksOnField(lead, [lead, a, b, agent("free")]);
    expect(field).toEqual({ kind: "lead", crew: [a, b] });
  });

  test("an agent that has any member, archived ones included, is offered no picker: unarchived, it would make a chain", () => {
    const lead = agent("lead");
    const gone = agent("gone", { worksOnAgentId: "lead", archivedAt: "2026-11-01T00:00:00Z" });
    expect(worksOnField(lead, [lead, gone, agent("free")])).toEqual({ kind: "lead", crew: [] });
  });
});

describe("the lead's list is bounded", () => {
  const crew = Array.from({ length: 12 }, (_, i) => agent(`m${i}`));
  test("at the limit: all shown, none hidden; one past it: the rest are counted", () => {
    expect(worksOnCrewShown(crew.slice(0, 5), 5)).toEqual({ shown: crew.slice(0, 5), more: 0 });
    expect(worksOnCrewShown(crew.slice(0, 6), 5)).toEqual({ shown: crew.slice(0, 5), more: 1 });
    expect(worksOnCrewShown(crew, 5)).toEqual({ shown: crew.slice(0, 5), more: 7 });
    expect(worksOnCrewShown([], 5)).toEqual({ shown: [], more: 0 });
  });
});
