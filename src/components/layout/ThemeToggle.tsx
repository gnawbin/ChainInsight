import { ActionIcon, useComputedColorScheme, useMantineColorScheme } from "@mantine/core";
import { MoonIcon, SunIcon } from "lucide-react";

/**
 * Toggles the Mantine colour scheme.
 *
 * Replaces the previous hand-rolled `useTheme` hook — Mantine persists the choice
 * itself and keeps `document` attributes in sync.
 */
export function ThemeToggle() {
  const { setColorScheme } = useMantineColorScheme();
  const computed = useComputedColorScheme("dark");
  const isDark = computed === "dark";

  return (
    <ActionIcon
      variant="default"
      size="lg"
      aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
      onClick={() => setColorScheme(isDark ? "light" : "dark")}
    >
      {isDark ? <SunIcon size={16} /> : <MoonIcon size={16} />}
    </ActionIcon>
  );
}
