# Local HTTPS for MindAR dev

Browsers require **secure context** for `getUserMedia()` (camera). `localhost`
is treated as secure, but testing on a phone over LAN needs HTTPS with a
self-signed certificate.

## Vite with mkcert

```bash
# one-time install
brew install mkcert          # macOS
choco install mkcert         # Windows
mkcert -install

# per-project cert
cd my-mindar-app
mkcert localhost 192.168.1.42  # your LAN IP
# generates localhost+1.pem and localhost+1-key.pem
```

Then `vite.config.js`:
```javascript
import { defineConfig } from 'vite';
import fs from 'node:fs';

export default defineConfig({
  server: {
    https: {
      key:  fs.readFileSync('./localhost+1-key.pem'),
      cert: fs.readFileSync('./localhost+1.pem')
    },
    host: '0.0.0.0'
  }
});
```

Open on phone: `https://192.168.1.42:5173` — accept the cert warning once.

## Vite CLI shortcut (no cert files)

For LAN testing only, you can use `--https` which generates a self-signed
cert automatically:

```bash
vite --https --host 0.0.0.0
```

You'll still need to accept the cert warning in the browser. **Don't ship
this to production** — production should use a real cert from Let's Encrypt.

## Production HTTPS

- **Vercel / Netlify / Cloudflare Pages** — automatic HTTPS via Let's Encrypt.
- **GitHub Pages** — supports custom domains with HTTPS via Let's Encrypt.
- **Self-hosted** — use Caddy (auto-HTTPS) or nginx + certbot.

## Why not HTTP?

- Camera access: blocked
- Service workers: blocked
- Many Web APIs: blocked
- Mixed-content warnings for any HTTP resource

Always HTTPS, even in dev.