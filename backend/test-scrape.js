const { search } = require('duck-duck-scrape');

async function run() {
  try {
    const results = await search('Node.js');
    console.log(results.results.slice(0, 3));
  } catch (e) {
    console.error(e);
  }
}
run();
