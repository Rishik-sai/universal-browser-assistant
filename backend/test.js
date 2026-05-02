require('dotenv').config();
const agentPipeline = require('./src/services/agentPipeline');

async function test() {
  console.log("Testing processMessage...");
  try {
    const res = await agentPipeline.processMessage("click on the login button", "http://example.com", "test-session");
    console.log("Response:", res);
  } catch (err) {
    console.error("Test Error:", err);
  }
}
test();
