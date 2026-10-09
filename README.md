# AutoForward v2.1b

Intelligent WhatsApp message routing bot powered by AI that can forward, summarize, or send files between groups based on customizable rules. Built with TypeScript and MySQL, it features sophisticated message analysis, batch processing, and complete media support (AI Vision is currently not supported.).

---

## Table of Contents
- [Features](#features)
- [Installation](#installation)
  - [Docker Setup (Recommended)](#docker-setup-recommended)
  - [Local Development Setup](#local-development-setup)
- [Configuration](#configuration)
- [Usage](#usage)
  - [Getting Started](#getting-started)
  - [Admin Commands](#admin-commands)
  - [Usage Examples](#usage-examples)
- [Architecture](#architecture)
- [Changelog](#changelog)
- [Limitation](#limitation)
- [Next Fix & Update](#next-fix--update)

---

## Features

- **AI-Powered Message Analysis** - Uses OpenAI-compatible models to intelligently route messages
- **Many-to-Many Rule System** - Reusable rules can be applied to multiple forward routes
- **Batch Processing** - Configurable cron job processes messages in batches (default: every 30 minutes)
- **Complete Media Support** - Forward images, videos, and documents (PDF, DOCX, XLSX, etc.)
- **Auto-Cleanup** - Automatic message cleanup with configurable retention (default: 7 days)
- **MySQL Database** - Persistent storage with Prisma ORM
- **Docker Ready** - Production deployment with Docker Compose

---

## Installation

### Docker Setup (Recommended)

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "AutoForward v2.0"
   ```

2. **Create environment file**
   ```bash
   cp .env.example .env
   ```

3. **Configure environment variables**
   
   Edit `.env` and set the required values:
   ```bash
   # Your WhatsApp number (without + or country code)
   ADMIN_NUMBER=628123456789
   
   # OpenAI-compatible API configuration
   OPENAI_API_KEY=your-api-key-here
   OPENAI_BASE_URL=http://localhost:20128/v1
   AI_MODEL_NAME=ultimate
   
   # Database credentials (change password for production)
   DATABASE_PASSWORD=your_secure_password
   ```

4. **Start the containers**
   ```bash
   docker-compose up -d
   ```

5. **View logs and scan QR code**
   ```bash
   docker logs autoforward-bot -f
   ```
   
   Scan the QR code with WhatsApp to authenticate.

6. **Verify bot is running**
   
   Wait for the log message: `WhatsApp Connection Ready`

### Local Development Setup

1. **Prerequisites**
   - Node.js 22+ with experimental TypeScript support
   - MySQL 8.0+
   - npm or yarn

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup database**
   
   Create a MySQL database and update `.env`:
   ```bash
   DATABASE_URL="mysql://user:password@localhost:3306/autoforward"
   ```

4. **Run database migrations**
   ```bash
   npx prisma migrate deploy
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

---

## Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ADMIN_NUMBER` | Yes | - | Your WhatsApp number (without + or country code, e.g., 628123456789) |
| `OPENAI_API_KEY` | Yes | - | API key for OpenAI-compatible service |
| `OPENAI_BASE_URL` | Yes | - | Base URL for the model provider API |
| `AI_MODEL_NAME` | No | `ultimate` | AI model name to use |
| `DATABASE_URL` | Yes | - | MySQL connection string |
| `BATCH_FORWARD_INTERVAL_MINUTES` | No | `30` | How often to process unsent messages (in minutes) |
| `CLEANUP_RETENTION_DAYS` | No | `7` | How long to keep messages before deletion (minimum 1 day) |
| `STORAGE_DIR` | No | `./storage` | Directory for file storage |
| `AUTH_STATE_DIR` | No | `auth` | Directory for WhatsApp authentication state |
| `CACHE_TTL_SECONDS` | No | `300` | Cache TTL for group metadata |

### Docker vs Local Configuration

**Docker**: Database host is `mysql` (service name in docker-compose)
```bash
DATABASE_URL="mysql://autoforward:password@mysql:3306/autoforward"
```

**Local**: Database host is `localhost` or your MySQL server IP
```bash
DATABASE_URL="mysql://autoforward:password@localhost:3306/autoforward"
```

---

## Usage

### Getting Started

1. **Authenticate with WhatsApp**
   
   On first run, scan the QR code displayed in the logs with your WhatsApp.

2. **Wait for connection**
   
   Wait until you see `[WASocket] WhatsApp Connection Ready` in the logs.

3. **Send commands**
   
   Send admin commands directly to the bot's WhatsApp number.

### Admin Commands

All commands must be sent from the admin number configured in `ADMIN_NUMBER`.

#### General Commands

```
.help
```
Show all available commands.

```
.list
```
List all WhatsApp groups with their JIDs (group identifiers).

#### Rule Management

```
.createRule <title> | <description> | <rule>
```
Create a new reusable AI rule for message filtering.

**Example:**
```
.createRule Urgent | Forward urgent only | Only forward messages containing 'urgent' or 'ASAP'
```

**Limits:** Title max 50 chars, description max 200 chars

```
.getRules
```
List all created rules (ID, title, description).

```
.getRule <ruleId>
```
Show full details of a specific rule including where it's used.

**Example:**
```
.getRule 1
```

```
.removeRule <ruleId>
```
Delete a rule (blocked if used in any forward items).

**Example:**
```
.removeRule 1
```

#### Forward Management

```
.createForward <listenJID> <sendJID> [ruleId1 ruleId2 ...]
```
Create a forward item to route messages from one group to another.

**Example:**
```
.createForward 120363314139359903@g.us 120363320045260346@g.us 1 2
```

- No rules = forwards ALL messages
- With rules = only forwards if AI approves based on rules

```
.getForwards
```
List all forward items with group names and rules.

```
.getForward <forwardId>
```
Show full details of a specific forward item.

```
.deleteForward <forwardId>
```
Delete a forward item.

```
.linkRule <forwardId> <ruleId>
```
Add a rule to an existing forward item.

```
.unlinkRule <forwardId> <ruleId>
```
Remove a rule from a forward item.

### Usage Examples

#### Example 1: Forward All Messages

Forward everything from Group A to Group B:

1. Get group JIDs:
   ```
   .list
   ```

2. Create forward without rules:
   ```
   .createForward 120363314139359903@g.us 120363320045260346@g.us
   ```

#### Example 2: Filter Urgent Messages Only

Forward only urgent messages:

1. Create a rule:
   ```
   .createRule Urgent Filter | Only urgent messages | Forward messages containing 'urgent', 'ASAP', or 'important'
   ```

2. Create forward with the rule:
   ```
   .createForward 120363314139359903@g.us 120363320045260346@g.us 1
   ```

#### Example 3: Multiple Rules

Apply multiple filtering rules:

1. Create rules:
   ```
   .createRule Work Only | Work-related filter | Forward messages about work, projects, or deadlines
   .createRule No Spam | Block spam | Skip promotional messages or advertisements
   ```

2. Create forward with both rules:
   ```
   .createForward 120363314139359903@g.us 120363320045260346@g.us 1 2
   ```

---

## Architecture

### System Overview

```
WhatsApp Groups
      |
      v
 [Message Handler] -----> [Database: Chat table]
      |                         |
      |                         v
      |                   [Cron: Batch Forward]
      |                         |
      |                         v
      |                   [AI Analysis]
      |                    (with rules)
      |                         |
      +-------------------------+
                |
                v
         [AI Decision Tools]
         - forwardMessages
         - writeMessages
         - writeMessagesWithMedia
         - sendMedia
         - skipMessages
         - markMessagesAsSent
                |
                v
          Target Groups
```

### Data Flow

1. **Message Reception**: Bot receives messages from groups configured in `ForwardItem.listenId`
2. **Storage**: Messages stored in `Chat` table with `isSent: false`
3. **Batch Processing**: Cron job runs every N minutes (configurable)
4. **AI Analysis**: For each forward item, unsent messages are analyzed with associated rules
5. **Decision & Action**: AI decides to forward, summarize, send media, skip, or mark as sent
6. **State Update**: Processed messages are marked `isSent: true`
7. **Cleanup**: Weekly cron job deletes messages older than retention period

### Database Schema

- **ForwardItem**: Many-to-many mapping between listen groups and send groups
- **SendRule**: Reusable AI rules that can be attached to multiple forward items
- **Chat**: Message queue with media paths, sent status, and timestamps

### AI Capabilities

The AI can perform the following actions:

- **Forward original messages** unchanged to target groups
- **Summarize multiple messages** into concise text
- **Send media with modified captions** to combine text and files
- **Skip incomplete conversations** (e.g., waiting for question to be answered)
- **Filter spam/irrelevant messages** by marking them sent without forwarding

The AI considers:
- Custom rules defined by the user
- Message fragmentation (combines related short messages)
- Question-answer patterns (waits for complete context)
- Message volume (prefers summarization for 3+ messages)

---

## Changelog
- Reusable rules with many-to-many relationships between listen groups and send groups.
- Migration from file based storage to Prisma ORM + MySQL database.
- Image, video, and document support.
- Replaced forward only mechanism to AI + rules driven to have the ability to summarize, send media, or forward multiple messages.
- implement cron job batch processing and cleanup with customisable time period

## Limitation
AI Vision currently not supported. Meaning any media message (image, video, documents) will not be processed directly to the AI.
The model can still see that there is a media message present but is unable to process what is inside.
The model can still forward or send the media message itself with the help of the file name and the unsent messages around it as additional context.

## Next Fix & Update
- Code refactor
- Cleanup saved files
- Assess if AI Vision support is viable

---

## License

This project is provided as-is for educational and personal use.
