const { spawn } = require("child_process");
const https = require("https");
const http = require("http");
const fs = require("fs");
const path = require("path");

const ZERNIO_API_KEY = "sk_828bb9e287b9c83017cacbd8e5f12f907cd64057baf69d6eb311b8cb5aa235a5";
const WEBHOOK_SECRET = "448087d89461ad0b57fc5cff387b4cda91d82cc767efd947e6a74b51ca8e945e";

console.log("[1/4] Spawning cloudflared tunnel to http://localhost:8080...");
const tunnel = spawn("cloudflared.exe", ["tunnel", "--url", "http://localhost:8080"]);

let tunnelUrl = null;

function updateZernio(url) {
  const webhookUrl = `${url}/webhooks/zernio`;
  console.log(`[3/4] Updating Zernio webhook to: ${webhookUrl}...`);

  const payload = JSON.stringify({
    name: "whatsapp_necto",
    url: webhookUrl,
    secret: WEBHOOK_SECRET,
    events: [
      "message.received",
      "message.sent",
      "message.delivered",
      "message.read",
      "message.failed",
      "conversation.started"
    ],
    isActive: true
  });

  const req = https.request({
    hostname: "zernio.com",
    path: "/api/v1/webhooks/settings",
    method: "POST",
    headers: {
      "Authorization": `Bearer ${ZERNIO_API_KEY}`,
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload)
    }
  }, (res) => {
    let body = "";
    res.on("data", c => body += c);
    res.on("end", () => {
      console.log(`[4/4] Zernio response (${res.statusCode}):`, body);
      console.log("\n=======================================================");
      console.log("🚀 TUNNEL AND ZERNIO SYNCHRONIZATION COMPLETE!");
      console.log(`Public Tunnel URL: ${url}`);
      console.log(`Webhook URL:       ${webhookUrl}`);
      console.log("=======================================================\n");
    });
  });

  req.on("error", (err) => {
    console.error("[ERROR] Failed to update Zernio:", err.message);
  });

  req.write(payload);
  req.end();
}

function verifyAndSync(url) {
  console.log(`[2/4] Verifying tunnel connectivity at ${url}/health...`);
  setTimeout(() => {
    https.get(`${url}/health`, (res) => {
      console.log(`Tunnel /health check status: ${res.statusCode}`);
      updateZernio(url);
    }).on("error", (e) => {
      console.log(`Retrying /health check in 2s (${e.message})...`);
      setTimeout(() => verifyAndSync(url), 2000);
    });
  }, 1500);
}

function handleData(data) {
  const text = data.toString();
  process.stdout.write(text);
  if (!tunnelUrl) {
    const match = text.match(/https:\/\/[a-zA-Z0-9-]+\.trycloudflare\.com/);
    if (match) {
      tunnelUrl = match[0];
      console.log(`\n>>> DETECTED TUNNEL URL: ${tunnelUrl} <<<\n`);
      verifyAndSync(tunnelUrl);
    }
  }
}

tunnel.stdout.on("data", handleData);
tunnel.stderr.on("data", handleData);

tunnel.on("close", (code) => {
  console.log(`Tunnel process exited with code ${code}`);
});
