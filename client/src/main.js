import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import './style.css';
import { inject } from '@vercel/analytics';

const app = createApp(App);

app.use(createPinia());
app.use(router);

// Initialize Vercel Analytics
inject();

app.mount('#app');
