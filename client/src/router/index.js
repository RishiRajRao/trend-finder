import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Trends from '../views/Trends.vue';
import LiveTrends from '../views/LiveTrends.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home,
    },
    {
      path: '/trends',
      name: 'Trends',
      component: Trends,
    },
    {
      path: '/live-trends',
      name: 'LiveTrends',
      component: LiveTrends,
    },
  ],
});

export default router;
