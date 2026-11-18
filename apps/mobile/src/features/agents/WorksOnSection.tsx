import { useAgents, useMachines, useSetWorksOn } from "@agenteschat/client";
import { managesAgent } from "@agenteschat/client/lib/audience";
import { type WorksOnAgent, worksOnCrewShown, worksOnField } from "@agenteschat/client/lib/works-on";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { GroupedFooter, GroupedHeader, GroupedList, GroupedRow, useToast } from "@/ui";
import { router } from "@/ui/navigation";
import { useFailed } from "../routines/hooks";
import { useOrgId } from "../shared/hooks";
import { closeAgentChoose, openAgentChoose } from "./agent-choose";

/** How many agents working on a computer the screen names before "and N more". */
const CREW_SHOWN = 5;

/**
 * "Trabalha no computador de" (ADR 0202), as the web's field in Configurações › Computador: who may change the agent
 * picks the agent whose computer it uses on a screen of its own (the agents offered by `worksOnField`, and "its own
 * computer"), applied at once. The trade-off is the footer, in plain words. An agent with others on its computer lists
 * them. Nothing for the right hand.
 */
export function WorksOnSection({ agentId }: { agentId: string }) {
  const { t } = useTranslation();
  const orgId = useOrgId();
  const toast = useToast();
  const failed = useFailed();
  const agents = useAgents(orgId).data;
  const machines = useMachines(orgId).data;
  const set = useSetWorksOn(orgId);
  const apply = (to: string | null) =>
    set.mutate(
      { agentId, worksOnAgentId: to },
      { onError: failed, onSuccess: () => toast({ title: t("worksOn.label"), agentId }) },
    );
  const latest = useRef(apply);
  useLayoutEffect(() => {
    latest.current = apply;
  });
  useEffect(() => () => closeAgentChoose(), []);
  const agent = agents?.find((a) => a.id === agentId);
  if (!agents || !agent || !managesAgent(agent)) return null;
  const known: WorksOnAgent[] = agents.map((a) => ({
    id: a.id,
    name: a.name,
    handle: a.handle,
    ownerUserId: a.ownerUserId ?? null,
    machineId: machines?.find((m) => m.agents.some((x) => x.id === a.id))?.id ?? null,
    archivedAt: null,
    builtin: a.builtin ?? null,
    worksOnAgentId: a.worksOnAgentId ?? null,
  }));
  const me = known.find((a) => a.id === agentId);
  if (!me) return null;
  const field = worksOnField(me, known);
  if (field.kind === "none") return null;
  if (field.kind === "lead") {
    const { shown, more } = worksOnCrewShown(field.crew, CREW_SHOWN);
    return (
      <>
        <GroupedHeader>{t("worksOn.crewTitle")}</GroupedHeader>
        <GroupedFooter>
          {shown.length === 0
            ? t("worksOn.crewEmpty")
            : `${shown.map((a) => a.name).join(", ")}${more > 0 ? ` ${t("worksOn.crewMore", { count: more })}` : ""}.`}
        </GroupedFooter>
      </>
    );
  }
  const lead = field.kind === "member" ? field.lead : null;
  const choose = () => {
    const choices = field.kind === "pick" ? field.options : lead ? [lead] : [];
    openAgentChoose({
      title: t("worksOn.label"),
      ids: choices.map((a) => a.id),
      picked: lead ? [lead.id] : [],
      none: t("worksOn.none"),
      note: t("worksOn.tradeoff"),
      apply: ([to]) => {
        if ((to ?? null) !== (lead?.id ?? null)) latest.current(to ?? null);
      },
    });
    router.push("/agent-choose");
  };
  const empty = field.kind === "empty";
  return (
    <>
      <GroupedHeader>{t("worksOn.label")}</GroupedHeader>
      <GroupedList>
        <GroupedRow
          icon="members"
          label={t("worksOn.label")}
          hint={{ name: t("common.about", { label: t("worksOn.label") }), text: t("worksOn.hint") }}
          value={
            empty ? t("worksOn.noneEligible") : lead ? t("worksOn.locked", { name: lead.name }) : t("worksOn.none")
          }
          {...(empty ? {} : { chevron: true, disabled: set.isPending, onPress: choose })}
        />
      </GroupedList>
      <GroupedFooter>
        {field.kind === "member" && !lead ? t("worksOn.unavailable", { name: "" }) : t("worksOn.tradeoff")}
      </GroupedFooter>
    </>
  );
}
