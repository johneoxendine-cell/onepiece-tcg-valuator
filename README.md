# One Piece TCG Valuator

A web application for tracking over/undervalued One Piece TCG cards and calculating booster box expected values using the JustTCG API.

## Features

- **Card Valuation**: Identify undervalued and overvalued cards based on 30-day price averages
- **Booster Box EV**: Calculate expected value for booster boxes with pull rate estimates
- **Price Tracking**: View current prices, historical averages, and price trends
- **Filtering**: Browse cards by set, rarity, and valuation status

## Tech Stack

- **Backend**: Node.js, Express, SQLite (better-sqlite3)
- **Frontend**: React 18, Vite, Tailwind CSS, React Router
- **Data**: JustTCG API

## Setup

### Prerequisites

- Node.js 18+
- JustTCG API key (get one at https://justtcg.com)

### Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add your JUSTTCG_API_KEY
npm run dev
```

The backend will start on http://localhost:3001

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

The frontend will start on http://localhost:5173

## API Endpoints

### Cards
- `GET /api/cards` - List cards with filters (set_id, rarity, valuation, sort, order)
- `GET /api/cards/:id` - Get single card with variants and price history
- `GET /api/cards/meta/rarities` - Get all unique rarities

### Sets
- `GET /api/sets` - List all One Piece sets
- `GET /api/sets/:id` - Get set details with valuation summary
- `GET /api/sets/:id/ev` - Get EV analysis for a set (optional: box_price query param)
- `GET /api/sets/:id/cards` - Get all cards in a set

### Valuation
- `GET /api/valuation/undervalued` - Get top undervalued cards
- `GET /api/valuation/overvalued` - Get top overvalued cards
- `GET /api/valuation/summary` - Get overall market summary
- `GET /api/valuation/trending` - Get cards with biggest price changes

### Sync
- `POST /api/sync/trigger` - Manually trigger data sync

## Valuation Logic

Cards are considered:
- **Undervalued**: Current price is 15%+ below 30-day average
- **Overvalued**: Current price is 15%+ above 30-day average
- **Fair Value**: Within 15% of 30-day average

## Pull Rate Estimates

Per booster box (24 packs):
| Rarity | Est. Pulls per Box |
|--------|-------------------|
| Leader | 1 (starter deck) |
| Secret Rare (SEC) | ~0.4 |
| Super Rare (SR) | ~6 |
| Rare (R) | ~24 |
| Uncommon (UC) | ~72 |
| Common (C) | ~144 |

## Rate Limits

The JustTCG free tier allows:
- 100 requests/day
- 10 requests/minute
- 1000 requests/month

The sync service implements rate limiting with 6-second delays between requests and daily quota tracking.

## Environment Variables

### Backend (.env)
```
JUSTTCG_API_KEY=your_api_key_here
PORT=3001
DATABASE_PATH=./data/onepiece.db
SYNC_SCHEDULE=0 6 * * *
```

### Frontend (.env)
```
VITE_API_URL=http://localhost:3001/api
```

## License

MIT
