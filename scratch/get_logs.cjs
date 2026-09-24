const https = require("https");

const req = https.request({
  hostname: "zernio.com",
  path: "/api/v1/webhooks/logs?limit=3",
  method: "GET",
  headers: {
    "Authorization": "Bearer sk_828bb9e287b9c83017cacbd8e5f12f907cd64057baf69d6eb311b8cb5aa235a5",
  }
}, (res) => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => console.log("Zernio Webhook Logs:", JSON.stringify(JSON.parse(body), null, 2)));
});

req.end();
