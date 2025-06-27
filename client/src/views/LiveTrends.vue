<template>
  <div class="max-w-6xl mx-auto p-8 min-h-screen overflow-x-hidden">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-800 mb-2">
        🔥 Live Trend Analysis - India 🇮🇳
      </h1>
      <p class="text-gray-600 text-lg mb-6">
        Real-time data from News, Twitter, YouTube, and Google Trends with
        intelligent scoring
      </p>
      <button
        @click="refreshData"
        :disabled="loading"
        class="btn-primary px-8 py-3 rounded-full font-bold cursor-pointer transition-transform duration-300 hover:-translate-y-1 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        <span v-if="loading">🔄 Analyzing...</span>
        <span v-else>🔄 Refresh Analysis</span>
      </button>
    </div>

    <div
      v-if="error"
      class="bg-red-50 border border-red-200 rounded-lg p-8 text-center text-red-600 my-8"
    >
      <h3 class="text-xl font-semibold mb-2">⚠️ {{ error }}</h3>
      <p>Make sure your API keys are configured in the server/.env file</p>
    </div>

    <div v-if="loading" class="text-center py-16">
      <div class="spinner mx-auto mb-4"></div>
      <p class="text-gray-600">Analyzing trends across multiple sources...</p>
    </div>

    <div v-else-if="trendData" class="w-full block">
      <!-- Summary Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-12">
        <div
          class="bg-white p-6 rounded-lg shadow-lg text-center card-hover cursor-pointer"
          :class="{
            'bg-gradient text-white transform -translate-y-2':
              activeTab === 'news',
          }"
          @click="activeTab = 'news'"
        >
          <h3
            class="text-2xl font-bold mb-2"
            :class="activeTab === 'news' ? 'text-white' : 'text-primary'"
          >
            📰 {{ trendData.summary?.totalNews || trendData.news?.length || 0 }}
          </h3>
          <p
            class="text-gray-600"
            :class="{ 'text-white': activeTab === 'news' }"
          >
            News Articles
          </p>
        </div>

        <div
          class="bg-white p-6 rounded-lg shadow-lg text-center card-hover cursor-pointer"
          :class="{
            'bg-gradient text-white transform -translate-y-2':
              activeTab === 'twitter',
          }"
          @click="activeTab = 'twitter'"
        >
          <h3
            class="text-2xl font-bold mb-2"
            :class="activeTab === 'twitter' ? 'text-white' : 'text-primary'"
          >
            📱
            {{
              trendData.summary?.totalTwitter || trendData.twitter?.length || 0
            }}
          </h3>
          <p
            class="text-gray-600"
            :class="{ 'text-white': activeTab === 'twitter' }"
          >
            Twitter Trends
          </p>
        </div>

        <div
          class="bg-white p-6 rounded-lg shadow-lg text-center card-hover cursor-pointer"
          :class="{
            'bg-gradient text-white transform -translate-y-2':
              activeTab === 'youtube',
          }"
          @click="activeTab = 'youtube'"
        >
          <h3
            class="text-2xl font-bold mb-2"
            :class="activeTab === 'youtube' ? 'text-white' : 'text-primary'"
          >
            🎥
            {{
              trendData.summary?.totalYouTube || trendData.youtube?.length || 0
            }}
          </h3>
          <p
            class="text-gray-600"
            :class="{ 'text-white': activeTab === 'youtube' }"
          >
            YouTube Videos
          </p>
        </div>

        <div
          class="bg-white p-6 rounded-lg shadow-lg text-center card-hover cursor-pointer"
          :class="{
            'bg-gradient text-white transform -translate-y-2':
              activeTab === 'google',
          }"
          @click="activeTab = 'google'"
        >
          <h3
            class="text-2xl font-bold mb-2"
            :class="activeTab === 'google' ? 'text-white' : 'text-primary'"
          >
            📈
            {{
              trendData.summary?.totalTrends ||
              trendData.googleTrends?.length ||
              0
            }}
          </h3>
          <p
            class="text-gray-600"
            :class="{ 'text-white': activeTab === 'google' }"
          >
            Google Trends
          </p>
        </div>

        <div
          class="bg-white p-6 rounded-lg shadow-lg text-center card-hover cursor-pointer"
          :class="{
            'bg-gradient text-white transform -translate-y-2':
              activeTab === 'reddit',
          }"
          @click="activeTab = 'reddit'"
        >
          <h3
            class="text-2xl font-bold mb-2"
            :class="activeTab === 'reddit' ? 'text-white' : 'text-primary'"
          >
            🔴
            {{
              trendData.summary?.totalReddit || trendData.reddit?.length || 0
            }}
          </h3>
          <p
            class="text-gray-600"
            :class="{ 'text-white': activeTab === 'reddit' }"
          >
            Reddit Posts
          </p>
        </div>

        <div
          class="bg-white p-6 rounded-lg shadow-lg text-center card-hover cursor-pointer"
          :class="{
            'bg-gradient text-white transform -translate-y-2':
              activeTab === 'viral',
          }"
          @click="activeTab = 'viral'"
        >
          <h3
            class="text-2xl font-bold mb-2"
            :class="activeTab === 'viral' ? 'text-white' : 'text-primary'"
          >
            🤖
            {{
              trendData.summary?.viralContent ||
              trendData.viralContent?.length ||
              0
            }}
          </h3>
          <p
            class="text-gray-600"
            :class="{ 'text-white': activeTab === 'viral' }"
          >
            AI Viral
          </p>
        </div>

        <div
          class="bg-white p-6 rounded-lg shadow-lg text-center card-hover cursor-pointer"
          :class="{
            'bg-gradient text-white transform -translate-y-2':
              activeTab === 'crossmatched',
          }"
          @click="activeTab = 'crossmatched'"
        >
          <h3
            class="text-2xl font-bold mb-2"
            :class="
              activeTab === 'crossmatched' ? 'text-white' : 'text-primary'
            "
          >
            🔗
            {{
              trendData.summary?.crossMatchedTopics ||
              trendData.crossMatched?.length ||
              0
            }}
          </h3>
          <p
            class="text-gray-600"
            :class="{ 'text-white': activeTab === 'crossmatched' }"
          >
            Cross-Matched
          </p>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div
        class="flex flex-wrap gap-2 my-8 border-b-2 border-gray-200 pb-4 justify-center"
      >
        <button
          v-for="tab in tabs"
          :key="tab.id"
          @click="activeTab = tab.id"
          class="bg-white border-2 border-gray-300 px-6 py-3 rounded-full cursor-pointer transition-all duration-300 font-bold text-gray-600 hover:bg-gray-50 hover:border-primary"
          :class="{
            'bg-gradient text-white border-primary transform -translate-y-1':
              activeTab === tab.id,
          }"
        >
          {{ tab.icon }} {{ tab.label }}
        </button>
      </div>

      <!-- Tab Content -->
      <div class="block w-full p-4" style="min-height: 500px">
        <!-- AI Viral Content Tab -->
        <div v-if="activeTab === 'viral'" class="animate-fade-in block w-full">
          <div
            v-if="trendData.viralContent && trendData.viralContent.length > 0"
          >
            <h2
              class="text-2xl font-bold text-gray-800 border-b-4 border-primary pb-2 mb-4"
            >
              🤖 AI-Powered Viral Content Selection
            </h2>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div class="flex items-center gap-2 mb-2">
                <span class="text-lg">🎯</span>
                <span class="font-bold text-blue-800">
                  {{
                    trendData.viralContent[0]?.aiSelected
                      ? 'OpenAI GPT-3.5-turbo Analysis'
                      : 'Manual Viral Scoring'
                  }}
                </span>
              </div>
              <p class="text-blue-700 text-sm">
                Content ranked by viral potential for Indian audiences based on
                breaking news impact, controversy potential, celebrity value,
                emotional impact, and social shareability.
              </p>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div
                v-for="(item, index) in trendData.viralContent"
                :key="index"
                class="bg-white rounded-lg p-6 shadow-lg border-l-4 hover:shadow-xl transition-all duration-300"
                :class="{
                  'border-purple-500': item.type === 'News',
                  'border-blue-500': item.type === 'Twitter',
                  'border-red-500': item.type === 'YouTube',
                  'border-green-500': item.type === 'Google Trends',
                  'border-orange-500': item.type === 'Reddit',
                }"
              >
                <div class="flex justify-between items-start mb-4">
                  <div class="flex items-center gap-2">
                    <span class="text-lg font-bold text-gray-700"
                      >#{{ index + 1 }}</span
                    >
                    <span
                      class="px-3 py-1 rounded-full text-xs font-bold"
                      :class="{
                        'bg-purple-100 text-purple-700': item.type === 'News',
                        'bg-blue-100 text-blue-700': item.type === 'Twitter',
                        'bg-red-100 text-red-700': item.type === 'YouTube',
                        'bg-green-100 text-green-700':
                          item.type === 'Google Trends',
                        'bg-orange-100 text-orange-700': item.type === 'Reddit',
                      }"
                    >
                      {{ item.type }}
                    </span>
                  </div>
                  <span
                    class="bg-gradient-to-r from-purple-500 to-blue-500 text-white px-3 py-1 rounded-full text-sm font-bold"
                  >
                    {{ item.viralScore || item.score }}
                  </span>
                </div>

                <h3
                  class="text-lg font-semibold text-gray-800 mb-3 leading-tight"
                >
                  {{ item.title }}
                </h3>

                <div class="mb-4">
                  <div
                    class="flex items-center gap-2 text-sm text-gray-600 mb-2"
                  >
                    <span class="font-medium">Source:</span>
                    <span>{{ item.source }}</span>
                  </div>

                  <div
                    v-if="item.aiSelected"
                    class="flex items-center gap-2 text-sm mb-2"
                  >
                    <span class="text-green-600">🎯 AI Ranked:</span>
                    <span
                      class="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-bold"
                    >
                      #{{ item.viralRank }} by OpenAI
                    </span>
                  </div>

                  <div v-else class="flex items-center gap-2 text-sm mb-2">
                    <span class="text-blue-600">📊 Manual Score:</span>
                    <span
                      class="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-bold"
                    >
                      {{ item.viralScore }} points
                    </span>
                  </div>

                  <!-- Type-specific metrics -->
                  <div
                    v-if="item.views"
                    class="flex items-center gap-2 text-sm text-gray-600"
                  >
                    <span class="font-medium">Views:</span>
                    <span class="font-bold text-red-600">{{
                      formatNumber(item.views)
                    }}</span>
                  </div>

                  <div
                    v-if="item.upvotes"
                    class="flex items-center gap-4 text-sm text-gray-600"
                  >
                    <div class="flex items-center gap-1">
                      <span class="font-medium">Upvotes:</span>
                      <span class="font-bold text-orange-600">{{
                        item.upvotes
                      }}</span>
                    </div>
                    <div class="flex items-center gap-1">
                      <span class="font-medium">Comments:</span>
                      <span class="font-bold text-orange-600">{{
                        item.comments
                      }}</span>
                    </div>
                  </div>
                </div>

                <div class="flex justify-between items-center">
                  <div class="text-xs text-gray-500">
                    Original Score: {{ item.score || 0 }}
                  </div>
                  <a
                    v-if="item.url"
                    :href="item.url"
                    target="_blank"
                    class="text-primary text-xs font-bold hover:underline"
                  >
                    View Source →
                  </a>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-16 text-gray-600">
            <div class="text-6xl mb-4">🤖</div>
            <h3 class="text-xl font-semibold text-gray-800 mb-4">
              AI Viral Analysis in Progress
            </h3>
            <p>Analyzing content from all sources for viral potential...</p>
          </div>
        </div>

        <!-- Cross-Matched Topics Tab -->
        <div
          v-if="activeTab === 'crossmatched'"
          class="animate-fade-in block w-full"
        >
          <div
            v-if="trendData.crossMatched && trendData.crossMatched.length > 0"
          >
            <h2
              class="text-2xl font-bold text-gray-800 border-b-4 border-primary pb-2 mb-4"
            >
              🔗 Matched Topics Across Sources
            </h2>
            <p class="text-gray-600 mb-6">
              Same or similar content found across multiple sources with
              detailed source information
            </p>
            <div class="space-y-6">
              <div
                v-for="(topic, index) in trendData.crossMatched.slice(0, 8)"
                :key="index"
                class="bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden mb-6"
              >
                <div class="bg-gradient text-white p-4">
                  <div class="flex justify-between items-start mb-2">
                    <h3 class="text-xl font-bold text-white">
                      {{ topic.keyword }}
                    </h3>
                    <span
                      class="bg-white bg-opacity-20 px-3 py-1 rounded-full text-sm font-bold"
                    >
                      Score: {{ topic.totalScore }}
                    </span>
                  </div>
                  <p class="text-white text-opacity-90 mb-3">
                    {{ topic.description }}
                  </p>
                  <div class="flex items-center gap-2 text-sm">
                    <span class="bg-white bg-opacity-20 px-2 py-1 rounded">
                      {{ topic.matchType || 'similar' }} match
                    </span>
                    <span class="bg-white bg-opacity-20 px-2 py-1 rounded">
                      {{ topic.matchedItemsCount || topic.sources.length }}
                      items
                    </span>
                  </div>
                </div>

                <div class="p-4">
                  <h4 class="font-semibold text-gray-800 mb-3">
                    Sources & Content:
                  </h4>
                  <div class="space-y-3">
                    <div
                      v-for="(source, sourceIndex) in topic.sources"
                      :key="sourceIndex"
                      class="border border-gray-100 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div class="flex justify-between items-start mb-2">
                        <span
                          class="px-2 py-1 rounded-full text-xs font-bold text-white"
                          :class="{
                            'bg-blue-500': source.type === 'news',
                            'bg-red-500': source.type === 'youtube',
                            'bg-green-500': source.type === 'google_trends',
                            'bg-purple-500': source.type === 'twitter',
                            'bg-orange-500': source.type === 'reddit',
                          }"
                        >
                          {{ source.sourceLabel || source.type }}
                        </span>
                        <span class="text-xs text-gray-500 font-medium">
                          Score: {{ source.data.score || 0 }}
                        </span>
                      </div>
                      <p class="text-sm text-gray-700 font-medium mb-1">
                        {{ source.data.title }}
                      </p>
                      <p
                        class="text-xs text-gray-600"
                        v-if="source.data.description"
                      >
                        {{ source.data.description.substring(0, 100) }}...
                      </p>
                      <div class="flex justify-between items-center mt-2">
                        <span class="text-xs text-gray-500">
                          {{ source.data.source || source.data.channelTitle }}
                        </span>
                        <a
                          v-if="source.data.url"
                          :href="source.data.url"
                          target="_blank"
                          class="text-primary text-xs font-bold hover:underline"
                        >
                          View Source →
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-16 text-gray-600">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">
              No matched topics found
            </h3>
            <p>Content needs to appear in multiple sources to be matched</p>
          </div>
        </div>

        <!-- News Articles Tab -->
        <div v-if="activeTab === 'news'" class="animate-fade-in block w-full">
          <h2
            class="text-2xl font-bold text-gray-800 border-b-4 border-primary pb-2 mb-4"
          >
            📰 News Articles with Scores
          </h2>
          <p class="text-gray-600 mb-6">
            Latest news from GNews and MediaStack APIs
          </p>
          <div
            v-if="sortedNews.length > 0"
            class="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            <div
              v-for="(article, index) in sortedNews.slice(0, 15)"
              :key="index"
              class="bg-white rounded-lg p-6 shadow-lg card-hover"
            >
              <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-semibold text-gray-800 flex-1 mr-3">
                  {{ article.title }}
                </h3>
                <span
                  class="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold flex-shrink-0"
                >
                  {{ article.score }}
                </span>
              </div>
              <p class="text-gray-600 mb-4 line-clamp-3">
                {{ article.description }}
              </p>
              <div class="flex justify-between items-center">
                <span class="text-sm text-gray-500"
                  >{{ article.source }} ({{ article.api }})</span
                >
                <a
                  :href="article.url"
                  target="_blank"
                  class="text-primary font-bold hover:underline"
                >
                  Read More →
                </a>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-16 text-gray-600">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">
              No news articles available
            </h3>
            <p>News articles are being loaded from multiple sources...</p>
          </div>
        </div>

        <!-- Twitter Trending Tab -->
        <div
          v-if="activeTab === 'twitter'"
          class="animate-fade-in block w-full"
        >
          <h2
            class="text-2xl font-bold text-gray-800 border-b-4 border-primary pb-2 mb-4"
          >
            📱 Twitter Trending Hashtags & Topics (India)
          </h2>
          <p class="text-gray-600 mb-6">
            Latest trending hashtags and topics from Twitter India
          </p>
          <div
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
          >
            <div
              v-for="(trend, index) in sortedTwitter.slice(0, 20)"
              :key="index"
              class="bg-white rounded-lg p-4 shadow-lg card-hover border-l-4 border-blue-500"
            >
              <div class="flex justify-between items-start mb-3">
                <h3 class="text-base font-semibold text-gray-800 flex-1 mr-2">
                  {{ trend.title }}
                </h3>
                <span
                  class="bg-primary text-white px-2 py-1 rounded-full text-xs font-bold flex-shrink-0"
                >
                  {{ trend.score }}
                </span>
              </div>
              <div class="flex gap-2 mb-3">
                <span
                  class="bg-blue-50 text-blue-600 px-2 py-1 rounded-full text-xs font-bold capitalize"
                >
                  {{ trend.type }}
                </span>
                <span
                  class="bg-blue-500 text-white px-2 py-1 rounded-full text-xs font-bold"
                >
                  Twitter
                </span>
              </div>
              <div class="flex justify-between items-center">
                <span class="text-xs text-gray-500">{{ trend.source }}</span>
                <a
                  :href="trend.url"
                  target="_blank"
                  class="text-blue-500 font-bold text-sm hover:underline"
                >
                  View Trend →
                </a>
              </div>
            </div>
          </div>
        </div>

        <!-- YouTube Trending Tab -->
        <div
          v-if="activeTab === 'youtube'"
          class="animate-fade-in block w-full"
        >
          <h2
            class="text-2xl font-bold text-gray-800 border-b-4 border-primary pb-2 mb-4"
          >
            🎥 YouTube Trending Videos (India)
          </h2>
          <p class="text-gray-600 mb-6">
            Most popular videos trending in India
          </p>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div
              v-for="(video, index) in sortedYouTube.slice(0, 12)"
              :key="index"
              class="bg-white rounded-lg p-6 shadow-lg card-hover"
            >
              <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-semibold text-gray-800 flex-1 mr-3">
                  {{ video.title }}
                </h3>
                <span
                  class="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold flex-shrink-0"
                >
                  {{ video.score }}
                </span>
              </div>
              <div class="mb-4">
                <p class="text-gray-600 mb-2">📺 {{ video.channel }}</p>
                <p class="text-gray-600">
                  👁️ {{ formatNumber(video.views) }} views
                </p>
              </div>
              <a
                :href="video.url"
                target="_blank"
                class="inline-block bg-red-500 text-white px-4 py-2 rounded font-bold hover:bg-red-600 transition-colors"
              >
                Watch on YouTube
              </a>
            </div>
          </div>
        </div>

        <!-- Reddit Trending Tab -->
        <div v-if="activeTab === 'reddit'" class="animate-fade-in block w-full">
          <h2
            class="text-2xl font-bold text-gray-800 border-b-4 border-primary pb-2 mb-4"
          >
            🔴 Reddit Trending Posts (Last 12 Hours)
          </h2>
          <p class="text-gray-600 mb-6">
            Trending posts from r/india, r/worldnews, and r/unpopularopinion
            with high engagement
          </p>
          <div
            v-if="sortedReddit.length > 0"
            class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            <div
              v-for="(post, index) in sortedReddit.slice(0, 12)"
              :key="index"
              class="bg-white rounded-lg p-6 shadow-lg card-hover border-l-4"
              :class="{
                'border-orange-500': post.subreddit === 'india',
                'border-blue-500': post.subreddit === 'worldnews',
                'border-purple-500': post.subreddit === 'unpopularopinion',
                'border-green-500': post.subreddit === 'india-rising',
              }"
            >
              <div class="flex justify-between items-start mb-3">
                <h3 class="text-lg font-semibold text-gray-800 flex-1 mr-3">
                  {{ post.title }}
                </h3>
                <span
                  class="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold flex-shrink-0"
                >
                  {{ post.score }}
                </span>
              </div>

              <!-- Subreddit badge -->
              <div class="mb-3">
                <span
                  class="px-3 py-1 rounded-full text-xs font-bold"
                  :class="{
                    'bg-orange-100 text-orange-800': post.subreddit === 'india',
                    'bg-blue-100 text-blue-800': post.subreddit === 'worldnews',
                    'bg-purple-100 text-purple-800':
                      post.subreddit === 'unpopularopinion',
                    'bg-green-100 text-green-800':
                      post.subreddit === 'india-rising',
                    'bg-yellow-100 text-yellow-800':
                      post.subreddit === 'IndianDankMemes',
                    'bg-red-100 text-red-800':
                      post.subreddit === 'indiauncensored',
                    'bg-indigo-100 text-indigo-800':
                      post.subreddit === 'IndiaNews',
                    'bg-teal-100 text-teal-800':
                      post.subreddit === 'IndiaSpeaks',
                  }"
                >
                  r/{{ post.subreddit }}
                </span>
                <span
                  class="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-bold ml-2"
                >
                  {{ post.hoursAgo }}h ago
                </span>
              </div>

              <!-- Engagement metrics -->
              <div class="grid grid-cols-2 gap-4 mb-4 text-sm">
                <div class="flex items-center">
                  <span class="text-gray-500">👍 Upvotes:</span>
                  <span class="font-bold ml-1">{{
                    formatNumber(post.upvotes)
                  }}</span>
                </div>
                <div class="flex items-center">
                  <span class="text-gray-500">💬 Comments:</span>
                  <span class="font-bold ml-1">{{ post.comments }}</span>
                </div>
                <div class="flex items-center">
                  <span class="text-gray-500">📊 Ratio:</span>
                  <span class="font-bold ml-1 text-green-600"
                    >{{ Math.round(post.upvoteRatio * 100) }}%</span
                  >
                </div>
                <div class="flex items-center">
                  <span class="text-gray-500">🔥 Traffic:</span>
                  <span
                    class="font-bold ml-1"
                    :class="{
                      'text-red-600': post.traffic === 'Viral',
                      'text-orange-600': post.traffic === 'Hot',
                      'text-yellow-600': post.traffic === 'Trending',
                      'text-blue-600': post.traffic === 'Rising',
                      'text-gray-600': post.traffic === 'Active',
                    }"
                    >{{ post.traffic }}</span
                  >
                </div>
              </div>

              <a
                :href="post.url"
                target="_blank"
                class="inline-block bg-orange-500 text-white px-4 py-2 rounded font-bold hover:bg-orange-600 transition-colors w-full text-center"
              >
                View on Reddit
              </a>
            </div>
          </div>
          <div v-else class="text-center py-16 text-gray-600">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">
              No Reddit posts available
            </h3>
            <p>
              Reddit trending posts are being loaded from multiple subreddits...
            </p>
          </div>
        </div>

        <!-- Google Trends Tab -->
        <div v-if="activeTab === 'google'" class="animate-fade-in block w-full">
          <h2
            class="text-2xl font-bold text-gray-800 border-b-4 border-primary pb-2 mb-4"
          >
            📈 Google Trends (India)
          </h2>
          <p class="text-gray-600 mb-6">
            Daily trending searches and popular topics in India
          </p>
          <div v-if="sortedGoogleTrends.length > 0">
            <!-- Source indicator -->
            <div v-if="getGoogleTrendsSource" class="text-center mb-6">
              <span
                class="bg-blue-50 text-blue-700 px-4 py-2 rounded-full text-sm font-bold border border-blue-200"
              >
                📊 Data source: {{ getGoogleTrendsSource }}
              </span>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div
                v-for="(trend, index) in sortedGoogleTrends.slice(0, 12)"
                :key="index"
                class="bg-white rounded-lg p-6 shadow-lg card-hover"
              >
                <div class="flex justify-between items-start mb-3">
                  <h3 class="text-lg font-semibold text-gray-800 flex-1 mr-3">
                    {{ trend.title }}
                  </h3>
                  <span
                    class="bg-primary text-white px-3 py-1 rounded-full text-sm font-bold flex-shrink-0"
                  >
                    {{ trend.score }}
                  </span>
                </div>
                <p class="text-gray-600 mb-2">🔥 {{ trend.traffic }}</p>
                <div v-if="trend.source" class="mb-3">
                  <small class="text-gray-500 italic"
                    >Source: {{ trend.source }}</small
                  >
                </div>
                <div
                  v-if="trend.articles && trend.articles.length > 0"
                  class="mt-4"
                >
                  <p class="text-gray-800 font-semibold mb-2">
                    Related Articles:
                  </p>
                  <div class="space-y-2">
                    <a
                      v-for="(article, i) in trend.articles.slice(0, 2)"
                      :key="i"
                      :href="article.url"
                      target="_blank"
                      class="block text-sm text-primary hover:underline leading-tight"
                    >
                      {{ article.title }}
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div v-else class="text-center py-16 text-gray-600">
            <h3 class="text-xl font-semibold text-gray-800 mb-4">
              Google Trends temporarily unavailable
            </h3>
            <p>
              All Google Trends sources are currently unavailable. We're working
              to restore the service.
            </p>
          </div>
        </div>
      </div>

      <!-- Last Updated -->
      <div
        class="text-center mt-12 pt-8 border-t border-gray-200 text-gray-500"
      >
        <p>
          Last updated:
          {{ new Date(trendData.timestamp || Date.now()).toLocaleString() }}
        </p>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'LiveTrends',
  data() {
    return {
      trendData: null,
      loading: true,
      error: null,
      activeTab: 'viral',
      tabs: [
        { id: 'viral', label: 'AI Viral Content', icon: '🤖' },
        { id: 'news', label: 'News Articles', icon: '📰' },
        { id: 'twitter', label: 'Twitter Trends', icon: '📱' },
        { id: 'youtube', label: 'YouTube Videos', icon: '🎥' },
        { id: 'google', label: 'Google Trends', icon: '📈' },
        { id: 'reddit', label: 'Reddit Posts', icon: '🔴' },
        { id: 'crossmatched', label: 'Matched Topics', icon: '🔗' },
      ],
    };
  },
  computed: {
    sortedNews() {
      return this.trendData?.news
        ? [...this.trendData.news].sort((a, b) => b.score - a.score)
        : [];
    },
    sortedYouTube() {
      return this.trendData?.youtube
        ? [...this.trendData.youtube].sort((a, b) => b.score - a.score)
        : [];
    },
    sortedGoogleTrends() {
      return this.trendData?.googleTrends
        ? [...this.trendData.googleTrends].sort((a, b) => b.score - a.score)
        : [];
    },
    sortedTwitter() {
      return this.trendData?.twitter
        ? [...this.trendData.twitter].sort((a, b) => b.score - a.score)
        : [];
    },
    sortedReddit() {
      return this.trendData?.reddit
        ? [...this.trendData.reddit].sort((a, b) => b.score - a.score)
        : [];
    },
    getGoogleTrendsSource() {
      if (
        !this.trendData?.googleTrends ||
        this.trendData.googleTrends.length === 0
      ) {
        return null;
      }

      const firstTrend = this.trendData.googleTrends[0];
      if (firstTrend.source === 'Google Trends API') {
        return 'Official Google Trends API';
      } else if (firstTrend.source === 'Curated Topics') {
        return 'Curated trending topics (API unavailable)';
      } else {
        return `Scraped from ${firstTrend.source}`;
      }
    },
  },
  methods: {
    async fetchLiveTrends() {
      try {
        this.loading = true;
        this.error = null;

        console.log('🔄 Fetching live trends...');
        const response = await axios.get('/api/live-trends');
        console.log('✅ API Response:', response.data);

        this.trendData = response.data.data;

        if (!this.trendData) {
          console.error('❌ No trend data received');
          this.error = 'No trend data received';
        } else {
          console.log('📊 Trend data loaded successfully:', {
            news: this.trendData.news?.length || 0,
            twitter: this.trendData.twitter?.length || 0,
            youtube: this.trendData.youtube?.length || 0,
            googleTrends: this.trendData.googleTrends?.length || 0,
          });
        }
      } catch (error) {
        console.error('❌ Error fetching live trends:', error);
        this.error =
          error.response?.data?.message ||
          error.message ||
          'Failed to fetch live trends. Make sure API keys are configured.';
      } finally {
        this.loading = false;
      }
    },
    refreshData() {
      this.fetchLiveTrends();
    },
    formatNumber(num) {
      if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + 'M';
      }
      if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'K';
      }
      return num.toString();
    },
    extractDomain(url) {
      try {
        const urlObj = new URL(url);
        return urlObj.hostname.replace('www.', '');
      } catch (error) {
        return 'Invalid URL';
      }
    },
  },
  mounted() {
    this.fetchLiveTrends();
  },
};
</script>
