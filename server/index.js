const express = require('express');
const cors = require('cors');
const TrendTracker = require('./trendTracker');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize trend tracker
const trendTracker = new TrendTracker();

// Middleware
app.use(cors());
app.use(express.json());

// Sample trends data (in a real app, this would come from a database)
const sampleTrends = [
  {
    id: 1,
    title: 'Artificial Intelligence',
    category: 'Technology',
    popularity: 95,
    growth: 12.5,
    description: 'AI continues to dominate tech discussions',
  },
  {
    id: 2,
    title: 'Sustainable Living',
    category: 'Lifestyle',
    popularity: 78,
    growth: 8.3,
    description: 'Growing interest in eco-friendly practices',
  },
  {
    id: 3,
    title: 'Remote Work',
    category: 'Business',
    popularity: 85,
    growth: -2.1,
    description: 'Remote work trends stabilizing post-pandemic',
  },
];

// Routes
app.get('/', (req, res) => {
  res.json({ message: 'Trend Finder API is running!' });
});

app.get('/api/trends', (req, res) => {
  res.json({
    success: true,
    data: sampleTrends,
    count: sampleTrends.length,
  });
});

app.get('/api/trends/:id', (req, res) => {
  const trendId = parseInt(req.params.id);
  const trend = sampleTrends.find((t) => t.id === trendId);

  if (!trend) {
    return res.status(404).json({
      success: false,
      message: 'Trend not found',
    });
  }

  res.json({
    success: true,
    data: trend,
  });
});

app.get('/api/trends/category/:category', (req, res) => {
  const category = req.params.category;
  const filteredTrends = sampleTrends.filter(
    (t) => t.category.toLowerCase() === category.toLowerCase()
  );

  res.json({
    success: true,
    data: filteredTrends,
    count: filteredTrends.length,
  });
});

// Advanced trend tracking endpoints
app.get('/api/live-trends', async (req, res) => {
  try {
    console.log('🔍 Fetching live trends from multiple sources...');
    const trendData = await trendTracker.run();

    res.json({
      success: true,
      data: trendData,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching live trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch live trends',
      error: error.message,
    });
  }
});

app.get('/api/live-trends/news', async (req, res) => {
  try {
    const [gnews, mediastack] = await Promise.all([
      trendTracker.fetchGNews(),
      trendTracker.fetchMediaStack(),
    ]);

    const allNews = [...gnews, ...mediastack].sort((a, b) => b.score - a.score);

    res.json({
      success: true,
      data: allNews,
      count: allNews.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch news trends',
      error: error.message,
    });
  }
});

app.get('/api/live-trends/youtube', async (req, res) => {
  try {
    const youtubeData = await trendTracker.fetchYouTubeTrending();

    res.json({
      success: true,
      data: youtubeData.sort((a, b) => b.score - a.score),
      count: youtubeData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch YouTube trends',
      error: error.message,
    });
  }
});

app.get('/api/live-trends/twitter', async (req, res) => {
  try {
    const twitterData = await trendTracker.fetchTwitterTrends();

    res.json({
      success: true,
      data: twitterData.sort((a, b) => b.score - a.score),
      count: twitterData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Twitter trends',
      error: error.message,
    });
  }
});

app.get('/api/live-trends/google', async (req, res) => {
  try {
    const googleTrendsData = await trendTracker.fetchGoogleTrends();

    res.json({
      success: true,
      data: googleTrendsData.sort((a, b) => b.score - a.score),
      count: googleTrendsData.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Google trends',
      error: error.message,
    });
  }
});

app.get('/api/live-trends/reddit', async (req, res) => {
  try {
    const redditData = await trendTracker.scrapeRedditTrends();

    res.json({
      success: true,
      data: redditData.sort((a, b) => b.score - a.score),
      count: redditData.length,
      timestamp: new Date().toISOString(),
      meta: {
        subreddits: ['r/india', 'r/worldnews', 'r/unpopularopinion'],
        timeframe: 'Last 12 hours',
        criteria: 'High upvote ratio, growing comments',
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch Reddit trends',
      error: error.message,
    });
  }
});

// AI-powered cross-matched themes endpoint
app.get('/api/live-trends/themes', async (req, res) => {
  try {
    console.log('🤖 Fetching AI-powered cross-matched themes...');

    // Fetch data from all sources
    const [
      newsGNews,
      newsMediaStack,
      youtubeData,
      googleTrendsData,
      twitterData,
      redditData,
    ] = await Promise.all([
      trendTracker.fetchGNews(),
      trendTracker.fetchMediaStack(),
      trendTracker.fetchYouTubeTrending(),
      trendTracker.fetchGoogleTrends(),
      trendTracker.fetchTwitterTrends(),
      trendTracker.scrapeRedditTrends(),
    ]);

    const allNewsData = [...newsGNews, ...newsMediaStack];

    // Get AI-powered cross-matched themes
    const crossMatchedThemes = await trendTracker.crossMatchTopics(
      allNewsData,
      youtubeData,
      googleTrendsData,
      twitterData,
      redditData
    );

    res.json({
      success: true,
      data: crossMatchedThemes,
      count: crossMatchedThemes.length,
      timestamp: new Date().toISOString(),
      meta: {
        method:
          crossMatchedThemes.length > 0 && crossMatchedThemes[0].aiGenerated
            ? 'OpenAI GPT-3.5-turbo'
            : 'Manual keyword matching',
        totalAnalyzed:
          allNewsData.length +
          youtubeData.length +
          googleTrendsData.length +
          twitterData.length +
          redditData.length,
        themesFound: crossMatchedThemes.length,
        criteria: [
          'Same events described differently',
          'Related topics',
          'Common personalities',
          'Similar incidents',
          'Trending subjects',
        ],
      },
    });
  } catch (error) {
    console.error('Error fetching cross-matched themes:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch cross-matched themes',
      error: error.message,
    });
  }
});

// AI-powered viral content sorting endpoint
app.get('/api/live-trends/viral', async (req, res) => {
  try {
    console.log('🤖 Fetching AI-powered viral content...');

    // Fetch data from all sources
    const [
      newsGNews,
      newsMediaStack,
      youtubeData,
      googleTrendsData,
      twitterData,
      redditData,
    ] = await Promise.all([
      trendTracker.fetchGNews(),
      trendTracker.fetchMediaStack(),
      trendTracker.fetchYouTubeTrending(),
      trendTracker.fetchGoogleTrends(),
      trendTracker.fetchTwitterTrends(),
      trendTracker.scrapeRedditTrends(),
    ]);

    const allNewsData = [...newsGNews, ...newsMediaStack];

    // Get AI-sorted viral content
    const viralContent = await trendTracker.sortViral(
      allNewsData,
      youtubeData,
      googleTrendsData,
      twitterData,
      redditData
    );

    res.json({
      success: true,
      data: viralContent,
      count: viralContent.length,
      timestamp: new Date().toISOString(),
      meta: {
        method:
          viralContent.length > 0 && viralContent[0].aiSelected
            ? 'OpenAI GPT-3.5-turbo'
            : 'Manual viral scoring',
        totalAnalyzed:
          allNewsData.length +
          youtubeData.length +
          googleTrendsData.length +
          twitterData.length +
          redditData.length,
        viralSelected: viralContent.length,
        criteria: [
          'Breaking news impact',
          'Controversy potential',
          'Celebrity/entertainment value',
          'Emotional impact',
          'Social shareability',
          'Indian relevance',
        ],
      },
    });
  } catch (error) {
    console.error('Error fetching viral content:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch viral content',
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📊 Trend Finder API available at http://localhost:${PORT}`);
  console.log(`🔥 Advanced Trend Tracker endpoints available:`);
  console.log(`   GET /api/live-trends - Complete trend analysis`);
  console.log(`   GET /api/live-trends/news - News trends only`);
  console.log(`   GET /api/live-trends/twitter - Twitter trends only`);
  console.log(`   GET /api/live-trends/youtube - YouTube trends only`);
  console.log(`   GET /api/live-trends/google - Google trends only`);
  console.log(`   GET /api/live-trends/reddit - Reddit trending posts only`);
  console.log(
    `   GET /api/live-trends/themes - 🤖 AI-powered cross-matched themes`
  );
  console.log(
    `   GET /api/live-trends/viral - 🤖 AI-powered viral content sorting`
  );
});
