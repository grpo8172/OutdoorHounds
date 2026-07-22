import { useMemo } from "react";
import { View } from "react-native";
import { vars } from "nativewind";
import { useActiveTenant } from "@/hooks/use-active-tenant";

// Every screen in the app styles its accents with the fixed `primary`
// Tailwind token (bg-primary, text-primary, etc.) from theme.config.js —
// none of them know about per-tenant branding. Rather than threading the
// active tenant's brandColor through every single screen, override the
// `--color-primary` CSS variable here, one level inside ThemeProvider's own
// vars() — being the closer ancestor, it wins for everything rendered below
// it, so the whole app (not just the home screen's few inline `brand` uses)
// picks up the tenant's color automatically. Falls through untouched for
// the default tenant / before the tenant config has loaded.
export function TenantBrandVars({ children }: { children: React.ReactNode }) {
  const { brandColor } = useActiveTenant();
  const style = useMemo(() => (brandColor ? vars({ "color-primary": brandColor }) : null), [brandColor]);

  if (!style) return <>{children}</>;
  return <View style={[{ flex: 1 }, style]}>{children}</View>;
}
