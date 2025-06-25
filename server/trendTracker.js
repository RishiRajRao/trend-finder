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

  // Enhanced scraping with viral content detection
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

      // Enhanced selectors for better trend extraction
      const selectors = [
        '.trend-card__list .trend-card__list-item',
        '.trending-item',
        '.trend-item',
        'a[href*="twitter.com"]',
        '[class*="trend"]',
        '.hashtag-item',
        '.trending-topic',
      ];

      for (const selector of selectors) {
        $(selector).each((i, element) => {
          if (trends.length >= 25) return false; // Increased limit for better filtering

          const text = $(element).text().trim();
          const href =
            $(element).attr('href') || $(element).find('a').attr('href');

          if (text && text.length > 1 && text.length < 120) {
            // Enhanced text cleaning
            const cleanText = text
              .replace(/^\d+\.?\s*/, '') // Remove numbering
              .replace(/\s*tweets.*$/i, '') // Remove tweet count
              .replace(/\s*K tweets.*$/i, '') // Remove K tweets
              .replace(/\s*M tweets.*$/i, '') // Remove M tweets
              .trim();

            if (cleanText && !trends.some((t) => t.title === cleanText)) {
              const score = this.scoreTwitterTrend(cleanText);

              // Only include trends with decent viral potential
              if (score >= 5 || this.isViralTwitterContent(cleanText)) {
                trends.push({
                  title: cleanText,
                  source: 'trends24.in',
                  url:
                    href ||
                    `https://twitter.com/search?q=${encodeURIComponent(
                      cleanText
                    )}`,
                  type: this.getTwitterContentType(cleanText),
                  score: score,
                  platform: 'Twitter',
                  category: this.categorizeTwitterTrend(cleanText),
                });
              }
            }
          }
        });

        if (trends.length >= 15) break; // Found enough quality trends
      }

      // Sort by score and return top viral trends
      const sortedTrends = trends
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      console.log(
        `📱 Found ${sortedTrends.length} viral Twitter trends from trends24.in`
      );
      return sortedTrends;
    } catch (error) {
      console.error('❌ Error scraping trends24.in:', error.message);
      return [];
    }
  }

  // Enhanced viral content detection
  isViralTwitterContent(text) {
    const viralKeywords = [
      // Breaking news indicators
      'breaking',
      'urgent',
      'alert',
      'live',
      'now',
      'just in',
      'developing',
      'बड़ी खबर',
      'तत्काल',
      'अभी',
      'तुरंत',
      'लाइव',

      // Viral content indicators
      'viral',
      'trending',
      'shocking',
      'exposed',
      'scandal',
      'controversy',
      'arrest',
      'raid',
      'caught',
      'leaked',
      'exclusive',
      'bombshell',
      'वायरल',
      'ट्रेंडिंग',
      'गिरफ्तार',
      'छापेमारी',
      'एक्सक्लूसिव',

      // Sensational terms
      'massive',
      'huge',
      'major',
      'historic',
      'unprecedented',
      'dramatic',
      'explosive',
      'devastating',
      'shocking',
      'stunning',
      'unbelievable',
      'बड़ा',
      'भारी',
      'ऐतिहासिक',
      'चौंकाने वाला',
      'हैरान करने वाला',

      // Indian political/social hot topics
      'modi',
      'rahul',
      'kejriwal',
      'parliament',
      'supreme court',
      'cbi',
      'ed',
      'farmer',
      'protest',
      'strike',
      'bandh',
      'riot',
      'violence',
      'मोदी',
      'राहुल',
      'केजरीवाल',
      'संसद',
      'सुप्रीम कोर्ट',
      'प्रदर्शन',

      // Crime and justice
      'murder',
      'rape',
      'scam',
      'corruption',
      'fraud',
      'terror',
      'attack',
      'हत्या',
      'बलात्कार',
      'घोटाला',
      'भ्रष्टाचार',
      'आतंक',
      'हमला',

      // Celebrity/entertainment viral
      'bollywood',
      'cricket',
      'ipl',
      'wedding',
      'death',
      'accident',
      'बॉलीवुड',
      'क्रिकेट',
      'शादी',
      'मौत',
      'दुर्घटना',
    ];

    const lowerText = text.toLowerCase();
    return viralKeywords.some((keyword) =>
      lowerText.includes(keyword.toLowerCase())
    );
  }

  // Categorize Twitter trends
  categorizeTwitterTrend(text) {
    const lowerText = text.toLowerCase();

    if (
      lowerText.includes('breaking') ||
      lowerText.includes('बड़ी खबर') ||
      lowerText.includes('live') ||
      lowerText.includes('लाइव')
    ) {
      return 'Breaking News';
    }

    if (
      lowerText.includes('bollywood') ||
      lowerText.includes('cricket') ||
      lowerText.includes('बॉलीवुड') ||
      lowerText.includes('क्रिकेट')
    ) {
      return 'Entertainment/Sports';
    }

    if (
      lowerText.includes('modi') ||
      lowerText.includes('parliament') ||
      lowerText.includes('मोदी') ||
      lowerText.includes('संसद')
    ) {
      return 'Politics';
    }

    if (
      lowerText.includes('arrest') ||
      lowerText.includes('scam') ||
      lowerText.includes('गिरफ्तार') ||
      lowerText.includes('घोटाला')
    ) {
      return 'Crime/Justice';
    }

    return 'General';
  }

  // Get Twitter content type
  getTwitterContentType(text) {
    if (text.startsWith('#')) return 'hashtag';
    if (text.startsWith('@')) return 'mention';
    if (this.isViralTwitterContent(text)) return 'viral_topic';
    return 'trending_topic';
  }

  // Enhanced fallback scraping with viral content detection
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

      // Enhanced selectors for better trend extraction
      const selectors = [
        '.trend',
        '.trend-item',
        '.hashtag',
        '[data-trend]',
        'td a',
        '.trending-topic',
        '.viral-trend',
      ];

      for (const selector of selectors) {
        $(selector).each((i, element) => {
          if (trends.length >= 20) return false;

          const text = $(element).text().trim();
          const href = $(element).attr('href');

          if (text && text.length > 1 && text.length < 100) {
            const cleanText = text
              .replace(/^\d+\.?\s*/, '')
              .replace(/\s*tweets.*$/i, '')
              .replace(/\s*K tweets.*$/i, '')
              .replace(/\s*M tweets.*$/i, '')
              .trim();

            if (cleanText && !trends.some((t) => t.title === cleanText)) {
              const score = this.scoreTwitterTrend(cleanText);

              // Only include trends with viral potential
              if (score >= 5 || this.isViralTwitterContent(cleanText)) {
                trends.push({
                  title: cleanText,
                  source: 'getdaytrends.com',
                  url:
                    href ||
                    `https://twitter.com/search?q=${encodeURIComponent(
                      cleanText
                    )}`,
                  type: this.getTwitterContentType(cleanText),
                  score: score,
                  platform: 'Twitter',
                  category: this.categorizeTwitterTrend(cleanText),
                });
              }
            }
          }
        });

        if (trends.length >= 12) break;
      }

      // Sort by score and return top viral trends
      const sortedTrends = trends
        .sort((a, b) => b.score - a.score)
        .slice(0, 15);

      console.log(
        `📱 Found ${sortedTrends.length} viral Twitter trends from getdaytrends.com`
      );
      return sortedTrends;
    } catch (error) {
      console.error('❌ Error scraping getdaytrends.com:', error.message);
      return [];
    }
  }

  // Enhanced scoring for viral Twitter trends
  scoreTwitterTrend(trendText) {
    let score = this.scoreHeadline(trendText, '');

    // Additional scoring for Twitter-specific elements
    if (trendText.startsWith('#')) {
      score += 15; // Hashtag bonus
    }

    if (trendText.startsWith('@')) {
      score += 10; // Mention bonus
    }

    const trendLower = trendText.toLowerCase();

    // MAJOR BONUS for breaking news indicators
    const breakingKeywords = [
      'breaking',
      'urgent',
      'alert',
      'live',
      'now',
      'just in',
      'developing',
      'बड़ी खबर',
      'तत्काल',
      'अभी',
      'लाइव',
    ];
    if (breakingKeywords.some((keyword) => trendLower.includes(keyword))) {
      score += 35; // High priority for breaking news
    }

    // VIRAL content indicators
    const viralKeywords = [
      'viral',
      'trending',
      'shocking',
      'exposed',
      'scandal',
      'controversy',
      'वायरल',
      'ट्रेंडिंग',
    ];
    if (viralKeywords.some((keyword) => trendLower.includes(keyword))) {
      score += 25;
    }

    // SENSATIONAL terms
    const sensationalKeywords = [
      'massive',
      'huge',
      'major',
      'historic',
      'unprecedented',
      'dramatic',
      'explosive',
      'devastating',
      'stunning',
      'बड़ा',
      'भारी',
      'ऐतिहासिक',
    ];
    if (sensationalKeywords.some((keyword) => trendLower.includes(keyword))) {
      score += 20;
    }

    // HIGH-IMPACT political/social topics
    const politicalKeywords = [
      'modi',
      'rahul',
      'kejriwal',
      'parliament',
      'supreme court',
      'cbi',
      'ed',
      'मोदी',
      'राहुल',
      'केजरीवाल',
      'संसद',
    ];
    if (politicalKeywords.some((keyword) => trendLower.includes(keyword))) {
      score += 25;
    }

    // CRIME and justice (high viral potential)
    const crimeKeywords = [
      'arrest',
      'raid',
      'murder',
      'rape',
      'scam',
      'corruption',
      'fraud',
      'terror',
      'attack',
      'गिरफ्तार',
      'छापेमारी',
      'हत्या',
      'घोटाला',
    ];
    if (crimeKeywords.some((keyword) => trendLower.includes(keyword))) {
      score += 30; // Crime news tends to go viral
    }

    // CELEBRITY/ENTERTAINMENT viral content
    const entertainmentKeywords = [
      'bollywood',
      'cricket',
      'ipl',
      'wedding',
      'death',
      'accident',
      'बॉलीवुड',
      'क्रिकेट',
      'शादी',
      'मौत',
    ];
    if (entertainmentKeywords.some((keyword) => trendLower.includes(keyword))) {
      score += 20;
    }

    // Indian context bonus
    if (
      trendLower.includes('india') ||
      trendLower.includes('indian') ||
      trendLower.includes('भारत') ||
      trendLower.includes('hindi')
    ) {
      score += 15; // Increased Indian context bonus
    }

    // Length penalty for very short trends (likely not descriptive enough)
    if (trendText.length < 10) {
      score -= 5;
    }

    // Bonus for mixed language content (Hindi + English = more viral in India)
    if (/[\u0900-\u097F]/.test(trendText) && /[a-zA-Z]/.test(trendText)) {
      score += 10;
    }

    return Math.max(0, score); // Ensure non-negative score
  }

  // Cross-match topics across different sources
  // AI-powered cross-matching to find common themes across sources
  async crossMatchTopics(
    newsData,
    youtubeData,
    googleTrendsData,
    twitterData = [],
    redditData = []
  ) {
    try {
      // Check if OpenAI is available
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
      ) {
        console.log(
          '⚠️ OpenAI API key not configured, using manual cross-matching'
        );
        return this.manualCrossMatch(
          newsData,
          youtubeData,
          googleTrendsData,
          twitterData,
          redditData
        );
      }

      // Prepare content from all sources for AI analysis
      const allContent = [];

      newsData.forEach((item, index) => {
        allContent.push({
          id: `news_${index}`,
          title: item.title,
          source: 'News',
          type: 'news',
        });
      });

      youtubeData.forEach((item, index) => {
        allContent.push({
          id: `youtube_${index}`,
          title: item.title,
          source: 'YouTube',
          type: 'youtube',
        });
      });

      twitterData.forEach((item, index) => {
        allContent.push({
          id: `twitter_${index}`,
          title: item.title,
          source: 'Twitter',
          type: 'twitter',
        });
      });

      googleTrendsData.forEach((item, index) => {
        allContent.push({
          id: `google_${index}`,
          title: item.title,
          source: 'Google Trends',
          type: 'google_trends',
        });
      });

      redditData.forEach((item, index) => {
        allContent.push({
          id: `reddit_${index}`,
          title: item.title,
          source: 'Reddit',
          type: 'reddit',
        });
      });

      // Limit to 40 items for API efficiency
      const contentForAI = allContent.slice(0, 40);

      const contentList = contentForAI
        .map((item, index) => `${index + 1}. [${item.source}] "${item.title}"`)
        .join('\n');

      const prompt = `You are an expert at identifying common themes and topics across different news and social media sources.

Analyze the following content from various sources and identify the TOP 3 COMMON THEMES that appear across MULTIPLE sources (News, YouTube, Twitter, Google Trends, Reddit).

Look for thematic connections like:
- Same events described differently (e.g., "Israel-Iran conflict" and "Middle East crisis")  
- Related topics (e.g., "Cricket match" and "India vs England")
- Common personalities (e.g., "Modi announces" and "PM Modi")
- Similar incidents (e.g., "Train accident" and "Railway mishap")
- Trending subjects (e.g., "Bollywood wedding" and "Celebrity marriage")

Content to analyze:
${contentList}

For each common theme, provide:
1. Theme name (concise, 2-4 words)
2. Brief description 
3. Which content items belong to this theme (use the numbers from the list)

Return ONLY a JSON array with exactly 3 themes:
[
  {
    "theme": "Theme Name",
    "description": "Brief description of the theme",
    "items": [1, 5, 12, 18],
    "sources": ["News", "YouTube", "Twitter"]
  }
]`;

      // Call OpenAI API
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      console.log('🤖 Analyzing common themes with OpenAI...');

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are an expert at identifying thematic connections across news and social media. Return only valid JSON arrays.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 500,
        temperature: 0.3,
      });

      const aiResponse = completion.choices[0].message.content.trim();
      console.log('🎯 OpenAI Themes Response:', aiResponse);

      // Parse AI response
      let themes;
      try {
        themes = JSON.parse(aiResponse);
      } catch (parseError) {
        console.log(
          '⚠️ AI response parsing failed, using manual cross-matching'
        );
        return this.manualCrossMatch(
          newsData,
          youtubeData,
          googleTrendsData,
          twitterData,
          redditData
        );
      }

      // Convert AI themes to our format
      const crossMatchedTopics = themes.map((theme, index) => {
        const relatedContent = [];
        let totalScore = 0;

        theme.items.forEach((itemIndex) => {
          const adjustedIndex = itemIndex - 1; // Convert to 0-based
          if (adjustedIndex >= 0 && adjustedIndex < contentForAI.length) {
            const content = contentForAI[adjustedIndex];

            // Find original data to get scores
            let originalData = null;
            let score = 0;

            if (content.type === 'news') {
              const newsIndex = parseInt(content.id.split('_')[1]);
              originalData = newsData[newsIndex];
              score = originalData?.score || 0;
            } else if (content.type === 'youtube') {
              const youtubeIndex = parseInt(content.id.split('_')[1]);
              originalData = youtubeData[youtubeIndex];
              score = originalData?.score || 0;
            } else if (content.type === 'twitter') {
              const twitterIndex = parseInt(content.id.split('_')[1]);
              originalData = twitterData[twitterIndex];
              score = originalData?.score || 0;
            } else if (content.type === 'google_trends') {
              const googleIndex = parseInt(content.id.split('_')[1]);
              originalData = googleTrendsData[googleIndex];
              score = originalData?.score || 0;
            } else if (content.type === 'reddit') {
              const redditIndex = parseInt(content.id.split('_')[1]);
              originalData = redditData[redditIndex];
              score = originalData?.score || 0;
            }

            if (originalData) {
              relatedContent.push({
                type: content.type,
                data: originalData,
              });
              totalScore += score;
            }
          }
        });

        return {
          keyword: theme.theme,
          description: theme.description,
          sources: relatedContent,
          totalScore: totalScore,
          aiGenerated: true,
          sourceTypes: [...new Set(relatedContent.map((c) => c.type))],
        };
      });

      console.log(
        `✅ AI identified ${crossMatchedTopics.length} common themes`
      );
      return crossMatchedTopics.filter((topic) => topic.sources.length > 1); // Only multi-source themes
    } catch (error) {
      console.error('❌ Error in AI cross-matching:', error.message);
      console.log('🔄 Falling back to manual cross-matching...');
      return this.manualCrossMatch(
        newsData,
        youtubeData,
        googleTrendsData,
        twitterData,
        redditData
      );
    }
  }

  // Manual cross-matching fallback (improved version)
  manualCrossMatch(
    newsData,
    youtubeData,
    googleTrendsData,
    twitterData = [],
    redditData = []
  ) {
    const allTopics = new Map();

    // Process all content with better keyword extraction
    const processContent = (items, type) => {
      items.forEach((item) => {
        const keywords = this.extractBetterKeywords(item.title);
        keywords.forEach((keyword) => {
          if (!allTopics.has(keyword)) {
            allTopics.set(keyword, {
              keyword,
              sources: [],
              totalScore: 0,
              sourceTypes: new Set(),
            });
          }
          allTopics.get(keyword).sources.push({ type, data: item });
          allTopics.get(keyword).totalScore += item.score || 0;
          allTopics.get(keyword).sourceTypes.add(type);
        });
      });
    };

    processContent(newsData, 'news');
    processContent(youtubeData, 'youtube');
    processContent(twitterData, 'twitter');
    processContent(googleTrendsData, 'google_trends');
    processContent(redditData, 'reddit');

    // Return topics that appear in multiple sources
    return Array.from(allTopics.values())
      .filter((topic) => topic.sourceTypes.size > 1) // Must appear in multiple source types
      .map((topic) => ({
        ...topic,
        sourceTypes: Array.from(topic.sourceTypes),
        aiGenerated: false,
      }))
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 5); // Top 5 cross-matched topics
  }

  // Better keyword extraction for manual fallback
  extractBetterKeywords(title) {
    const keywords = new Set();
    const cleanTitle = title
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .trim();

    // Extract important terms
    const importantTerms = [
      'israel',
      'iran',
      'modi',
      'india',
      'cricket',
      'bollywood',
      'election',
      'court',
      'police',
      'government',
      'ceasefire',
      'war',
      'conflict',
      'attack',
      'breaking',
      'live',
      'news',
      'update',
      'announces',
      'death',
      'arrest',
    ];

    importantTerms.forEach((term) => {
      if (cleanTitle.includes(term)) {
        keywords.add(term);
      }
    });

    // Extract multi-word phrases
    const phrases = [
      'israel iran',
      'iran israel',
      'middle east',
      'air india',
      'train accident',
      'supreme court',
      'high court',
      'pm modi',
      'bollywood star',
      'cricket match',
    ];

    phrases.forEach((phrase) => {
      if (cleanTitle.includes(phrase)) {
        keywords.add(phrase);
      }
    });

    return Array.from(keywords);
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
    crossMatched,
    viralContent = []
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
    console.log('\n📱 TWITTER VIRAL & BREAKING TRENDS (INDIA)');
    console.log('-'.repeat(40));
    twitterData
      .sort((a, b) => b.score - a.score)
      .forEach((trend, index) => {
        console.log(`${index + 1}. [Score: ${trend.score}] ${trend.title}`);
        console.log(`   Category: ${trend.category || 'General'}`);
        console.log(`   Type: ${trend.type}`);
        console.log(`   Source: ${trend.source}`);
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

    // Section 6: AI-Enhanced Cross-Matched Topics
    console.log('\n🔗 AI-ENHANCED CROSS-MATCHED THEMES');
    console.log('-'.repeat(40));
    crossMatched.slice(0, 3).forEach((topic, index) => {
      console.log(
        `${index + 1}. [Score: ${topic.totalScore}] ${topic.keyword}`
      );
      if (topic.description) {
        console.log(`   Description: ${topic.description}`);
      }
      console.log(
        `   Sources: ${
          topic.sourceTypes
            ? topic.sourceTypes.join(', ')
            : topic.sources.map((s) => s.type).join(', ')
        }`
      );
      console.log(`   Items: ${topic.sources.length} related content pieces`);
      if (topic.aiGenerated) {
        console.log('   🤖 AI-identified theme');
      } else {
        console.log('   📊 Manual keyword matching');
      }
      console.log('');
    });

    // Section 7: AI Viral Content Selection
    if (viralContent && viralContent.length > 0) {
      console.log('\n🤖 AI-POWERED VIRAL CONTENT SELECTION');
      console.log('-'.repeat(40));
      viralContent.forEach((item, index) => {
        console.log(
          `${index + 1}. [Viral Score: ${item.viralScore || item.score}] ${
            item.title
          }`
        );
        console.log(`   Type: ${item.type} | Source: ${item.source}`);
        if (item.aiSelected) {
          console.log(`   🎯 AI Ranked: #${item.viralRank} (OpenAI selected)`);
        } else {
          console.log(
            `   📊 Manual Score: ${item.viralScore} (Fallback method)`
          );
        }
        if (item.views)
          console.log(`   Views: ${this.formatNumber(item.views)}`);
        if (item.upvotes)
          console.log(
            `   Upvotes: ${item.upvotes} | Comments: ${item.comments}`
          );
        console.log(`   URL: ${item.url || 'N/A'}\n`);
      });
    }

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

      // Cross-match topics including Reddit with AI
      const crossMatchedTopics = await this.crossMatchTopics(
        allNewsData,
        youtubeData,
        googleTrendsData,
        twitterData,
        redditData
      );

      // Sort content by viral potential using OpenAI
      const viralContent = await this.sortViral(
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
        crossMatchedTopics,
        viralContent
      );

      // Return structured data for API use
      return {
        news: allNewsData,
        youtube: youtubeData,
        googleTrends: googleTrendsData,
        twitter: twitterData,
        reddit: redditData,
        crossMatched: crossMatchedTopics,
        viralContent: viralContent,
        summary: {
          totalNews: allNewsData.length,
          totalYouTube: youtubeData.length,
          totalTrends: googleTrendsData.length,
          totalTwitter: twitterData.length,
          totalReddit: redditData.length,
          crossMatchedTopics: crossMatchedTopics.length,
          viralContent: viralContent.length,
        },
      };
    } catch (error) {
      console.error('❌ Error in trend analysis:', error.message);
      throw error;
    }
  }

  // Sort content by viral potential using OpenAI
  async sortViral(
    newsData,
    youtubeData,
    googleTrendsData,
    twitterData = [],
    redditData = []
  ) {
    try {
      // Combine all content into a simple array for AI analysis
      const allContent = [];

      // Add news articles
      newsData.forEach((item) => {
        allContent.push({
          title: item.title,
          source: item.source,
          type: 'News',
          score: item.score,
          url: item.url,
        });
      });

      // Add YouTube videos
      youtubeData.forEach((item) => {
        allContent.push({
          title: item.title,
          source: item.channel,
          type: 'YouTube',
          score: item.score,
          views: item.views,
          url: item.url,
        });
      });

      // Add Twitter trends
      twitterData.forEach((item) => {
        allContent.push({
          title: item.title,
          source: item.source,
          type: 'Twitter',
          score: item.score,
          url: item.url,
        });
      });

      // Add Google Trends
      googleTrendsData.forEach((item) => {
        allContent.push({
          title: item.title,
          source: 'Google Trends',
          type: 'Google Trends',
          score: item.score,
          traffic: item.traffic,
        });
      });

      // Add Reddit posts
      redditData.forEach((item) => {
        allContent.push({
          title: item.title,
          source: item.source,
          type: 'Reddit',
          score: item.score,
          upvotes: item.upvotes,
          comments: item.comments,
          url: item.url,
        });
      });

      // Check if OpenAI is available
      if (
        !process.env.OPENAI_API_KEY ||
        process.env.OPENAI_API_KEY === 'your_openai_api_key_here'
      ) {
        console.log(
          '⚠️ OpenAI API key not configured, using manual viral scoring'
        );
        return this.manualViralSort(allContent);
      }

      // Prepare content for OpenAI (take all content, let AI decide)
      const topContent = allContent.slice(0, 50); // Limit to 50 for API efficiency

      const contentList = topContent
        .map(
          (item, index) =>
            `${index + 1}. [${item.type}] "${item.title}" - Source: ${
              item.source
            }${item.views ? ` (Views: ${item.views})` : ''}${
              item.upvotes ? ` (Upvotes: ${item.upvotes})` : ''
            }${item.traffic ? ` (Traffic: ${item.traffic})` : ''}`
        )
        .join('\n');

      const prompt = `You are an expert in viral content analysis for Indian audiences. Below is a list of trending content from various sources. 

IMPORTANT: Ignore any previous scores or rankings. Analyze each item purely based on its VIRAL POTENTIAL for Indian social media.

Rank these items by their VIRAL POTENTIAL, considering:
- Breaking news impact and urgency
- Controversy and debate potential  
- Celebrity/entertainment/Bollywood value
- Emotional impact (anger, joy, surprise, outrage)
- Social media shareability and discussion potential
- Indian cultural relevance and local context
- Trending keywords and viral indicators
- Current events significance

Content to analyze:
${contentList}

Return ONLY the top 15 items with highest viral potential. Format your response as a simple numbered list using the original numbers:
1. [Original number from list]
2. [Original number from list]
...and so on`;

      // Call OpenAI API
      const OpenAI = require('openai');
      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      console.log('🤖 Analyzing viral potential with OpenAI...');

      const completion = await openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content:
              'You are a viral content expert. Return only a numbered list of items ranked by viral potential.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        max_tokens: 300,
        temperature: 0.3,
      });

      const aiResponse = completion.choices[0].message.content.trim();
      console.log('🎯 OpenAI Response:', aiResponse);

      // Parse AI response to extract rankings
      const lines = aiResponse.split('\n').filter((line) => line.trim());
      const viralContent = [];

      lines.forEach((line, rank) => {
        // Look for patterns like "1. 5" or "1. [Original number]"
        const match = line.match(/^\d+\.\s*(\d+)/);
        if (match) {
          const originalIndex = parseInt(match[1]) - 1;
          if (originalIndex >= 0 && originalIndex < topContent.length) {
            const item = topContent[originalIndex];
            viralContent.push({
              ...item,
              viralRank: rank + 1,
              viralScore: 100 - rank * 5, // Decreasing score based on AI ranking
              aiSelected: true,
            });
          }
        }
      });

      console.log(`✅ AI selected ${viralContent.length} viral items`);
      return viralContent.slice(0, 15); // Ensure max 15 items
    } catch (error) {
      console.error('❌ Error in OpenAI viral sorting:', error.message);
      console.log('🔄 Falling back to manual viral scoring...');

      // Fallback to manual sorting
      const allContent = [
        ...newsData,
        ...youtubeData,
        ...googleTrendsData,
        ...twitterData,
        ...redditData,
      ];
      return this.manualViralSort(allContent);
    }
  }

  // Manual viral sorting fallback
  manualViralSort(allContent) {
    const viralKeywords = [
      'breaking',
      'viral',
      'trending',
      'shocking',
      'exclusive',
      'scandal',
      'controversy',
      'massive',
      'urgent',
      'alert',
      'exposed',
      'leaked',
      'bollywood',
      'cricket',
      'modi',
      'election',
      'arrest',
      'death',
      'accident',
    ];

    const scoredContent = allContent.map((item, index) => {
      let viralScore = 0; // Start from 0, ignore original scores
      const title = (item.title || '').toLowerCase();

      // Score based on viral keywords
      viralKeywords.forEach((keyword) => {
        if (title.includes(keyword)) {
          viralScore += 25;
        }
      });

      // Score based on engagement metrics
      if (item.views && item.views > 500000) viralScore += 40;
      else if (item.views && item.views > 100000) viralScore += 25;

      if (item.upvotes && item.upvotes > 1000) viralScore += 30;
      else if (item.upvotes && item.upvotes > 500) viralScore += 20;

      // Score for Indian context
      if (
        title.includes('india') ||
        title.includes('indian') ||
        title.includes('modi') ||
        title.includes('delhi') ||
        title.includes('mumbai')
      ) {
        viralScore += 20;
      }

      // Score for content type priority
      if (
        item.type === 'News' &&
        (title.includes('breaking') || title.includes('live'))
      )
        viralScore += 30;
      if (item.type === 'Twitter' && title.startsWith('#')) viralScore += 15;
      if (item.type === 'YouTube' && title.includes('live')) viralScore += 20;

      // Score for controversy/emotion indicators
      const emotionalWords = [
        'angry',
        'outrage',
        'protest',
        'fight',
        'clash',
        'attack',
        'win',
        'lose',
        'victory',
      ];
      emotionalWords.forEach((word) => {
        if (title.includes(word)) viralScore += 15;
      });

      return {
        ...item,
        viralScore,
        viralRank: index + 1,
        aiSelected: false,
      };
    });

    return scoredContent
      .sort((a, b) => b.viralScore - a.viralScore)
      .slice(0, 15);
  }
}

module.exports = TrendTracker;
