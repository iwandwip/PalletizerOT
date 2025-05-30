# ESP32 Palletizer Control System

Modern web interface for ESP32-based palletizer robotics control.

## Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **ESP32 device** with palletizer firmware

## Installation & Setup

### 1. Clone Repository
```bash
git clone https://github.com/username/esp32-palletizer-control.git
cd esp32-palletizer-control
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Fix React Compatibility
Next.js 14 creates projects with React 19 by default. shadcn/ui requires React 18 for stability.

```bash
# Downgrade to React 18
npm install react@^18.0.0 react-dom@^18.0.0
npm install --save-dev @types/react@^18.0.0 @types/react-dom@^18.0.0
```

### 4. Initialize shadcn/ui
```bash
npx shadcn@latest init
```

**Configuration prompts:**
- TypeScript: **Yes**
- Style: **Default**
- Base color: **Slate**
- Global CSS file: **src/app/globals.css**
- CSS variables: **Yes**
- Tailwind prefix: **No**
- Import alias components: **src/components**
- Import alias utils: **src/lib/utils**

### 5. Install Required Components
```bash
npx shadcn@latest add button card tabs slider badge textarea input label toast progress switch alert
```

### 6. Install Additional Dependencies
```bash
npm install lucide-react clsx class-variance-authority
```

## Development

### Start Development Server
```bash
npm run dev
```
Access at: `http://localhost:3000`

### Environment Configuration
The app automatically detects connection state:
- **Connected**: All controls enabled, real-time updates
- **Disconnected**: Controls disabled, offline editing available

## Project Structure

```
esp32-palletizer-control/
├── src/
│   ├── app/
│   │   ├── favicon.ico
│   │   ├── globals.css          # Global styles + Tailwind
│   │   ├── layout.tsx           # Root layout with theme support
│   │   └── page.tsx             # Main application
│   │
│   ├── components/
│   │   ├── ui/                  # shadcn/ui components
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── tabs.tsx
│   │   │   ├── slider.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── textarea.tsx
│   │   │   ├── input.tsx
│   │   │   ├── label.tsx
│   │   │   ├── switch.tsx
│   │   │   └── alert.tsx
│   │   │
│   │   ├── system-controls.tsx  # PLAY/PAUSE/STOP/ZERO buttons
│   │   ├── speed-panel.tsx      # Global + Individual speed tabs
│   │   ├── command-editor.tsx   # Editor/Upload/Config tabs
│   │   └── status-display.tsx   # Status badge + real-time info
│   │
│   └── lib/
│       ├── api.ts              # ESP32 API client
│       ├── types.ts            # TypeScript interfaces
│       ├── hooks.ts            # Custom React hooks
│       └── utils.ts            # Utility functions (shadcn)
│
├── public/                     # Static assets
├── .next/                      # Next.js build cache
├── components.json             # shadcn/ui configuration
├── next.config.ts              # Next.js configuration
├── tailwind.config.ts          # Tailwind configuration (optional)
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies and scripts
└── README.md
```

## Build for Production

### Standard Build (Development Testing)
```bash
npm run build
npm run start
```

### ESP32 Deployment Build

#### Option 1: Static Export (Recommended)
Update `next.config.ts`:
```typescript
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  distDir: 'out',
  images: { unoptimized: true },
}

export default nextConfig
```

Build static files:
```bash
npm run build
```

Output: `out/index.html` (single file for ESP32)

#### Option 2: Single File Bundle
Create `scripts/bundle-single-file.js`:
```javascript
const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, '../out/index.html');
let html = fs.readFileSync(htmlPath, 'utf8');

// Inline CSS files
const cssFiles = fs.readdirSync(path.join(__dirname, '../out/_next/static/css/'));
cssFiles.forEach(file => {
  if (file.endsWith('.css')) {
    const cssPath = path.join(__dirname, '../out/_next/static/css/', file);
    const css = fs.readFileSync(cssPath, 'utf8');
    html = html.replace(
      `<link rel="stylesheet" href="/_next/static/css/${file}">`,
      `<style>${css}</style>`
    );
  }
});

// Inline JS files
const jsFiles = fs.readdirSync(path.join(__dirname, '../out/_next/static/chunks/'));
jsFiles.forEach(file => {
  if (file.endsWith('.js')) {
    const jsPath = path.join(__dirname, '../out/_next/static/chunks/', file);
    const js = fs.readFileSync(jsPath, 'utf8');
    html = html.replace(
      `<script src="/_next/static/chunks/${file}"></script>`,
      `<script>${js}</script>`
    );
  }
});

fs.writeFileSync(path.join(__dirname, '../out/palletizer.html'), html);
console.log('✅ Single file created: out/palletizer.html');
```

Add script to `package.json`:
```json
{
  "scripts": {
    "build:esp32": "next build && node scripts/bundle-single-file.js"
  }
}
```

## ESP32 Backend API

The web interface communicates with ESP32 via HTTP endpoints:

### Control Commands
```
POST /command        - Send system commands (PLAY, PAUSE, STOP, ZERO)
POST /write          - Save command scripts
GET  /get_commands   - Load current commands
POST /upload         - Upload command files
GET  /download_commands - Download commands as file
```

### Configuration
```
GET  /status              - System status
GET  /timeout_config      - Get timeout configuration
POST /timeout_config      - Update timeout configuration
GET  /timeout_stats       - Get timeout statistics
POST /clear_timeout_stats - Clear timeout statistics
```

### Real-time Updates
```
GET /events - Server-Sent Events endpoint for live updates
```

## Configuration

### Tailwind CSS v4 (Zero-Config)
Tailwind v4 works without configuration file. For custom breakpoints, create `tailwind.config.ts`:
```typescript
import type { Config } from "tailwindcss"

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      screens: {
        'xs': '475px',
      },
    },
  },
}

export default config
```

### Dark Mode
Automatic dark mode support via:
- System preference detection
- Manual toggle with persistent storage
- CSS class-based switching

### Environment Variables
Create `.env.local` for custom configuration:
```
NEXT_PUBLIC_ESP32_HOST=192.168.1.100
NEXT_PUBLIC_API_BASE=/api
```

## Troubleshooting

### Common Issues

**React version conflicts:**
```bash
rm -rf node_modules package-lock.json
npm install
npm install react@^18.0.0 react-dom@^18.0.0
```

**shadcn/ui installation errors:**
```bash
npx shadcn@latest init --force
```

**Build errors in production:**
- Check `next.config.ts` syntax
- Verify all imports are correct
- Ensure all dependencies installed

**ESP32 connection issues:**
- Check network connectivity
- Verify ESP32 IP address
- Check ESP32 firmware endpoints

### Development vs Production

**Development (`npm run dev`):**
- Hot reload enabled
- Source maps available
- Error overlay
- All debugging tools

**Production (`npm run build`):**
- Optimized bundles
- Minified code
- Static file generation
- Ready for ESP32 deployment

## Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit pull request

## License

MIT License - see LICENSE file for details.