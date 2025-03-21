import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Combines class names with Tailwind CSS classes efficiently
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
