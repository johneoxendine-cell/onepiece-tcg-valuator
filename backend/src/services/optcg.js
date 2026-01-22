import axios from 'axios';

const API_BASE = 'https://optcgapi.com/api';

// Rate limiting - be respectful of the personal VPS
const REQUEST_DELAY_MS = 500;
let lastRequestTime = 0;

async function rateLimitedRequest(fn) {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  return fn();
}

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json'
  }
});

export const optcgAPI = {
  // Get all sets
  async getAllSets() {
    return rateLimitedRequest(async () => {
      const response = await client.get('/allSets/');
      return response.data;
    });
  },

  // Get all starter decks
  async getAllDecks() {
    return rateLimitedRequest(async () => {
      const response = await client.get('/allDecks/');
      return response.data;
    });
  },

  // Get all cards from a specific set
  async getSetCards(setId) {
    return rateLimitedRequest(async () => {
      const response = await client.get(`/sets/${setId}/`);
      return response.data;
    });
  },

  // Get all cards from a starter deck
  async getDeckCards(deckId) {
    return rateLimitedRequest(async () => {
      const response = await client.get(`/decks/${deckId}/`);
      return response.data;
    });
  },

  // Get a specific card by card_set_id (e.g., "OP01-001")
  async getCard(cardId) {
    return rateLimitedRequest(async () => {
      const response = await client.get(`/sets/card/${cardId}/`);
      return response.data;
    });
  },

  // Get all promo cards
  async getAllPromoCards() {
    return rateLimitedRequest(async () => {
      const response = await client.get('/allPromoCards/');
      return response.data;
    });
  },

  // Get all cards from all sets (use sparingly - large response)
  async getAllSetCards() {
    return rateLimitedRequest(async () => {
      const response = await client.get('/allSetCards/');
      return response.data;
    });
  },

  // Get all cards from all starter decks
  async getAllSTCards() {
    return rateLimitedRequest(async () => {
      const response = await client.get('/allSTCards/');
      return response.data;
    });
  },

  // Filter cards by various criteria
  async filterCards(filters = {}) {
    return rateLimitedRequest(async () => {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });
      const response = await client.get(`/sets/filtered/?${params.toString()}`);
      return response.data;
    });
  },

  // Get card with 2-week price history
  async getCardWithHistory(cardId) {
    return rateLimitedRequest(async () => {
      const response = await client.get(`/sets/card/twoweeks/${cardId}/`);
      return response.data;
    });
  }
};

// Helper to normalize OPTCG card data to match our schema
export function normalizeOPTCGCard(optcgCard) {
  return {
    card_set_id: optcgCard.card_set_id,
    card_name: optcgCard.card_name,
    card_text: optcgCard.card_text,
    card_type: optcgCard.card_type,
    card_color: optcgCard.card_color,
    card_cost: optcgCard.card_cost ? parseInt(optcgCard.card_cost) : null,
    card_power: optcgCard.card_power ? parseInt(optcgCard.card_power) : null,
    life: optcgCard.life ? parseInt(optcgCard.life) : null,
    counter_amount: optcgCard.counter_amount,
    attribute: optcgCard.attribute,
    sub_types: optcgCard.sub_types,
    optcg_image_url: optcgCard.card_image,
    optcg_rarity: optcgCard.rarity
  };
}

export default optcgAPI;
