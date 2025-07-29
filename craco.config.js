const path = require('path');

module.exports = {
  webpack: {
    configure: (webpackConfig, { env, paths }) => {
      // Development optimizations
      if (env === 'development') {
        // Disable source maps for faster builds
        webpackConfig.devtool = false;
        
        // Optimize file watching
        webpackConfig.watchOptions = {
          ignored: /node_modules/,
          aggregateTimeout: 300,
          poll: false,
        };
        
        // Reduce bundle splitting for faster dev builds
        webpackConfig.optimization = {
          ...webpackConfig.optimization,
          splitChunks: {
            chunks: 'all',
            cacheGroups: {
              default: false,
              vendors: false,
              vendor: {
                name: 'vendor',
                chunks: 'all',
                test: /node_modules/,
                priority: 20
              },
              common: {
                name: 'common',
                minChunks: 2,
                chunks: 'all',
                priority: 10,
                reuseExistingChunk: true,
                enforce: true
              }
            }
          }
        };
        
        // Faster TypeScript compilation
        const tsRule = webpackConfig.module.rules.find(rule => 
          rule.test && rule.test.toString().includes('tsx?')
        );
        if (tsRule && tsRule.use) {
          const tsLoader = Array.isArray(tsRule.use) 
            ? tsRule.use.find(use => use.loader && use.loader.includes('ts-loader'))
            : tsRule.use.loader && tsRule.use.loader.includes('ts-loader') ? tsRule.use : null;
            
          if (tsLoader && tsLoader.options) {
            tsLoader.options.transpileOnly = true;
            tsLoader.options.experimentalWatchApi = true;
          }
        }
      }
      
      return webpackConfig;
    },
  },
  devServer: {
    open: false,
    hot: true,
    liveReload: false, // Use hot reload instead
  },
};