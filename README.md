# AffSign

IPA signing web application with OTA installation support.

## Features

- Drag & drop IPA upload with app info parsing (name, icon, bundle ID, version)
- P12 certificate parsing and validation
- MobileProvision validation
- IPA signing with certificate and provisioning profile
- OTA manifest generation for over-the-air installation
- QR code generation for install links
- Signing history with download, install, and delete actions
- Automatic temp file cleanup
- Support for IPA files up to 5GB
- Streaming file handling
- Docker deployment with nginx reverse proxy

## Tech Stack

**Frontend:**
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Framer Motion
- Lucide React icons

**Backend:**
- Node.js + Express + TypeScript
- Multer (file uploads)
- node-forge (certificate parsing)
- QRCode generation
- Winston (logging)

## Quick Start

### Prerequisites

- Node.js 18+
- npm or yarn
- OpenSSL (for certificate operations)

### Development

```bash
# Install dependencies
npm run install:all

# Copy environment config
cp .env.example .env

# Start dev servers
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:3001

### Production

```bash
# Build
npm run build

# Start
cd server && npm start
```

## Docker

```bash
# Build and run
docker-compose up -d --build

# Stop
docker-compose down
```

The app will be available at http://localhost:80 (via nginx) or http://localhost:3001 (direct).

## Project Structure

```
affsign/
├── client/                    # React frontend
│   ├── src/
│   │   ├── api/              # API client
│   │   ├── components/       # UI components
│   │   ├── App.tsx           # Main app
│   │   ├── main.tsx          # Entry point
│   │   └── index.css         # Global styles
│   ├── index.html
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── postcss.config.js
├── server/                    # Express backend
│   ├── src/
│   │   ├── routes/           # API routes
│   │   ├── services/         # Business logic
│   │   ├── middleware/        # Express middleware
│   │   ├── config.ts         # Configuration
│   │   ├── logger.ts         # Winston logger
│   │   ├── types.ts          # TypeScript types
│   │   └── index.ts          # Server entry
│   └── tsconfig.json
├── uploads/                   # Uploaded IPA files
├── signed/                    # Signed IPA files
├── manifests/                 # OTA manifest plists
├── public/install/            # Generated install pages
├── temp/                      # Temporary files (auto-cleaned)
├── logs/                      # Application logs
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
├── .env.example
└── package.json
```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/upload` | Upload IPA/P12/MobileProvision |
| POST | `/api/sign` | Sign an IPA |
| GET | `/api/history` | Get signing history |
| GET | `/api/app/:id` | Get app details |
| DELETE | `/api/app/:id` | Delete an app |
| GET | `/api/install/:id` | Install page |
| GET | `/api/download/:id` | Download signed IPA |

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 3001 | Server port |
| HOST | 0.0.0.0 | Server host |
| DOMAIN | localhost:3001 | Domain for links |
| PROTOCOL | http | Protocol for links |
| MAX_FILE_SIZE | 5368709120 | Max upload size (5GB) |
| CLEANUP_INTERVAL_MS | 3600000 | Cleanup interval (1h) |
| FILE_MAX_AGE_MS | 86400000 | Max file age (24h) |
| LOG_LEVEL | info | Log level |

## How It Works

1. Upload an IPA file - the app extracts and displays app info
2. Upload a P12 certificate and enter its password
3. Upload a MobileProvision profile
4. Click "Sign IPA" - the backend validates everything and signs the IPA
5. After signing, you get:
   - A download link for the signed IPA
   - An OTA install link (`itms-services://` protocol)
   - A QR code for scanning on other devices
   - An install page at `/api/install/:id`

## License

MIT
