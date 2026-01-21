import axios from 'axios';

const API_BASE = 'https://api.justtcg.com/v1';
const API_KEY = process.env.JUSTTCG_API_KEY;

// Rate limiting: 10 requests/minute, 100/day
const REQUEST_DELAY_MS = 6000; // 6 seconds between requests
let lastRequestTime = 0;
let dailyRequestCount = 0;
let dailyRequestReset = Date.now();

// Reset daily counter at midnight
function checkDailyReset() {
  const now = Date.now();
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);

  if (dailyRequestReset < midnight.getTime()) {
    dailyRequestCount = 0;
    dailyRequestReset = now;
  }
}

async function rateLimitedRequest(fn) {
  checkDailyReset();

  if (dailyRequestCount >= 100) {
    throw new Error('Daily API limit reached (100 requests)');
  }

  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < REQUEST_DELAY_MS) {
    await new Promise(resolve =>
      setTimeout(resolve, REQUEST_DELAY_MS - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();
  dailyRequestCount++;

  return fn();
}

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    'X-Api-Key': API_KEY,
    'Content-Type': 'application/json'
  }
});

// Add response interceptor for error handling
client.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 429) {
      console.error('Rate limit exceeded');
    }
    throw error;
  }
);

// Helper to extract data from API response
function extractData(response) {
  if (Array.isArray(response.data)) {
    return response.data;
  } else if (response.data && Array.isArray(response.data.data)) {
    return response.data.data;
  } else if (response.data && response.data.sets) {
    return response.data.sets;
  } else if (response.data && response.data.cards) {
    return response.data.cards;
  }
  return response.data;
}

export const justTCG = {
  // Get all games
  async getGames() {
    return rateLimitedRequest(async () => {
      const response = await client.get('/games');
      return extractData(response);
    });
  },

  // Get One Piece game specifically
  async getOnePieceGame() {
    const games = await this.getGames();
    return games.find(g =>
      g.name.toLowerCase().includes('one piece') ||
      g.id === 'one-piece-card-game'
    );
  },

  // Get sets for a game
  async getSets(gameId) {
    return rateLimitedRequest(async () => {
      console.log(`Fetching sets for game: ${gameId}`);
      // Use /sets endpoint with game filter
      const response = await client.get(`/sets`, {
        params: { game: gameId }
      });
      const sets = extractData(response);
      console.log(`Found ${Array.isArray(sets) ? sets.length : 'N/A'} sets for ${gameId}`);
      return sets;
    });
  },

  // Get cards for a set
  async getSetCards(setId) {
    return rateLimitedRequest(async () => {
      console.log(`Fetching cards for set: ${setId}`);
      // Use /cards endpoint with set filter and include price history/statistics
      const response = await client.get(`/cards`, {
        params: { 
          set: setId,
          include_price_history: true,
          include_statistics: '7d,30d,90d',
          priceHistoryDuration: '90d'
        }
      });
      const cards = extractData(response);
      console.log(`Found ${Array.isArray(cards) ? cards.length : 'N/A'} cards for set ${setId}`);
      return cards;
    });
  },

  // Batch get card prices (up to 20 cards per request)
  async batchGetCards(cardIds) {
    if (cardIds.length > 20) {
      throw new Error('Batch request limited to 20 cards');
    }

    return rateLimitedRequest(async () => {
      const response = await client.post('/cards', { 
        ids: cardIds
      }, {
        params: {
          include_price_history: true,
          include_statistics: '7d,30d,90d',
          priceHistoryDuration: '90d'
        }
      });
      return extractData(response);
    });
  },

  // Get single card with full details
  async getCard(cardId) {
    return rateLimitedRequest(async () => {
      const response = await client.get(`/cards/${cardId}`, {
        params: {
          include_price_history: true,
          include_statistics: '7d,30d,90d',
          priceHistoryDuration: '90d'
        }
      });
      return response.data;
    });
  },

  // Get current rate limit status
  getRateLimitStatus() {
    checkDailyReset();
    return {
      dailyRemaining: 100 - dailyRequestCount,
      dailyUsed: dailyRequestCount,
      nextRequestAvailable: Math.max(0, REQUEST_DELAY_MS - (Date.now() - lastRequestTime))
    };
  }
};

export default justTCG;
