import { t } from "../i18n"

/** An options table (value → source label) with every label in the current language, for the selects that print the label as is. */
export const trRecord = <K extends string>(options: Record<K, string>): Record<K, string> =>
  Object.fromEntries((Object.entries(options) as [K, string][]).map(([key, label]) => [key, t(label)])) as Record<K, string>
