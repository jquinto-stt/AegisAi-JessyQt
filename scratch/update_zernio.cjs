const https = require("https");

const data = JSON.stringify({
  name: "whatsapp_necto",
  url: "https://consumption-counted-forecast-collins.trycloudflare.com/api/conversaciones/webhook/zernio",
  secret: "448087d89461ad0b57fc5cff387b4cda91d82cc767efd947e6a74b51ca8e945e",
  events: ["message.received", "message.edited", "message.delivered", "message.failed", "referral.received", "reaction.received", "message.read", "message.deleted", "message.sent"],
  isActive: true
});

const req = https.request({
  hostname: "zernio.com",
  path: "/api/v1/webhooks/settings",
  method: "POST",
  headers: {
    "Authorization": "Bearer sk_828bb9e287b9c83017cacbd8e5f12f907cd64057baf69d6eb311b8cb5aa235a5",
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(data)
  }
}, (res) => {
  let body = "";
  res.on("data", chunk => body += chunk);
  res.on("end", () => console.log("Zernio API Response:", body));
});

req.write(data);
req.end();
