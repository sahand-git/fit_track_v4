/**
 * Formats food serving size with gram weight, preventing duplicate grams text like '1 plate (250g) (250g)'.
 */
export function formatServingWithGrams(
  servingSize?: string | null,
  servingGrams?: number | null,
  servingsCount: number = 1
): string {
  const baseSize = servingSize?.trim() || '';
  const totalGrams = typeof servingGrams === 'number' && !isNaN(servingGrams)
    ? Math.round(servingGrams * servingsCount)
    : 100 * servingsCount;

  if (!baseSize) {
    return servingsCount === 1
      ? `1 serving (${totalGrams}g)`
      : `${servingsCount} servings (${totalGrams}g)`;
  }

  // Check if baseSize already has gram info like "(250g)" or "250g" or "(250 g)"
  const hasGramsInSize = /\(\s*\d+\s*g\s*\)/i.test(baseSize) || /\b\d+\s*g\b/i.test(baseSize);

  if (servingsCount === 1) {
    if (hasGramsInSize) {
      return baseSize;
    }
    return `${baseSize} (${totalGrams}g)`;
  }

  // For multi-servings (e.g. servingsCount = 2)
  if (hasGramsInSize) {
    // Strip inner grams if scaling or format cleanly e.g. "2 × 1 plate (500g)"
    const cleanedSize = baseSize.replace(/\s*\(\s*\d+\s*g\s*\)/i, '').trim();
    return `${servingsCount} × ${cleanedSize || baseSize} (${totalGrams}g)`;
  }

  return `${servingsCount} × ${baseSize} (${totalGrams}g)`;
}
