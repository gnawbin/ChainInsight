import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges conditional class names and de-duplicates conflicting Tailwind
 * utilities, so a caller-supplied `className` reliably overrides a component's
 * default styling.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
