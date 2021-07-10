// vite.config.js
export default {
    // config options
    root:'./src/',
    build:{
        chunkSizeWarningLimit:64000
    },
    server: {
        fs: {
          // Allow serving files from one level up to the project root
          allow: ['..']
        }
      }
}