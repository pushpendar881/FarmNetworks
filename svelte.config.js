import adapter from '@sveltejs/adapter-node';
/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter({
      out: 'build' // This is where index.js and server files will go
    })
  }
};
export default config;






