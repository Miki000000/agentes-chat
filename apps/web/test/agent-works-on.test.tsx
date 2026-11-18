import { afterEach, describe, expect, test } from "bun:test";
import { setupDom } from "@agenteschat/ui/testing/dom";

setupDom();

import type { Agent, AgentRef } from "@agenteschat/client";
import { cleanup } from "@testing-library/react";
import { AgentComputerPanel } from "@/components/AgentComputer";
import { ATLAS_ID, createFakeApi, fakeMachinesOf, ORG_ID, seedState } from "./fake-api";
import { renderPage, screen, settle } from "./render";

afterEach(cleanup);

/**
 * The "Works on the computer of" field on Ada's settings (ADR 0202): the states a person can land in, with the API's
 * `worksOn` and `crew` as the only source of the other agents' names.
 */
const ref = (id: string, name: string, archived = false): AgentRef => ({ id, name, handle: id, archived });

async function field(adaPatch: Partial<Agent>, withComputer = true) {
  const state = seedState();
  Object.assign(state.agents[0] as Agent, adaPatch);
  const api = createFakeApi(state);
  if (withComputer) {
    const m = fakeMachinesOf.get(api)?.pair({ name: "Mac mini", os: "darwin" });
    if (m) await api.sandbox.setTarget(ORG_ID, ATLAS_ID, m.id);
  }
  await renderPage(<AgentComputerPanel agent={state.agents[0] as Agent} />, { api, org: true });
  await settle(10);
  return screen();
}

describe("the works-on field", () => {
  test("nobody else has a computer to share: the explicit empty state", async () => {
    const view = await field({}, false);
    expect(view.getByText("Nenhum agente seu tem um computador para compartilhar.")).toBeTruthy();
  });

  test("a member of an archived lead: its name comes from worksOn, and stopping is a choice", async () => {
    const name = `${"Ção ".repeat(50)}مرحبا`.slice(0, 200);
    const view = await field({ worksOnAgentId: "gone", worksOn: ref("gone", name, true) });
    expect(view.getByText(new RegExp(`^${name.trim()} não pode compartilhar o computador agora`))).toBeTruthy();
    expect(view.getByText(/^Nesse computador ele faz o que esse agente faz/)).toBeTruthy();
  });

  test("not linked: no trade-off text while its own computer is selected", async () => {
    const view = await field({ crew: [] });
    expect(view.queryByText(/^Nesse computador ele faz/)).toBeNull();
  });

  test("a lead with many members names five and counts the rest; archived members are not listed", async () => {
    const crew = [...Array.from({ length: 8 }, (_, i) => ref(`m${i}`, `Membro${i}`)), ref("old", "Arquivado", true)];
    const view = await field({ crew });
    expect(view.getByText(/Membro0/)).toBeTruthy();
    expect(view.getByText(/Membro4/)).toBeTruthy();
    expect(view.queryByText(/Membro5/)).toBeNull();
    expect(view.queryByText(/Arquivado/)).toBeNull();
    expect(view.getByText("e mais 3")).toBeTruthy();
  });

  test("a lead whose members are all archived shows the crew-empty state, no picker", async () => {
    const view = await field({ crew: [ref("old", "Arquivado", true)] });
    expect(view.getByText("Nenhum outro agente trabalha neste computador.")).toBeTruthy();
    expect(view.queryByRole("combobox", { name: /Trabalha no computador de/ })).toBeNull();
  });
});
