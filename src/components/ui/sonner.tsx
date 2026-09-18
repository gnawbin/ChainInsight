import type { CSSProperties } from "react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { useTheme } from "@/hooks/useTheme";

/**
 * Transaction feedback surface.
 *
 * Every send flow reports through this toaster (pending → confirmed → failed),
 * so the styling points at the shadcn popover tokens rather than sonner's
 * defaults.
 */
function Toaster(props: ToasterProps) {
  const { theme } = useTheme();

  return (
    <Sonner
      theme={theme}
      className="toaster group"
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
        } as CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
