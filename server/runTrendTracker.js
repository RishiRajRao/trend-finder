#!/usr/bin/env node

const TrendTracker = require('./trendTracker');
const fs = require('fs');
const path = require('path');

/**
 * Standalone script to run the comprehensive trend tracker
 * Usage: node runTrendTracker.js [--json] [--csv]
 */

async function main() {
  const args = process.argv.slice(2);
  const outputJson = args.includes('--json');
  const outputCsv = args.includes('--csv');

  console.log('🚀 Starting Comprehensive Trend Analysis...\n');
  console.log('📋 To add API keys, create a .env file with:');
  console.log('   GNEWS_API_KEY=your_key');
  console.log('   MEDIASTACK_API_KEY=your_key');
  console.log('   YOUTUBE_API_KEY=your_key');
  console.log('='.repeat(60));

  const tracker = new TrendTracker();

  try {
    // Run the comprehensive analysis
    const results = await tracker.run();

    // Output as JSON if requested
    if (outputJson) {
      const jsonOutput = {
        timestamp: new Date().toISOString(),
        results: results,
      };

      const filename = `trends_${new Date().toISOString().split('T')[0]}.json`;
      fs.writeFileSync(filename, JSON.stringify(jsonOutput, null, 2));
      console.log(`\n💾 Results saved to ${filename}`);
    }

    // Output as CSV if requested
    if (outputCsv) {
      const csvLines = ['Type,Title,Source,Score,URL'];

      // Add news articles
      results.news.forEach((item) => {
        csvLines.push(
          `News,"${item.title}","${item.source}",${item.score},"${item.url}"`
        );
      });

      // Add YouTube videos
      results.youtube.forEach((item) => {
        csvLines.push(
          `YouTube,"${item.title}","${item.channel}",${item.score},"${item.url}"`
        );
      });

      // Add Google trends
      results.googleTrends.forEach((item) => {
        csvLines.push(
          `Google Trends,"${item.title}","${item.traffic}",${item.score},""`
        );
      });

      const filename = `trends_${new Date().toISOString().split('T')[0]}.csv`;
      fs.writeFileSync(filename, csvLines.join('\n'));
      console.log(`\n📊 Results saved to ${filename}`);
    }

    console.log('\n✅ Analysis Complete!');
    console.log(`📈 Summary:`);
    console.log(`   News Articles: ${results.summary.totalNews}`);
    console.log(`   YouTube Videos: ${results.summary.totalYouTube}`);
    console.log(`   Google Trends: ${results.summary.totalTrends}`);
    console.log(
      `   Cross-matched Topics: ${results.summary.crossMatchedTopics}`
    );
  } catch (error) {
    console.error('❌ Error running trend analysis:', error.message);
    process.exit(1);
  }
}

// Handle command line execution
if (require.main === module) {
  main().catch(console.error);
}

module.exports = main;
