// vite.config.js
export default {
    // config options
    root:'./src/',
    assetsInclude:'./src/soundEffects',
    build:{
        chunkSizeWarningLimit:1000
    },
    server: {
        fs: {
          // Allow serving files from one level up to the project root
          allow: ['..']
        }
      }
}