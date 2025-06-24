<script>
export default {
  name: 'App',
};
</script>

<template>
  <div id="app">
    <nav class="nav-gradient text-white py-4 shadow-lg">
      <div class="max-w-6xl mx-auto px-8 flex justify-between items-center">
        <h1 class="text-2xl font-bold">📈 Trend Finder</h1>
        <div class="flex gap-8">
          <RouterLink
            to="/"
            class="text-white no-underline font-medium px-4 py-2 rounded transition-colors duration-300 hover:bg-white hover:bg-opacity-20"
            :class="{ 'bg-white bg-opacity-20': $route.path === '/' }"
          >
            🔥 Live Analysis
          </RouterLink>
        </div>
      </div>
    </nav>

    <main class="max-w-6xl mx-auto p-8">
      <RouterView />
    </main>
  </div>
</template>
