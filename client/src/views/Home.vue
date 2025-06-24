<template>
  <div class="w-full">
    <!-- Live Trends Component -->
    <LiveTrends />
  </div>
</template>

<script>
import LiveTrends from './LiveTrends.vue';

export default {
  name: 'Home',
  components: {
    LiveTrends,
  },
};
</script>
