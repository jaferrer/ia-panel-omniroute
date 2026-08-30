/**
 * Combo access resolution — shared between request-time enforcement
 * (apiKeyPolicy.ts) and catalog listing (lib/db/apiKeys.ts).
 *
 * A key's `allowedCombos` rules only make sense for requests that target a
 * combo. This module resolves whether a given model string names a combo
 * and, if so, whether a key's `allowedCombos` rules permit it.
 *
 * @module shared/utils/comboAccess
 */

import { getComboByName } from "@/lib/db/combos";
import { resolveComboForModel } from "@/lib/db/modelComboMappings";
import { ALL_COMBOS_ACCESS_RULE } from "@/shared/constants/comboAccess";

export function normalizeComboAccessName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.startsWith("combo/") ? trimmed.slice(6).trim() || trimmed : trimmed;
}

export function matchesComboAccessRule(
  comboName: string,
  requestedModel: string,
  rule: string
): boolean {
  if (rule === ALL_COMBOS_ACCESS_RULE) return true;
  const normalizedRule = normalizeComboAccessName(rule);
  if (!normalizedRule) return false;
  return (
    normalizedRule === comboName ||
    rule === requestedModel ||
    `combo/${normalizedRule}` === requestedModel
  );
}

/** Resolve a requested model string to its combo name, if it names one. */
export async function resolveRequestedComboName(modelStr: string): Promise<string | null> {
  const exact = await getComboByName(modelStr);
  if (exact && typeof exact.name === "string") return exact.name;

  if (modelStr.startsWith("combo/")) {
    const withoutPrefix = modelStr.slice(6);
    const prefixed = await getComboByName(withoutPrefix);
    if (prefixed && typeof prefixed.name === "string") return prefixed.name;
  }

  const mapped = await resolveComboForModel(modelStr);
  const mappedName = normalizeComboAccessName(mapped?.name);
  return mappedName;
}

/**
 * True if `modelStr` does not name a combo (not this policy's concern), or
 * names a combo permitted by one of `allowedCombos`.
 */
export async function isComboAllowedForKey(
  allowedCombos: string[],
  modelStr: string
): Promise<{ allowed: boolean; comboName: string | null }> {
  const comboName = await resolveRequestedComboName(modelStr);
  if (!comboName) return { allowed: true, comboName: null };

  const allowed = allowedCombos.some((rule) => matchesComboAccessRule(comboName, modelStr, rule));
  return { allowed, comboName };
}
