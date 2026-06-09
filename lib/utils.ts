import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatMoney(amount: number): string {
  if (amount >= 1_000_000_000) {
    return `$${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, "")}B`
  }
  if (amount >= 1_000_000) {
    return `$${Math.round(amount / 1_000_000)}M`
  }
  return `$${Math.round(amount / 1_000)}K`
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  ko: "Korean",
  fr: "French",
  es: "Spanish",
  ja: "Japanese",
  de: "German",
  it: "Italian",
  pt: "Portuguese",
  zh: "Chinese",
  hi: "Hindi",
  ar: "Arabic",
}

export function getLanguageName(code: string): string {
  return LANGUAGE_NAMES[code] ?? code
}
