<template>
  <div class="max-w-6xl mx-auto p-8">
    <h1 class="text-center text-gray-800 text-3xl font-bold mb-8">
      Current Trends
    </h1>

    <div class="flex justify-center gap-4 mb-8 flex-wrap">
      <button
        v-for="category in categories"
        :key="category"
        @click="filterByCategory(category)"
        class="btn-outline"
        :class="{ 'btn-primary': selectedCategory === category }"
      >
        {{ category }}
      </button>
    </div>

    <div v-if="loading" class="text-center py-8 text-lg">Loading trends...</div>

    <div v-else-if="error" class="text-center py-8 text-lg text-red-500">
      {{ error }}
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      <div
        v-for="trend in filteredTrends"
        :key="trend.id"
        class="bg-white rounded-lg p-6 shadow-lg card-hover"
      >
        <div class="flex justify-between items-start mb-4">
          <h3 class="text-gray-800 font-semibold flex-1 text-lg">
            {{ trend.title }}
          </h3>
          <span
            class="bg-primary text-white px-3 py-1 rounded-full text-sm ml-4 flex-shrink-0"
          >
            {{ trend.category }}
          </span>
        </div>
        <p class="text-gray-600 mb-6 leading-relaxed">
          {{ trend.description }}
        </p>
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-4">
            <span class="font-bold text-gray-800 min-w-20">Popularity</span>
            <div class="flex-1 progress-bar">
              <div
                class="progress-fill"
                :style="{ width: trend.popularity + '%' }"
              ></div>
            </div>
            <span class="font-bold min-w-12 text-right"
              >{{ trend.popularity }}%</span
            >
          </div>
          <div class="flex items-center gap-4">
            <span class="font-bold text-gray-800 min-w-20">Growth</span>
            <span
              class="font-bold min-w-12 text-right"
              :class="{
                'text-green-600': trend.growth > 0,
                'text-red-500': trend.growth < 0,
                'text-gray-600': trend.growth === 0,
              }"
            >
              {{ trend.growth > 0 ? '+' : '' }}{{ trend.growth }}%
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import axios from 'axios';

export default {
  name: 'Trends',
  data() {
    return {
      trends: [],
      selectedCategory: 'All',
      loading: true,
      error: null,
    };
  },
  computed: {
    categories() {
      const cats = [
        'All',
        ...new Set(this.trends.map((trend) => trend.category)),
      ];
      return cats;
    },
    filteredTrends() {
      if (this.selectedCategory === 'All') {
        return this.trends;
      }
      return this.trends.filter(
        (trend) => trend.category === this.selectedCategory
      );
    },
  },
  methods: {
    async fetchTrends() {
      try {
        this.loading = true;
        const response = await axios.get('/api/trends');
        this.trends = response.data.data;
      } catch (error) {
        this.error =
          'Failed to fetch trends. Please make sure the server is running.';
        console.error('Error fetching trends:', error);
      } finally {
        this.loading = false;
      }
    },
    filterByCategory(category) {
      this.selectedCategory = category;
    },
  },
  mounted() {
    this.fetchTrends();
  },
};
</script>
