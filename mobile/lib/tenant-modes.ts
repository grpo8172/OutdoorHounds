import { MODES } from "./modes";
import { AppMode } from "./mockData";

export type TenantModeEntry = { key: string; active: boolean; emoji: string; label: string; subtitle?: string | null; image?: string | null };

// Web's mode_config is keyed by item_type; mobile's MODES is keyed by the
// coarser AppMode. "pet_events" is the DEFAULT tenant's static rollup of
// three web keys — kept as-is for the default tenant's unmerged experience
// (see the early-return below). For a non-default tenant, those same three
// keys are instead expanded into independent cards (below), since forcing
// three possibly-unrelated custom categories under one generic label
// doesn't make sense once a tenant has actually customised them
// differently (e.g. "Commission a painting" / "Custom clay figures" /
// "Join an art group" have nothing in common). Mirrors the same key
// grouping used server-side (server/items.ts's LEGACY_ITEM_TYPES) and
// client-side (hooks/use-swipe-profiles.ts's ITEM_TYPE_TO_MODE), duplicated
// here rather than imported since mobile-api and the Expo app are separate
// bundles that don't share code across that boundary today.
const SINGLE_KEY_MODES: Record<Exclude<AppMode, "pet_events" | "event" | "hike" | "petting_zoo_booking">, string> = {
  adopt_or_foster: "pet",
  pet_services: "service",
  stalls_and_shops: "stall",
  lost_and_found: "lost_found",
};

// Fallback emoji/image per split-out key, used when a tenant customised the
// label but left emoji/image blank — matches the web backend's own
// per-key defaults (backend/app/models/domain.py's DEFAULT_MODE_CONFIG)
// rather than reusing one generic "pet_events" image for all three.
const SPLIT_MODE_DEFAULTS: Record<"event" | "hike" | "petting_zoo_booking", { emoji: string; image: string }> = {
  event: { emoji: "🎉", image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop" },
  hike: { emoji: "🥾", image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop" },
  petting_zoo_booking: { emoji: "🐑", image: "https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=600&h=300&fit=crop" },
};

// Deliberately wider than `(typeof MODES)[number]` — that type is a union
// of exact string-literal shapes (fine for the static array itself), but
// the entries built below come from arbitrary tenant-supplied strings, so
// title/subtitle/emoji/image need to be plain `string`, not literals.
export interface TenantMode {
  id: AppMode;
  title: string;
  subtitle: string;
  emoji: string;
  image: string;
}

// Only called for a non-default tenant (see use-active-tenant.ts) — the
// default tenant always renders MODES exactly as-is, unmerged.
// Every AppMode id that could ever legitimately appear in a /discover/:mode
// URL — the static MODES ids plus the three split-out sub-keys, which never
// appear in MODES itself (they're only produced dynamically, below).
export const ALL_MODE_IDS: AppMode[] = [...MODES.map((m) => m.id), "event", "hike", "petting_zoo_booking"];

export function mergeTenantModes(modeConfig: TenantModeEntry[] | null): TenantMode[] {
  if (!modeConfig || modeConfig.length === 0) return [...MODES];

  const byKey = new Map(modeConfig.map((m) => [m.key, m]));
  const petEventsDefault = MODES.find((m) => m.id === "pet_events")!;

  const singleModes = (Object.keys(SINGLE_KEY_MODES) as (keyof typeof SINGLE_KEY_MODES)[])
    .map((id): TenantMode | null => {
      const staticMode = MODES.find((m) => m.id === id)!;
      const entry = byKey.get(SINGLE_KEY_MODES[id]);
      // Tenant has no config at all for this key — keep the static default.
      if (!entry) return staticMode;
      if (!entry.active) return null;
      return {
        ...staticMode,
        title: entry.label || staticMode.title,
        emoji: entry.emoji || staticMode.emoji,
        subtitle: entry.subtitle || staticMode.subtitle,
        image: entry.image || staticMode.image,
      };
    })
    .filter((m): m is TenantMode => m !== null);

  // The three former "pet_events" sub-keys — each becomes its own
  // independent card (only shown if active and customised at all).
  const splitModes = (["event", "hike", "petting_zoo_booking"] as const)
    .map((id): TenantMode | null => {
      const entry = byKey.get(id);
      if (!entry || !entry.active) return null;
      const fallback = SPLIT_MODE_DEFAULTS[id];
      return {
        id,
        title: entry.label || petEventsDefault.title,
        subtitle: entry.subtitle || petEventsDefault.subtitle,
        emoji: entry.emoji || fallback.emoji,
        image: entry.image || fallback.image,
      };
    })
    .filter((m): m is TenantMode => m !== null);

  return [...singleModes, ...splitModes];
}
