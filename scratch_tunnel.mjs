import { startTunnel } from 'untun';

async function main() {
  console.log('Starting Cloudflare tunnel for port 5173...');
  const tunnel = await startTunnel({
    port: 5173,
    url: 'http://localhost:5173'
  });
  
  if (tunnel) {
    const url = await tunnel.getURL();
    console.log('====================================');
    console.log('TUNNEL READY AT:', url);
    console.log('====================================');
  }
}

main().catch(err => {
  console.error('Tunnel error:', err);
});
