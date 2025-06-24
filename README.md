# Trend Finder POC

A proof-of-concept application for finding and tracking trends across different categories. Built with Node.js (Express) for the backend API and Vue.js for the frontend.

## Features

- 📊 **Real-time Data**: Get up-to-date information on trending topics
- 🏷️ **Category Filtering**: Filter trends by technology, lifestyle, business, and more
- 📈 **Growth Tracking**: Monitor trend growth and popularity over time
- 🎨 **Modern UI**: Beautiful and responsive user interface
- 🔌 **REST API**: Clean API endpoints for trend data

## Tech Stack

### Backend

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **CORS** - Cross-origin resource sharing
- **dotenv** - Environment variables management

### Frontend

- **Vue.js 3** - Frontend framework
- **Vue Router** - Client-side routing
- **Pinia** - State management
- **Axios** - HTTP client
- **Vite** - Build tool and dev server

## Project Structure

```
poc_trend_finder/
├── server/                 # Node.js backend
│   ├── index.js           # Express server
│   ├── package.json       # Server dependencies
│   └── .env              # Environment variables
├── client/                # Vue.js frontend
│   ├── src/
│   │   ├── components/    # Vue components
│   │   ├── views/         # Page components
│   │   ├── router/        # Vue Router config
│   │   ├── App.vue        # Main app component
│   │   └── main.js        # App entry point
│   ├── index.html         # HTML template
│   ├── vite.config.js     # Vite configuration
│   └── package.json       # Client dependencies
├── package.json           # Root package.json with scripts
└── README.md             # This file
```

## API Endpoints

### Basic Endpoints

- `GET /` - API status
- `GET /api/trends` - Get all trends (sample data)
- `GET /api/trends/:id` - Get specific trend by ID
- `GET /api/trends/category/:category` - Get trends by category

### Advanced Live Trend Tracking (New!)

- `GET /api/live-trends` - Complete live trend analysis from all sources
- `GET /api/live-trends/news` - Live news trends (GNews + MediaStack)
- `GET /api/live-trends/youtube` - YouTube trending videos (India)
- `GET /api/live-trends/google` - Google Trends (India)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

1. **Clone or navigate to the project directory:**

   ```bash
   cd poc_trend_finder
   ```

2. **Install all dependencies (root, server, and client):**

   ```bash
   npm run install-all
   ```

3. **Set up API keys for live trend tracking (optional):**
   Create a `.env` file in the `server/` directory:

   ```bash
   # server/.env
   PORT=3001
   NODE_ENV=development

   # Get your API keys from:
   GNEWS_API_KEY=your_gnews_api_key          # https://gnews.io/
   MEDIASTACK_API_KEY=your_mediastack_key    # https://mediastack.com/
   YOUTUBE_API_KEY=your_youtube_api_key      # https://console.developers.google.com/
   ```

   > **Note**: The app will work without API keys, but live trend tracking features will show placeholder messages.

### Development

1. **Start both server and client in development mode:**

   ```bash
   npm run dev
   ```

   This will start:

   - Backend server on `http://localhost:3001`
   - Frontend dev server on `http://localhost:3000`

2. **Or run them separately:**

   ```bash
   # Terminal 1 - Start the server
   npm run server

   # Terminal 2 - Start the client
   npm run client
   ```

### Manual Setup (Alternative)

If you prefer to set up manually:

1. **Install root dependencies:**

   ```bash
   npm install
   ```

2. **Setup server:**

   ```bash
   cd server
   npm install
   npm run dev
   ```

3. **Setup client (in a new terminal):**
   ```bash
   cd client
   npm install
   npm run dev
   ```

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Explore the home page to learn about the features
3. Click "Explore Trends" or navigate to the "Trends" page
4. Filter trends by category using the filter buttons
5. View detailed information about each trend including popularity and growth metrics

## Sample Data

The application includes sample trend data for:

- **Technology**: Artificial Intelligence
- **Lifestyle**: Sustainable Living
- **Business**: Remote Work

In a production environment, this data would be replaced with real-time data from external APIs or databases.

## Customization

### Adding New Trends

Edit the `sampleTrends` array in `server/index.js` to add new trend data.

### Styling

- Global styles: `client/src/style.css`
- Component-specific styles: Located in each Vue component's `<style>` section

### API Configuration

- Server port: Change `PORT` in `server/.env`
- API proxy: Update `client/vite.config.js` proxy settings

## Building for Production

```bash
npm run build
```

This will create a `dist` folder in the client directory with the built application.

## Contributing

This is a POC project. Feel free to fork and modify according to your needs.

## License

MIT
# trend-finder
