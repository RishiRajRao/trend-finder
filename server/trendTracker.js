const axios = require('axios');
const { google } = require('googleapis');
const googleTrends = require('google-trends-api');
const cheerio = require('cheerio');
require('dotenv').config();

class TrendTracker {
  constructor() {
    this.gnewsApiKey = process.env.GNEWS_API_KEY;
    this.mediastackApiKey = process.env.MEDIASTACK_API_KEY;
    this.youtubeApiKey = process.env.YOUTUBE_API_KEY;

    // Initialize YouTube API
    this.youtube = google.youtube({
      version: 'v3',
      auth: this.youtubeApiKey,
    });

    // Tier 1 news sources for bonus scoring
    this.tier1Sources = [
      'timesofindia.indiatimes.com',
      'moneycontrol.com',
      'hindustantimes.com',
      'indianexpress.com',
      'ndtv.com',
      'economictimes.indiatimes.com',
      'business-standard.com',
      'livemint.com',
    ];

    // Viral keywords for scoring
    this.viralKeywords = [
      'viral',
      'trending',
      'comeback',
      'surge',
      'trolled',
      'controversy',
      'backlash',
      'outrage',
      'sensation',
      'buzz',
      'breaking',
      'exclusive',
      'shocking',
      'massive',
      'epic',
      'incredible',
      'amazing',
      'stunning',
    ];

    // Twitter hashtag indicators for bonus scoring
    this.twitterIndicators = ['#', '@', 'trending', 'hashtag'];
  }

  // Score headlines based on viral keywords and source
  scoreHeadline(headline, source) {
    let score = 0;
    const headlineLower = headline.toLowerCase();

    // Base scoring for viral keywords
    this.viralKeywords.forEach((keyword) => {
      if (headlineLower.includes(keyword)) {
        score += 10;
      }
    });

    // Bonus points for Tier 1 sources
    if (this.tier1Sources.some((tier1) => source.includes(tier1))) {
      score += 10;
    }

    // Additional scoring factors
    if (headlineLower.includes('india') || headlineLower.includes('indian')) {
      score += 5;
    }

    return score;
  }

  // Fetch news from GNews API
  async fetchGNews() {
    try {
      if (!this.gnewsApiKey || this.gnewsApiKey === 'your_gnews_api_key_here') {
        console.log('⚠️ GNews API key not configured');
        return [];
      }

      const response = await axios.get(
        'https://gnews.io/api/v4/top-headlines',
        {
          params: {
            token: this.gnewsApiKey,
            country: 'in',
            lang: 'en',
            category: 'general', // Focus on general news, not entertainment
            max: 15,
          },
        }
      );

      return response.data.articles.map((article) => ({
        title: article.title,
        description: article.description,
        source: article.source.name,
        url: article.url,
        publishedAt: article.publishedAt,
        score: this.scoreHeadline(article.title, article.source.url || ''),
        api: 'GNews',
      }));
    } catch (error) {
      console.error('❌ Error fetching GNews:', error.message);
      return [];
    }
  }

  // Fetch news from MediaStack API
  async fetchMediaStack() {
    try {
      if (
        !this.mediastackApiKey ||
        this.mediastackApiKey === 'your_mediastack_api_key_here'
      ) {
        console.log('⚠️ MediaStack API key not configured');
        return [];
      }

      const response = await axios.get('http://api.mediastack.com/v1/news', {
        params: {
          access_key: this.mediastackApiKey,
          countries: 'in',
          languages: 'en',
          sort: 'popularity', // Sort by popularity for viral content
          categories: 'general,entertainment,sports,technology', // Focus on viral categories
          keywords:
            'viral,trending,breaking,popular,watch,latest,exclusive,video,shares,social media', // Target viral keywords
          limit: 15,
        },
      });

      return response.data.data.map((article) => ({
        title: article.title,
        description: article.description,
        source: article.source,
        url: article.url,
        publishedAt: article.published_at,
        score: this.scoreHeadline(article.title, article.source || ''),
        api: 'MediaStack',
      }));
    } catch (error) {
      console.error('❌ Error fetching MediaStack:', error.message);
      return [];
    }
  }

  // Fetch trending YouTube videos (India)
  async fetchYouTubeTrending() {
    try {
      if (
        !this.youtubeApiKey ||
        this.youtubeApiKey === 'your_youtube_api_key_here'
      ) {
        console.log('⚠️ YouTube API key not configured');
        return [];
      }

      // Get videos from last 12 hours that are trending/viral
      const twelveHoursAgo = new Date(
        Date.now() - 12 * 60 * 60 * 1000
      ).toISOString();

      const response = await this.youtube.search.list({
        part: 'snippet',
        type: 'video',
        regionCode: 'IN',
        relevanceLanguage: 'hi', // Prioritize Hindi content
        publishedAfter: twelveHoursAgo, // Only videos from last 12 hours
        order: 'viewCount', // Sort by views for viral content
        videoDuration: 'short', // Only YouTube Shorts (under 60 seconds)
        maxResults: 50, // Get more to filter for viral ones
        q: 'breaking news OR latest news OR viral news OR trending news OR india news OR hindi news OR politics OR government OR minister OR parliament OR election OR protest OR scam OR corruption OR arrest OR court OR crime OR police OR market OR stock OR sensex OR nifty OR business OR economy OR budget OR tax OR price OR petrol OR diesel OR gas OR electricity OR salary OR job OR scheme OR yojana OR rbi OR inflation OR ipo OR company OR startup', // General news-focused keywords
      });

      if (!response.data.items || response.data.items.length === 0) {
        console.log(
          '🔄 No recent viral videos found, falling back to mostPopular...'
        );
        // Fallback to original method if no recent viral content
        const fallbackResponse = await this.youtube.videos.list({
          part: 'snippet,statistics',
          chart: 'mostPopular',
          regionCode: 'IN',
          maxResults: 10,
        });
        return fallbackResponse.data.items.map((video) => ({
          title: video.snippet.title,
          channel: video.snippet.channelTitle,
          views: parseInt(video.statistics.viewCount),
          url: `https://www.youtube.com/watch?v=${video.id}`,
          publishedAt: video.snippet.publishedAt,
          score: this.scoreHeadline(
            video.snippet.title,
            video.snippet.channelTitle || ''
          ),
          category: video.snippet.categoryId,
          timeframe: 'Overall Popular (Fallback)',
        }));
      }

      // Get detailed statistics for the recent videos
      const videoIds = response.data.items
        .map((item) => item.id.videoId)
        .join(',');
      const statsResponse = await this.youtube.videos.list({
        part: 'statistics',
        id: videoIds,
      });

      // Combine search results with statistics
      const videosWithStats = response.data.items.map((video, index) => {
        const stats = statsResponse.data.items[index]?.statistics || {};
        return {
          title: video.snippet.title,
          channel: video.snippet.channelTitle,
          views: parseInt(stats.viewCount || 0),
          url: `https://www.youtube.com/watch?v=${video.id.videoId}`,
          publishedAt: video.snippet.publishedAt,
          score: this.scoreHeadline(
            video.snippet.title,
            video.snippet.channelTitle || ''
          ),
          category: video.snippet.categoryId,
          timeframe: 'Last 12 Hours',
        };
      });

      // Check if channel/content is Indian adult news content
      const isIndianAdultNewsContent = (video) => {
        const title = video.title.toLowerCase();
        const channel = video.channel.toLowerCase();

        // Filter out children/family/entertainment content
        const childrenKeywords = [
          'kids',
          'children',
          'baby',
          'toddler',
          'cartoon',
          'nursery',
          'rhyme',
          'family',
          'mom',
          'dad',
          'papa',
          'mama',
          'bhai',
          'sister',
          'brother',
          'cute',
          'funny baby',
          'child',
          'bachcha',
          'बच्चा',
          'परिवार',
          'cooking',
          'recipe',
          'food',
          'kitchen',
          'dance',
          'music',
          'song',
          'comedy',
          'funny',
          'entertainment',
          'vlogs',
          'lifestyle',
          'games',
          'tutorial',
          'tech review',
          'unboxing',
          'reaction',
          'masti',
          'mazak',
          'हंसी',
          'मजाक',
          'गाना',
          'डांस',
          'खाना',
          'रेसिपी',
        ];

        const hasChildrenContent = childrenKeywords.some(
          (keyword) => title.includes(keyword) || channel.includes(keyword)
        );

        if (hasChildrenContent) return false; // Exclude children/family content

        // Indian language indicators
        const hindiPattern = /[\u0900-\u097F]/; // Devanagari script
        const hasHindi =
          hindiPattern.test(video.title) || hindiPattern.test(video.channel);

        // News-focused Indian keywords
        const indianNewsKeywords = [
          'india',
          'indian',
          'hindi',
          'news',
          'breaking',
          'latest',
          'update',
          'politics',
          'government',
          'minister',
          'pm modi',
          'parliament',
          'election',
          'court',
          'supreme court',
          'high court',
          'judge',
          'legal',
          'law',
          'police',
          'crime',
          'arrest',
          'investigation',
          'case',
          'scam',
          'corruption',
          'protest',
          'rally',
          'strike',
          'demonstration',
          'controversy',
          'debate',
          'economy',
          'market',
          'stock',
          'share',
          'sensex',
          'nifty',
          'rupee',
          'dollar',
          'budget',
          'tax',
          'gst',
          'income tax',
          'policy',
          'rbi',
          'reserve bank',
          'inflation',
          'gdp',
          'recession',
          'growth',
          'investment',
          'mutual fund',
          'ipo',
          'trading',
          'crypto',
          'bitcoin',
          'gold',
          'silver',
          'commodity',
          'banking',
          'loan',
          'interest rate',
          'emi',
          'credit',
          'debit',
          'salary',
          'pension',
          'pf',
          'epf',
          'insurance',
          'sip',
          'fd',
          'fixed deposit',
          'business',
          'company',
          'startup',
          'unicorn',
          'ceo',
          'chairman',
          'profit',
          'loss',
          'revenue',
          'merger',
          'acquisition',
          'listing',
          'shares',
          'adani',
          'ambani',
          'tata',
          'reliance',
          'infosys',
          'wipro',
          'industry',
          'petrol',
          'diesel',
          'lpg',
          'gas',
          'electricity',
          'power',
          'water',
          'railway',
          'train',
          'metro',
          'transport',
          'fuel',
          'price',
          'rate',
          'subsidy',
          'scheme',
          'yojana',
          'benefit',
          'welfare',
          'health',
          'education',
          'job',
          'employment',
          'unemployment',
          'salary hike',
          'internet',
          'mobile',
          'telecom',
          'jio',
          'airtel',
          'vi',
          'broadband',
          'upi',
          'digital',
          'online',
          'app',
          'technology',
          'ai',
          'delhi',
          'mumbai',
          'kolkata',
          'chennai',
          'bengaluru',
          'hyderabad',
          'punjab',
          'maharashtra',
          'gujarat',
          'rajasthan',
          'up',
          'bihar',
          'congress',
          'bjp',
          'aap',
          'tmc',
          'sp',
          'bsp',
          'party',
          'leader',
          'viral',
          'trending',
          'exposed',
          'shocking',
          'exclusive',
          'reality',
          'समाचार',
          'न्यूज़',
          'राजनीति',
          'सरकार',
          'मंत्री',
          'अदालत',
          'पुलिस',
          'बाजार',
          'शेयर',
          'पैसा',
          'रुपया',
          'व्यापार',
          'कंपनी',
          'नौकरी',
          'रोजगार',
          'वेतन',
          'पेट्रोल',
          'डीजल',
          'गैस',
          'बिजली',
          'पानी',
          'ट्रेन',
          'मेट्रो',
          'स्वास्थ्य',
          'शिक्षा',
          'योजना',
          'सब्सिडी',
        ];

        const hasNewsKeywords = indianNewsKeywords.some(
          (keyword) => title.includes(keyword) || channel.includes(keyword)
        );

        // Indian news channel patterns (including business & finance)
        const indianNewsChannelPatterns = [
          'news',
          'tv',
          'channel',
          'media',
          'press',
          'times',
          'today',
          'live',
          'update',
          'bulletin',
          'report',
          'journalist',
          'anchor',
          'hindi news',
          'bharat',
          'hindustan',
          'aaj tak',
          'zee news',
          'ndtv',
          'republic',
          'cnbc',
          'india tv',
          'abp',
          'news18',
          'business',
          'finance',
          'money',
          'market',
          'stock',
          'economic',
          'financial',
          'business today',
          'et now',
          'bloomberg',
          'moneycontrol',
          'mint',
        ];

        const hasNewsChannelPattern = indianNewsChannelPatterns.some(
          (pattern) => channel.includes(pattern)
        );

        // Must be Indian AND news-related AND not children content
        return (
          (hasHindi || hasNewsKeywords || hasNewsChannelPattern) &&
          !hasChildrenContent
        );
      };

      // Filter for viral Indian adult news Shorts
      const viralIndianNewsShorts = videosWithStats.filter((video) => {
        const isViral =
          video.views >= 3000 || // Lower threshold for news content
          video.title.toLowerCase().includes('viral') ||
          video.title.toLowerCase().includes('trending') ||
          video.title.toLowerCase().includes('breaking') ||
          video.title.toLowerCase().includes('news') ||
          video.title.toLowerCase().includes('exposed') ||
          video.title.toLowerCase().includes('shocking') ||
          video.title.toLowerCase().includes('market') ||
          video.title.toLowerCase().includes('stock') ||
          video.title.toLowerCase().includes('price') ||
          video.title.toLowerCase().includes('rate') ||
          video.title.toLowerCase().includes('budget') ||
          video.title.toLowerCase().includes('scheme') ||
          video.title.toLowerCase().includes('yojana') ||
          video.title.toLowerCase().includes('salary') ||
          video.title.toLowerCase().includes('job') ||
          video.title.toLowerCase().includes('petrol') ||
          video.title.toLowerCase().includes('diesel') ||
          video.title.toLowerCase().includes('gas') ||
          video.title.toLowerCase().includes('electricity');

        const isIndianNews = isIndianAdultNewsContent(video);

        return isViral && isIndianNews; // Must be both viral AND Indian news
      });

      // Sort by views and return top 10 viral Indian news Shorts
      console.log(
        `📰🇮🇳 Found ${viralIndianNewsShorts.length} viral Indian news Shorts from last 12 hours`
      );
      return viralIndianNewsShorts
        .sort((a, b) => b.views - a.views)
        .slice(0, 10);
    } catch (error) {
      console.error('❌ Error fetching YouTube trends:', error.message);
      return [];
    }
  }

  // Fetch Google Trends (India) with fallback scraping
  async fetchGoogleTrends() {
    try {
      // Try official API first
      const apiTrends = await this.fetchGoogleTrendsAPI();
      if (apiTrends.length > 0) {
        return apiTrends;
      }

      // Fallback to scraping
      console.log('🔄 Google Trends API failed, trying scraping fallback...');
      return await this.scrapeGoogleTrends();
    } catch (error) {
      console.error('❌ Error fetching Google Trends:', error.message);
      return [];
    }
  }

  // Try the official Google Trends API
  async fetchGoogleTrendsAPI() {
    try {
      const trendsData = await googleTrends.dailyTrends({
        trendDate: new Date(),
        geo: 'IN',
      });

      const parsed = JSON.parse(trendsData);
      const trends = parsed.default.trendingSearchesDays[0].trendingSearches;

      return trends.slice(0, 10).map((trend) => ({
        title: trend.title.query,
        traffic: trend.formattedTraffic,
        articles: trend.articles.map((article) => ({
          title: article.title,
          source: article.source,
          url: article.url,
        })),
        score: this.scoreHeadline(trend.title.query, ''),
        source: 'Google Trends API',
      }));
    } catch (error) {
      console.error('❌ Official Google Trends API failed:', error.message);
      return [];
    }
  }

  // Scrape Google Trends from public sources
  async scrapeGoogleTrends() {
    try {
      // Try trends24.in for Google trends
      const trends = await this.scrapeGoogleFromTrends24();
      if (trends.length > 0) {
        return trends;
      }

      // Fallback: try exploding-topics.com
      console.log('🔄 Trying exploding-topics.com for Google trends...');
      const explodingTrends = await this.scrapeGoogleFromExplodingTopics();
      if (explodingTrends.length > 0) {
        return explodingTrends;
      }

      // Final fallback: use curated trending topics
      console.log('🔄 Using curated trending topics as final fallback...');
      return this.getCuratedTrendingTopics();
    } catch (error) {
      console.error('❌ Error scraping Google Trends:', error.message);
      return this.getCuratedTrendingTopics();
    }
  }

  // Curated trending topics as final fallback
  getCuratedTrendingTopics() {
    const currentDate = new Date();
    const topics = [
      'India vs England Test Series 2025',
      'Indian Stock Market Hits All-Time High',
      'Delhi Air Pollution Crisis',
      'Bollywood Box Office Collections',
      'Modi Government Infrastructure Projects',
      'Indian Startup Unicorn Funding',
      'Ayodhya Tourism Boom',
      'ISRO Chandrayaan Mission Updates',
      'Indian Railway Expansion Plans',
      'Farmer Income Doubling Scheme',
      'Digital India Payment Revolution',
      'Indian IT Industry Growth',
    ];

    return topics.map((topic) => ({
      title: topic,
      traffic: 'Rising',
      source: 'India News Trends',
      score: this.scoreHeadline(topic, 'India'),
      articles: [],
      timestamp: currentDate.toISOString(),
    }));
  }

  // Scrape Google trends from trends24.in
  async scrapeGoogleFromTrends24() {
    try {
      const response = await axios.get('https://trends24.in/india/', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const trends = [];

      // Look for Google-related trending topics
      const selectors = [
        '.google-trends',
        '.search-trends',
        '[data-source="google"]',
        '.trending-searches',
        'div[class*="search"]',
      ];

      for (const selector of selectors) {
        $(selector)
          .find('a, span, div')
          .each((i, element) => {
            if (trends.length >= 15) return false;

            const text = $(element).text().trim();

            if (
              text &&
              text.length > 2 &&
              text.length < 100 &&
              !text.includes('Twitter') &&
              !text.includes('#')
            ) {
              const cleanText = text.replace(/^\d+\.?\s*/, '').trim();

              if (cleanText && !trends.some((t) => t.title === cleanText)) {
                trends.push({
                  title: cleanText,
                  traffic: 'High',
                  source: 'trends24.in (Google)',
                  score: this.scoreHeadline(cleanText, ''),
                  articles: [],
                });
              }
            }
          });

        if (trends.length >= 10) break;
      }

      console.log(`📈 Found ${trends.length} Google trends from trends24.in`);
      return trends.slice(0, 12);
    } catch (error) {
      console.error(
        '❌ Error scraping Google trends from trends24.in:',
        error.message
      );
      return [];
    }
  }

  // Scrape trending topics from India-focused news sources
  async scrapeGoogleFromExplodingTopics() {
    try {
      // Try multiple India-focused sources including viral/entertainment content
      const sources = [
        { url: 'https://www.indiatoday.in/trending-news', name: 'India Today' },
        {
          url: 'https://www.indiatoday.in/entertainment',
          name: 'India Today Entertainment',
        },
        {
          url: 'https://www.hindustantimes.com/entertainment',
          name: 'Hindustan Times Entertainment',
        },
        {
          url: 'https://timesofindia.indiatimes.com/etimes/trending',
          name: 'Times of India Etimes',
        },
        {
          url: 'https://indianexpress.com/section/trending/',
          name: 'Indian Express Trending',
        },
        { url: 'https://www.news18.com/trending', name: 'News18' },
        { url: 'https://www.news18.com/viral', name: 'News18 Viral' },
        {
          url: 'https://timesofindia.indiatimes.com/trending-topics',
          name: 'Times of India',
        },
        {
          url: 'https://www.hindustantimes.com/trending',
          name: 'Hindustan Times',
        },
        {
          url: 'https://www.republicworld.com/trending-news',
          name: 'Republic World',
        },
        {
          url: 'https://www.freepressjournal.in/viral',
          name: 'Free Press Journal',
        },
        { url: 'https://www.indiatv.in/viral', name: 'India TV Viral' },
        { url: 'https://www.dnaindia.com/viral', name: 'DNA India Viral' },
      ];

      let allTrends = [];

      for (const source of sources) {
        try {
          const trends = await this.scrapeNewsSourceTrends(
            source.url,
            source.name
          );
          if (trends.length > 0) {
            console.log(
              `📈 Found ${trends.length} trending topics from ${source.name}`
            );
            allTrends.push(...trends);
            if (allTrends.length >= 10) break; // Stop when we have enough trends
          }
        } catch (error) {
          console.log(`⚠️ Failed to scrape ${source.name}: ${error.message}`);
          continue;
        }
      }

      if (allTrends.length > 0) {
        // Remove duplicates and return top trends
        const uniqueTrends = allTrends.filter(
          (trend, index, self) =>
            index ===
            self.findIndex(
              (t) => t.title.toLowerCase() === trend.title.toLowerCase()
            )
        );
        return uniqueTrends.slice(0, 10);
      }

      // Try Reddit as last resort for viral content
      console.log('🔄 Trying Reddit for viral content...');
      const redditTrends = await this.scrapeRedditTrends();
      if (redditTrends.length > 0) {
        return redditTrends;
      }

      // If all sources fail, return enhanced curated topics
      console.log('🔄 Using enhanced curated trending topics...');
      return this.getRecentTrendingTopics();
    } catch (error) {
      console.error('❌ Error scraping trending topics:', error.message);
      return this.getRecentTrendingTopics();
    }
  }

  // Scrape trending topics from news source
  async scrapeNewsSourceTrends(url, sourceName) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        timeout: 8000,
      });

      const $ = cheerio.load(response.data);
      const trends = [];

      // Multiple selectors for different news sites
      const selectors = [
        'h1, h2, h3',
        '.trending-story',
        '.headline',
        '.story-title',
        '.news-title',
        '[class*="trend"]',
        '[class*="viral"]',
        '[class*="popular"]',
        '.top-story',
        '.breaking-news',
        '.story-card h3',
        '.article-title',
      ];

      for (const selector of selectors) {
        $(selector).each((i, element) => {
          if (trends.length >= 10) return false;

          const text = $(element).text().trim();
          const href =
            $(element).attr('href') || $(element).find('a').attr('href');

          if (this.isValidNewsHeadline(text)) {
            const cleanText = this.cleanNewsHeadline(text);

            if (
              cleanText &&
              !trends.some(
                (t) => t.title.toLowerCase() === cleanText.toLowerCase()
              )
            ) {
              trends.push({
                title: cleanText,
                traffic: 'Trending',
                source: sourceName,
                score: this.scoreHeadline(cleanText, sourceName),
                articles: [],
                url: href || url,
              });
            }
          }
        });

        if (trends.length >= 8) break;
      }

      return trends.slice(0, 8);
    } catch (error) {
      throw error;
    }
  }

  // Validate if text is a valid news headline
  isValidNewsHeadline(text) {
    if (!text || text.length < 15 || text.length > 200) return false;

    // Must contain news-worthy content including viral/entertainment
    const newsKeywords = [
      'india',
      'indian',
      'hindi',
      'desi',
      'government',
      'minister',
      'election',
      'court',
      'supreme',
      'parliament',
      'pm',
      'modi',
      'congress',
      'bjp',
      'covid',
      'vaccine',
      'economy',
      'rupee',
      'cricket',
      'ipl',
      'bollywood',
      'actor',
      'film',
      'movie',
      'celebrity',
      'star',
      'technology',
      'startup',
      'company',
      'market',
      'share',
      'price',
      'stock',
      'weather',
      'rain',
      'storm',
      'temperature',
      'flood',
      'drought',
      'festival',
      'celebration',
      'wedding',
      'death',
      'born',
      'award',
      'police',
      'arrest',
      'crime',
      'accident',
      'fire',
      'rescue',
      'school',
      'college',
      'university',
      'student',
      'exam',
      'result',
      // Viral/Entertainment keywords
      'viral',
      'trending',
      'youtube',
      'instagram',
      'twitter',
      'social',
      'comedian',
      'comedy',
      'meme',
      'funny',
      'video',
      'content',
      'creator',
      'influencer',
      'tiktoker',
      'youtuber',
      'samay',
      'raina',
      'latent',
      'tiger',
      'cubs',
      'kabaddi',
      'animal',
      'wildlife',
      'zoo',
      'forest',
      'entertainment',
      'show',
      'episode',
      'series',
      'web series',
      'ott',
      'netflix',
      'amazon',
      'hotstar',
      'zee5',
      'voot',
      'alt balaji',
      'gaming',
      'esports',
      'bgmi',
      'free fire',
      'pubg',
      'mobile',
      'music',
      'song',
      'singer',
      'album',
      'rap',
      'hip hop',
    ];

    const lowerText = text.toLowerCase();
    const hasNewsKeyword = newsKeywords.some((keyword) =>
      lowerText.includes(keyword)
    );

    // Filter out non-news content
    const excludePatterns = [
      /subscribe/i,
      /follow/i,
      /share/i,
      /like/i,
      /comment/i,
      /login/i,
      /advertisement/i,
      /sponsored/i,
      /promoted/i,
      /cookie/i,
      /privacy/i,
      /terms/i,
      /contact/i,
      /about/i,
      /home/i,
      /menu/i,
      /search/i,
      /^\d+$/,
      /^[^a-z]*$/i,
      /seo/i,
      /marketing/i,
      /template/i,
      /tool/i,
      /insight/i,
      /keyword/i,
      /audit/i,
      /traffic/i,
      /^how to/i,
    ];

    const isExcluded = excludePatterns.some((pattern) => pattern.test(text));

    return hasNewsKeyword && !isExcluded;
  }

  // Clean news headline
  cleanNewsHeadline(text) {
    return text
      .replace(/^\d+\.?\s*/, '') // Remove numbering
      .replace(/\s*\|\s*.*$/, '') // Remove source after |
      .replace(/\s+/g, ' ') // Normalize spaces
      .replace(/[^\w\s\-\''""]/g, ' ') // Remove special chars except quotes/hyphens
      .trim()
      .slice(0, 120); // Limit length
  }

  // Scrape Reddit India for viral content
  async scrapeRedditTrends() {
    try {
      // Enhanced subreddits with specific focus on trending posts
      const subreddits = [
        { name: 'india', url: 'https://www.reddit.com/r/india/hot/.json' },
        // {
        //   name: 'worldnews',
        //   url: 'https://www.reddit.com/r/worldnews/hot/.json',
        // },
        {
          name: 'unpopularopinion',
          url: 'https://www.reddit.com/r/unpopularopinion/hot/.json',
        },
        {
          name: 'india-rising',
          url: 'https://www.reddit.com/r/india/rising/.json',
        },
        {
          name: 'IndianDankMemes',
          url: 'https://www.reddit.com/r/IndianDankMemes/hot/.json',
        },
        {
          name: 'indiauncensored',
          url: 'https://www.reddit.com/r/indiauncensored/hot/.json',
        },
        {
          name: 'IndiaNews',
          url: 'https://www.reddit.com/r/IndiaNews/hot/.json',
        },
        {
          name: 'IndiaSpeaks',
          url: 'https://www.reddit.com/r/IndiaSpeaks/hot/.json',
        },
      ];

      const allTrends = [];
      const currentTime = Date.now();
      const twelveHoursAgo = currentTime - 12 * 60 * 60 * 1000; // 12 hours in milliseconds

      for (const subreddit of subreddits) {
        try {
          console.log(`🔍 Fetching trending posts from r/${subreddit.name}...`);

          const response = await axios.get(subreddit.url, {
            headers: {
              'User-Agent': 'TrendTracker/2.0 (by /u/TrendTracker)',
              Accept: 'application/json',
            },
            timeout: 10000,
          });

          if (
            response.data &&
            response.data.data &&
            response.data.data.children
          ) {
            const posts = response.data.data.children;

            // Filter and process posts
            posts.forEach((post) => {
              const postData = post.data;
              const postTime = postData.created_utc * 1000; // Convert to milliseconds

              // Check if post is within 12 hours
              if (postTime >= twelveHoursAgo) {
                const upvoteRatio = postData.upvote_ratio || 0;
                const upvotes = postData.ups || 0;
                const comments = postData.num_comments || 0;
                const title = postData.title;

                // Enhanced filtering criteria
                if (
                  this.isValidTrendingRedditPost(
                    title,
                    upvotes,
                    upvoteRatio,
                    comments
                  )
                ) {
                  const cleanTitle = this.cleanNewsHeadline(title);

                  // Avoid duplicates
                  if (
                    cleanTitle &&
                    !allTrends.some(
                      (t) => t.title.toLowerCase() === cleanTitle.toLowerCase()
                    )
                  ) {
                    const trendScore = this.scoreRedditTrend(
                      cleanTitle,
                      upvotes,
                      comments,
                      upvoteRatio,
                      subreddit.name
                    );

                    allTrends.push({
                      title: cleanTitle,
                      traffic: this.getRedditTrafficLevel(
                        upvotes,
                        comments,
                        upvoteRatio
                      ),
                      source: `Reddit r/${subreddit.name}`,
                      score: trendScore,
                      url: `https://www.reddit.com${postData.permalink}`,
                      upvotes: upvotes,
                      comments: comments,
                      upvoteRatio: upvoteRatio,
                      subreddit: subreddit.name,
                      hoursAgo: Math.round(
                        (currentTime - postTime) / (60 * 60 * 1000)
                      ),
                      engagementRate: this.calculateEngagementRate(
                        upvotes,
                        comments
                      ),
                      type: 'reddit_post',
                    });
                  }
                }
              }
            });
          }
        } catch (error) {
          console.log(
            `⚠️ Failed to scrape r/${subreddit.name}: ${error.message}`
          );
          continue;
        }
      }

      if (allTrends.length > 0) {
        // Sort by score and return top trends
        const sortedTrends = allTrends
          .sort((a, b) => b.score - a.score)
          .slice(0, 15);

        console.log(
          `📱 Found ${sortedTrends.length} trending posts from Reddit`
        );
        return sortedTrends;
      }

      return [];
    } catch (error) {
      console.error('❌ Error scraping Reddit:', error.message);
      return [];
    }
  }

  // Enhanced validation for trending Reddit posts
  isValidTrendingRedditPost(title, upvotes, upvoteRatio, comments) {
    // Basic title validation
    if (!title || title.length < 10 || title.length > 300) return false;

    // Engagement thresholds
    const minUpvotes = 50;
    const minUpvoteRatio = 0.7; // 70% upvote ratio
    const minComments = 10;

    // Higher thresholds for better trending detection
    const viralUpvotes = 500;
    const viralComments = 100;
    const highUpvoteRatio = 0.85;

    // High engagement posts (definitely trending)
    if (
      upvotes >= viralUpvotes ||
      comments >= viralComments ||
      upvoteRatio >= highUpvoteRatio
    ) {
      return true;
    }

    // Moderate engagement posts with good ratios
    if (
      upvotes >= minUpvotes &&
      upvoteRatio >= minUpvoteRatio &&
      comments >= minComments
    ) {
      return true;
    }

    // Check for trending keywords
    const trendingKeywords = [
      'breaking',
      'viral',
      'trending',
      'happening now',
      'just happened',
      'watch',
      'see this',
      "can't believe",
      'shocking',
      'amazing',
      'india',
      'modi',
      'bollywood',
      'cricket',
      'election',
      'pandemic',
      'ai',
      'technology',
      'startup',
      'economy',
      'stock market',
    ];

    const titleLower = title.toLowerCase();
    const hasTrendingKeywords = trendingKeywords.some((keyword) =>
      titleLower.includes(keyword)
    );

    // Lower thresholds for posts with trending keywords
    if (hasTrendingKeywords && upvotes >= 20 && upvoteRatio >= 0.6) {
      return true;
    }

    return false;
  }

  // Enhanced scoring for Reddit trends
  scoreRedditTrend(title, upvotes, comments, upvoteRatio, subreddit) {
    let score = 0;

    // Base score from headline
    score += this.scoreHeadline(title, 'Reddit');

    // Upvote scoring (logarithmic scale)
    if (upvotes >= 5000) score += 25;
    else if (upvotes >= 2000) score += 20;
    else if (upvotes >= 1000) score += 15;
    else if (upvotes >= 500) score += 10;
    else if (upvotes >= 100) score += 5;
    else if (upvotes >= 50) score += 2;

    // Comment engagement scoring
    if (comments >= 1000) score += 20;
    else if (comments >= 500) score += 15;
    else if (comments >= 200) score += 10;
    else if (comments >= 100) score += 7;
    else if (comments >= 50) score += 5;
    else if (comments >= 20) score += 3;

    // Upvote ratio bonus (quality indicator)
    if (upvoteRatio >= 0.95) score += 15;
    else if (upvoteRatio >= 0.9) score += 10;
    else if (upvoteRatio >= 0.8) score += 7;
    else if (upvoteRatio >= 0.7) score += 5;

    // Subreddit-specific bonuses
    const subredditBonuses = {
      worldnews: 10, // Global relevance
      india: 8, // Local relevance
      unpopularopinion: 5, // Controversial topics
    };
    score += subredditBonuses[subreddit] || 0;

    // Engagement rate bonus (comments per upvote)
    const engagementRate = comments / (upvotes || 1);
    if (engagementRate > 0.3) score += 10; // Very engaged
    else if (engagementRate > 0.2) score += 7; // Highly engaged
    else if (engagementRate > 0.1) score += 5; // Well engaged

    return Math.min(score, 50); // Cap at 50 points
  }

  // Calculate engagement rate
  calculateEngagementRate(upvotes, comments) {
    if (upvotes === 0) return 0;
    return Math.round((comments / upvotes) * 100) / 100; // Round to 2 decimal places
  }

  // Get traffic level description
  getRedditTrafficLevel(upvotes, comments, upvoteRatio) {
    if (upvotes >= 2000 || comments >= 500) return 'Viral';
    if (upvotes >= 1000 || comments >= 200) return 'Hot';
    if (upvotes >= 500 || comments >= 100) return 'Trending';
    if (upvoteRatio >= 0.9) return 'Rising';
    return 'Active';
  }

  // Validate viral content
  isValidViralContent(title) {
    if (!title || title.length < 10 || title.length > 200) return false;

    // Include any content with viral indicators
    const viralKeywords = [
      'viral',
      'trending',
      'funny',
      'amazing',
      'shocking',
      'incredible',
      'samay',
      'raina',
      'latent',
      'tiger',
      'cubs',
      'kabaddi',
      'animal',
      'youtube',
      'instagram',
      'tiktok',
      'comedy',
      'meme',
      'video',
      'bollywood',
      'cricket',
      'india',
      'indian',
      'desi',
    ];

    const lowerTitle = title.toLowerCase();
    return viralKeywords.some((keyword) => lowerTitle.includes(keyword));
  }

  // Score viral content based on engagement
  scoreViralContent(title, upvotes, comments) {
    let score = 0;

    // Base score from title
    score += this.scoreHeadline(title, 'Reddit');

    // Engagement bonuses
    if (upvotes > 1000) score += 10;
    else if (upvotes > 500) score += 5;
    else if (upvotes > 100) score += 2;

    if (comments > 100) score += 5;
    else if (comments > 50) score += 3;
    else if (comments > 20) score += 1;

    return score;
  }

  // Get recent trending topics (enhanced curated list)
  getRecentTrendingTopics() {
    const currentDate = new Date();
    const topics = [
      'India vs England Cricket Test Match',
      'Indian Stock Market Rally',
      'Monsoon Weather Updates India',
      'Bollywood Celebrity News',
      'Modi Government New Policy',
      'India Technology Startup Funding',
      'IPL 2025 Tournament',
      'Indian Railways New Routes',
      'Ayodhya Ram Mandir Updates',
      'India Space Mission ISRO',
      'Indian Economy Growth Rate',
      'Farmers Protest India News',
    ];

    return topics.map((topic) => ({
      title: topic,
      traffic: 'Rising',
      source: 'India Trending Topics',
      score: this.scoreHeadline(topic, 'India'),
      articles: [],
      timestamp: currentDate.toISOString(),
    }));
  }

  // Fetch Twitter trends from public sources (India)
  async fetchTwitterTrends() {
    try {
      // Primary source: trends24.in for India
      const trends = await this.scrapeTwitterFromTrends24();
      if (trends.length > 0) {
        return trends;
      }

      // Fallback: try getdaytrends.com
      console.log('🔄 Trying fallback source for Twitter trends...');
      return await this.scrapeTwitterFromGetDayTrends();
    } catch (error) {
      console.error('❌ Error fetching Twitter trends:', error.message);
      return [];
    }
  }

  // Scrape Twitter trends from trends24.in
  async scrapeTwitterFromTrends24() {
    try {
      const response = await axios.get('https://trends24.in/india/', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          Connection: 'keep-alive',
          'Upgrade-Insecure-Requests': '1',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const trends = [];

      // Try multiple selectors for trend extraction
      const selectors = [
        '.trend-card__list .trend-card__list-item',
        '.trending-item',
        '.trend-item',
        'a[href*="twitter.com"]',
        '[class*="trend"]',
      ];

      for (const selector of selectors) {
        $(selector).each((i, element) => {
          if (trends.length >= 20) return false; // Limit to 20 trends

          const text = $(element).text().trim();
          const href =
            $(element).attr('href') || $(element).find('a').attr('href');

          if (text && text.length > 1 && text.length < 100) {
            // Clean up the text
            const cleanText = text.replace(/^\d+\.?\s*/, '').trim(); // Remove numbering

            if (cleanText && !trends.some((t) => t.title === cleanText)) {
              trends.push({
                title: cleanText,
                source: 'trends24.in',
                url: href || 'https://trends24.in/india/',
                type: 'hashtag',
                score: this.scoreTwitterTrend(cleanText),
                platform: 'Twitter',
              });
            }
          }
        });

        if (trends.length >= 10) break; // Found enough trends
      }

      console.log(`📱 Found ${trends.length} Twitter trends from trends24.in`);
      return trends.slice(0, 15); // Return top 15
    } catch (error) {
      console.error('❌ Error scraping trends24.in:', error.message);
      return [];
    }
  }

  // Scrape Twitter trends from getdaytrends.com (fallback)
  async scrapeTwitterFromGetDayTrends() {
    try {
      const response = await axios.get('https://getdaytrends.com/india', {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
        timeout: 10000,
      });

      const $ = cheerio.load(response.data);
      const trends = [];

      // Extract trends from various possible selectors
      const selectors = [
        '.trend',
        '.trend-item',
        '.hashtag',
        '[data-trend]',
        'td a',
      ];

      for (const selector of selectors) {
        $(selector).each((i, element) => {
          if (trends.length >= 15) return false;

          const text = $(element).text().trim();
          const href = $(element).attr('href');

          if (text && text.length > 1 && text.length < 80) {
            const cleanText = text
              .replace(/^\d+\.?\s*/, '')
              .replace(/\s*tweets.*$/i, '')
              .trim();

            if (cleanText && !trends.some((t) => t.title === cleanText)) {
              trends.push({
                title: cleanText,
                source: 'getdaytrends.com',
                url: href || 'https://getdaytrends.com/india',
                type: 'hashtag',
                score: this.scoreTwitterTrend(cleanText),
                platform: 'Twitter',
              });
            }
          }
        });

        if (trends.length >= 10) break;
      }

      console.log(
        `📱 Found ${trends.length} Twitter trends from getdaytrends.com`
      );
      return trends.slice(0, 15);
    } catch (error) {
      console.error('❌ Error scraping getdaytrends.com:', error.message);
      return [];
    }
  }

  // Score Twitter trends with additional hashtag bonuses
  scoreTwitterTrend(trendText) {
    let score = this.scoreHeadline(trendText, '');

    // Additional scoring for Twitter-specific elements
    if (trendText.startsWith('#')) {
      score += 15; // Hashtag bonus
    }

    if (trendText.startsWith('@')) {
      score += 10; // Mention bonus
    }

    // Bonus for trending indicators
    const trendLower = trendText.toLowerCase();
    if (trendLower.includes('trending') || trendLower.includes('viral')) {
      score += 20;
    }

    // Indian context bonus
    if (
      trendLower.includes('india') ||
      trendLower.includes('indian') ||
      trendLower.includes('भारत') ||
      trendLower.includes('hindi')
    ) {
      score += 10;
    }

    return score;
  }

  // Cross-match topics across different sources
  crossMatchTopics(
    newsData,
    youtubeData,
    googleTrendsData,
    twitterData = [],
    redditData = []
  ) {
    const allTopics = new Map();

    // Process news articles
    newsData.forEach((article) => {
      const key = this.extractKeywords(article.title).join(' ');
      if (key) {
        if (!allTopics.has(key)) {
          allTopics.set(key, { keyword: key, sources: [], totalScore: 0 });
        }
        allTopics.get(key).sources.push({ type: 'news', data: article });
        allTopics.get(key).totalScore += article.score;
      }
    });

    // Process Twitter trends
    twitterData.forEach((trend) => {
      const key = this.extractKeywords(trend.title).join(' ');
      if (key) {
        if (!allTopics.has(key)) {
          allTopics.set(key, { keyword: key, sources: [], totalScore: 0 });
        }
        allTopics.get(key).sources.push({ type: 'twitter', data: trend });
        allTopics.get(key).totalScore += trend.score;
      }
    });

    // Process YouTube videos
    youtubeData.forEach((video) => {
      const key = this.extractKeywords(video.title).join(' ');
      if (key) {
        if (!allTopics.has(key)) {
          allTopics.set(key, { keyword: key, sources: [], totalScore: 0 });
        }
        allTopics.get(key).sources.push({ type: 'youtube', data: video });
        allTopics.get(key).totalScore += video.score;
      }
    });

    // Process Google Trends
    googleTrendsData.forEach((trend) => {
      const key = this.extractKeywords(trend.title).join(' ');
      if (key) {
        if (!allTopics.has(key)) {
          allTopics.set(key, { keyword: key, sources: [], totalScore: 0 });
        }
        allTopics.get(key).sources.push({ type: 'trends', data: trend });
        allTopics.get(key).totalScore += trend.score;
      }
    });

    // Process Reddit posts
    redditData.forEach((post) => {
      const key = this.extractKeywords(post.title).join(' ');
      if (key) {
        if (!allTopics.has(key)) {
          allTopics.set(key, { keyword: key, sources: [], totalScore: 0 });
        }
        allTopics.get(key).sources.push({ type: 'reddit', data: post });
        allTopics.get(key).totalScore += post.score;
      }
    });

    // Return cross-matched topics sorted by score
    return Array.from(allTopics.values())
      .filter((topic) => topic.sources.length > 1) // Only topics appearing in multiple sources
      .sort((a, b) => b.totalScore - a.totalScore);
  }

  // Extract keywords from title for cross-matching
  extractKeywords(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(' ')
      .filter((word) => word.length > 3)
      .slice(0, 3); // Take first 3 meaningful words
  }

  // Format numbers for display
  formatNumber(num) {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    }
    if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  }

  // Display results in console
  displayResults(
    newsData,
    youtubeData,
    googleTrendsData,
    twitterData,
    redditData,
    crossMatched
  ) {
    console.log('\n🔥 COMPREHENSIVE TREND TRACKER - INDIA 🇮🇳');
    console.log('='.repeat(60));

    // Section 1: News Articles
    console.log('\n📰 NEWS ARTICLES WITH SCORES');
    console.log('-'.repeat(40));
    newsData
      .sort((a, b) => b.score - a.score)
      .forEach((article, index) => {
        console.log(`${index + 1}. [Score: ${article.score}] ${article.title}`);
        console.log(`   Source: ${article.source} (${article.api})`);
        console.log(`   URL: ${article.url}\n`);
      });

    // Section 2: Twitter Trending (India)
    console.log('\n📱 TWITTER TRENDING HASHTAGS & TOPICS (INDIA)');
    console.log('-'.repeat(40));
    twitterData
      .sort((a, b) => b.score - a.score)
      .forEach((trend, index) => {
        console.log(`${index + 1}. [Score: ${trend.score}] ${trend.title}`);
        console.log(`   Source: ${trend.source}`);
        console.log(`   Type: ${trend.type}`);
        console.log(`   URL: ${trend.url}\n`);
      });

    // Section 3: YouTube Trending
    console.log('\n🎥 YOUTUBE TRENDING VIDEOS (INDIA)');
    console.log('-'.repeat(40));
    youtubeData
      .sort((a, b) => b.score - a.score)
      .forEach((video, index) => {
        console.log(`${index + 1}. [Score: ${video.score}] ${video.title}`);
        console.log(`   Channel: ${video.channel}`);
        console.log(`   Views: ${this.formatNumber(video.views)}`);
        console.log(`   URL: ${video.url}\n`);
      });

    // Section 4: Google Trends
    console.log('\n📈 GOOGLE TRENDS (INDIA)');
    console.log('-'.repeat(40));
    googleTrendsData
      .sort((a, b) => b.score - a.score)
      .forEach((trend, index) => {
        console.log(`${index + 1}. [Score: ${trend.score}] ${trend.title}`);
        console.log(`   Traffic: ${trend.traffic}`);
        if (trend.articles && trend.articles.length > 0) {
          console.log(`   Related: ${trend.articles[0].title}`);
        }
        console.log('');
      });

    // Section 5: Reddit Trending Posts
    console.log('\n🔴 REDDIT TRENDING POSTS (RECENT)');
    console.log('-'.repeat(40));
    redditData
      .sort((a, b) => b.score - a.score)
      .forEach((post, index) => {
        console.log(`${index + 1}. [Score: ${post.score}] ${post.title}`);
        console.log(`   Source: ${post.source} (${post.hoursAgo}h ago)`);
        console.log(
          `   Upvotes: ${post.upvotes} | Comments: ${post.comments} | Ratio: ${post.upvoteRatio}`
        );
        console.log(
          `   Traffic: ${post.traffic} | Engagement: ${post.engagementRate}`
        );
        console.log(`   URL: ${post.url}\n`);
      });

    // Section 6: Cross-Matched Topics
    console.log('\n🔗 CROSS-MATCHED TRENDING TOPICS');
    console.log('-'.repeat(40));
    crossMatched.slice(0, 5).forEach((topic, index) => {
      console.log(
        `${index + 1}. [Total Score: ${topic.totalScore}] ${topic.keyword}`
      );
      console.log(
        `   Found in: ${topic.sources.map((s) => s.type).join(', ')}`
      );
      console.log('');
    });

    console.log('\n✨ Analysis Complete!');
  }

  // Main execution function
  async run() {
    console.log('🚀 Starting Comprehensive Trend Analysis...\n');

    try {
      // Fetch data from all sources including Reddit
      const [
        newsGNews,
        newsMediaStack,
        youtubeData,
        googleTrendsData,
        twitterData,
        redditData,
      ] = await Promise.all([
        this.fetchGNews(),
        this.fetchMediaStack(),
        this.fetchYouTubeTrending(),
        this.fetchGoogleTrends(),
        this.fetchTwitterTrends(),
        this.scrapeRedditTrends(),
      ]);

      // Combine news sources
      const allNewsData = [...newsGNews, ...newsMediaStack];

      // Cross-match topics including Reddit
      const crossMatchedTopics = this.crossMatchTopics(
        allNewsData,
        youtubeData,
        googleTrendsData,
        twitterData,
        redditData
      );

      // Display results
      this.displayResults(
        allNewsData,
        youtubeData,
        googleTrendsData,
        twitterData,
        redditData,
        crossMatchedTopics
      );

      // Return structured data for API use
      return {
        news: allNewsData,
        youtube: youtubeData,
        googleTrends: googleTrendsData,
        twitter: twitterData,
        reddit: redditData,
        crossMatched: crossMatchedTopics,
        summary: {
          totalNews: allNewsData.length,
          totalYouTube: youtubeData.length,
          totalTrends: googleTrendsData.length,
          totalTwitter: twitterData.length,
          totalReddit: redditData.length,
          crossMatchedTopics: crossMatchedTopics.length,
        },
      };
    } catch (error) {
      console.error('❌ Error in trend analysis:', error.message);
      throw error;
    }
  }
}

module.exports = TrendTracker;
