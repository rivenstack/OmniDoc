import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Conditional class composition for copied-in shadcn/Base UI components.
 *
 * `clsx` handles conditional/array/object inputs; `tailwind-merge` collapses
 * conflicting Tailwind utilities so a consumer-supplied `className` always
 * wins over the component's defaults.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
