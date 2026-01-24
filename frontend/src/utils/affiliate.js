// TCGPlayer affiliate link generator
const IMPACT_PARTNER_ID = '6909338';
const IMPACT_CAMPAIGN_ID = '1830156';
const IMPACT_AD_ID = '21018';

/**
 * Generate a TCGPlayer affiliate link for a product
 * @param {string|number} tcgplayerId - The TCGPlayer product ID
 * @returns {string} The full affiliate tracking URL
 */
export function getTcgPlayerAffiliateLink(tcgplayerId) {
  if (!tcgplayerId) return null;

  const tcgplayerUrl = `https://www.tcgplayer.com/product/${tcgplayerId}`;
  const encodedUrl = encodeURIComponent(tcgplayerUrl);

  return `https://partner.tcgplayer.com/c/${IMPACT_PARTNER_ID}/${IMPACT_CAMPAIGN_ID}/${IMPACT_AD_ID}?u=${encodedUrl}`;
}

/**
 * Generate a TCGPlayer search affiliate link
 * @param {string} searchQuery - The search query
 * @returns {string} The full affiliate tracking URL
 */
export function getTcgPlayerSearchLink(searchQuery) {
  const tcgplayerUrl = `https://www.tcgplayer.com/search/one-piece-card-game/product?q=${encodeURIComponent(searchQuery)}`;
  const encodedUrl = encodeURIComponent(tcgplayerUrl);

  return `https://partner.tcgplayer.com/c/${IMPACT_PARTNER_ID}/${IMPACT_CAMPAIGN_ID}/${IMPACT_AD_ID}?u=${encodedUrl}`;
}
