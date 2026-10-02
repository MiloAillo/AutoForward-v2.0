# AutoForward v2.0

WhatsApp Auto-Forward Bot with AI-powered message filtering.
The new AutoForward that is 100x cleaner and less confusing code structure.

## Changelog
- Added AI Powered filtering
- Environment variables configuration
- Docker support

## Next Update
- Group Chat History so the AI decision have reference to the above chat.
- forwarding image, forwarding forwarded message, and other cases.

## Setup

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   
   Copy `.env.example` to `.env` and fill in your configuration:
   ```bash
   cp .env.example .env
   ```

3. **Required Environment Variables**

   | Variable | Description | Example |
   |----------|-------------|---------|
   | `ADMIN_NUMBER` | Your WhatsApp number (without + or country code) | `628123456789` |
   | `OPENAI_API_KEY` | API key for OpenAI-compatible service | `sk-xxx` |
   | `OPENAI_BASE_URL` | Base URL for model provider API | `http://localhost:20128/v1` |

4. **Optional Environment Variables**

   | Variable | Default | Description |
   |----------|---------|-------------|
   | `AI_MODEL_NAME` | `ultimate` | AI model for message classification |
   | `STORAGE_DIR` | `./storage` | Directory for JSON storage files |
   | `AUTH_STATE_DIR` | `auth` | Directory for WhatsApp auth state |
   | `CACHE_TTL_SECONDS` | `300` | Cache TTL for group metadata (5 min) |
   | `GROUP_CACHE_TTL_SECONDS` | `900` | Group cache TTL in WASocket (15 min) |

5. **Run the bot**
   ```bash
   npm start
   ```

## Docker Deployment

### Using Docker Compose (Recommended)

1. **Configure environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

2. **Build and run with Docker Compose**
   ```bash
   docker-compose up -d
   ```

3. **View logs**
   ```bash
   docker-compose logs -f
   ```

4. **Scan QR code**
   
   On first run, the bot will display a QR code. Scan it with WhatsApp to authenticate.

5. **Stop the bot**
   ```bash
   docker-compose down
   ```

### Using Docker directly

1. **Build the image**
   ```bash
   docker build -t autoforward-bot .
   ```

2. **Run the container**
   ```bash
   docker run -d \
     --name autoforward-bot \
     --env-file .env \
     -v $(pwd)/storage:/app/storage \
     -v $(pwd)/auth:/app/auth \
     -it \
     autoforward-bot
   ```

3. **View logs**
   ```bash
   docker logs -f autoforward-bot
   ```

### Important Docker Notes

- The `auth/` and `storage/` directories are persisted as Docker volumes
- Your WhatsApp session will be saved in the `auth/` directory
- Forward rules and listened groups are saved in the `storage/` directory
- The container needs TTY (`-it` or `tty: true`) for QR code display

## Features

- AI-powered message filtering based on custom criteria
- Forward messages from listened groups to target groups
- Admin commands for managing groups and forward rules
- Caching for improved performance