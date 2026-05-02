const wiki = require('wikipedia');

async function run() {
  try {
    const search = await wiki.search('Node.js');
    if (search.results && search.results.length > 0) {
      const page = await wiki.page(search.results[0].title);
      const summary = await page.summary();
      console.log(summary.extract);
    }
  } catch (e) {
    console.error(e);
  }
}
run();
