const https = require("https");

const data = JSON.stringify({
  webhookId: "6ab3e666fdda13a806123ca3"
});

const req = https.request({
  hostname: "zernio.com",
  path: "/api/v1/webhooks/test",
  method: "POST",
  headers: {
    "Authorization": "Bearer sk_828bb9e287b9c83017cacbd8e5f12f907cd64057baf69d6eb311b8cb5aa235a5",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
}, (res) => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => console.log("Zernio Webhook Test Ping Response:", body));
});

req.write(data);
req.end();
