const https = require('https');

function testUrl(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const options = {
      method: method,
      headers: {
        'Accept': 'application/json'
      }
    };
    
    const req = https.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log(`${method} Status: ${res.statusCode}`);
        console.log(`${method} Response: ${data.substring(0, 500)}`);
        resolve({ status: res.statusCode, data });
      });
    });

    req.on('error', (err) => {
      console.error(`${method} error:`, err.message);
      reject(err);
    });

    req.end();
  });
}

async function runTests() {
  const url = 'https://n8n.srv1010832.hstgr.cloud/webhook/0c8d3fa1-25e7-417a-979b-3bbca5727b64';
  try {
    await testUrl(url, 'GET');
    await testUrl(url, 'POST');
  } catch (err) {
    // Errors logged in testUrl
  }
}

runTests();

