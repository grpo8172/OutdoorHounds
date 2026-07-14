import { MODES } from "./modes";
import { AppMode } from "./mockData";

export type TenantModeEntry = { key: string; active: boolean; emoji: string; label: string; subtitle?: string | null; image?: string | null };

// Web's mode_config is keyed by item_type; mobile's MODES is keyed by the
// coarser AppMode. pet_events rolls up three web keys — mirrors the same
// rollup already used server-side (server/items.ts's LEGACY_ITEM_TYPES) and
// client-side (hooks/use-swipe-profiles.ts's ITEM_TYPE_TO_MODE), duplicated
// here rather than imported since mobile-api and the Expo app are separate
// bundles that don't share code across that boundary today.
const MODE_TO_ITEM_TYPES: Record<AppMode, string[]> = {
  adopt_or_foster: ["pet"],
  pet_services: ["service"],
  pet_events: ["event", "hike", "petting_zoo_booking"],
  stalls_and_shops: ["stall"],
  lost_and_found: ["lost_found"],
};

// Only called for a non-default tenant (see use-active-tenant.ts) — the
// default tenant always renders MODES exactly as-is, unmerged.
export function mergeTenantModes(modeConfig: TenantModeEntry[] | null) {
  if (!modeConfig || modeConfig.length === 0) return MODES;

  const byKey = new Map(modeConfig.map((m) => [m.key, m]));

  return MODES.map((mode) => {
    const itemTypes = MODE_TO_ITEM_TYPES[mode.id] ?? [];
    const entries = itemTypes.map((k) => byKey.get(k)).filter((e): e is TenantModeEntry => !!e);

    // Tenant has no config at all for this mode's underlying key(s) — keep
    // the static default rather than guessing.
    if (entries.length === 0) return mode;

    // Rollup (pet_events): hide only if every underlying key is inactive;
    // never try to reconcile three possibly-conflicting custom labels into
    // one, so the static label/emoji is always kept when shown.
    if (itemTypes.length > 1) {
      return entries.some((e) => e.active) ? mode : null;
    }

    // Single 1:1-mapped key: honor active/inactive plus label/emoji/subtitle/image overrides.
    const entry = entries[0];
    if (!entry.active) return null;
    return {
      ...mode,
      title: entry.label || mode.title,
      emoji: entry.emoji || mode.emoji,
      subtitle: entry.subtitle || mode.subtitle,
      image: entry.image || mode.image,
    };
  }).filter((m): m is (typeof MODES)[number] => m !== null);
}
