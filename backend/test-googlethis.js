const google = require('googlethis');

async function run() {
  try {
    const options = {
      page: 0, 
      safe: false,
      additional_params: { hl: 'en' }
    };
    const response = await google.search('Node.js', options);
    console.log(response.results.slice(0, 3));
  } catch (e) {
    console.error(e);
  }
}
run();
