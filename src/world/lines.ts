// Every spoken line in map data, with who says it. Used by the explore scene and checked by a test
// against the recorded voice index, so a new or edited line can't ship without its recording.
import type { MapFile, MapEntity } from "./map";

export interface Line { who: string; name: string; text: string; }

/** The voice id for an entity: props.voice, else the entity id. Signs and narration use "narrator". */
export const voiceOf = (e: MapEntity): string => String(e.props?.voice ?? e.id);

export function entityLines(e: MapEntity): Line[] {
  const out: Line[] = [];
  if (e.kind === "npc") {
    if (e.props?.line) out.push({ who: voiceOf(e), name: String(e.props?.name ?? e.id), text: String(e.props.line) });
    if (e.props?.after) out.push({ who: "narrator", name: "", text: String(e.props.after) });
  }
  if (e.kind === "sign" && e.props?.text) out.push({ who: "narrator", name: "", text: String(e.props.text) });
  return out;
}

export const mapLines = (m: MapFile): Line[] => m.entities.flatMap(entityLines);
