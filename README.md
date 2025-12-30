# Kan (Self-Hosted Fork)

A self-hosted Kanban board application for personal/team use. Forked from [kanbn/kan](https://github.com/kanbn/kan).

> **This is a modified version.** Per the AGPLv3 license, this fork [mochimwaji/kan](https://github.com/mochimwaji/kan) removes cloud-specific features (Lingui i18n, S3 storage, marketing pages, billing, analytics) for streamlined self-hosting.

## Features

- 👁️ **Board Visibility**: Control who can view and edit your boards
- 🤝 **Workspace Members**: Invite members and collaborate with your team
- 🎨 **Customizable Lists**: Color code your lists for better organization
- 🎨 **Theme Presets**: Choose from 7 beautiful color themes (Ocean Blue, Forest Green, etc.)
- 📅 **Calendar View**: View cards by due date with drag-and-drop rescheduling
- 🔍 **Labels & Filters**: Organize and find cards quickly
- 💬 **Comments**: Discuss and collaborate with your team
- 📝 **Activity Log**: Track all card changes with detailed history
- 📁 **Local File Storage**: Avatars and attachments stored locally (no S3 required)
- ✨ **Enhanced Animations**: Smooth transitions for page navigation and sidebar toggles
- 📧 **Email Notifications**: Configurable digest and change notifications via SMTP
- 📱 **Mobile & PWA**: Installable as PWA with touch-optimized calendar and offline support

## Quick Start (Docker)

```yaml
# docker-compose.yml
services:
  web:
    image: ghcr.io/mochimwaji/kan:latest
    container_name: kan-web
    ports:
      - "3000:3000"
    environment:
      NEXT_PUBLIC_BASE_URL: http://localhost:3000
      BETTER_AUTH_SECRET: your_auth_secret_here
      POSTGRES_URL: postgresql://kan:your_password@postgres:5432/kan_db
      NEXT_PUBLIC_ALLOW_CREDENTIALS: true
    volumes:
      - kan_data:/app/data
    depends_on:
      - postgres
    restart: unless-stopped

  postgres:
    image: postgres:15
    container_name: kan-db
    environment:
      POSTGRES_DB: kan_db
      POSTGRES_USER: kan
      POSTGRES_PASSWORD: your_password
    volumes:
      - kan_postgres_data:/var/lib/postgresql/data
    restart: unless-stopped

volumes:
  kan_data:
  kan_postgres_data:
```

```bash
docker compose up -d
```

Access at http://localhost:3000

## Local Development

```bash
git clone https://github.com/mochimwaji/kan.git
cd kan
pnpm install
cp .env.example .env  # Configure your environment
pnpm db:migrate
pnpm dev
```

## Environment Variables

| Variable                                                     | Description                        | Required          |
| ------------------------------------------------------------ | ---------------------------------- | ----------------- |
| `POSTGRES_URL`                                               | PostgreSQL connection string       | Yes               |
| `BETTER_AUTH_SECRET`                                         | Auth encryption secret (32+ chars) | Yes               |
| `NEXT_PUBLIC_BASE_URL`                                       | Public URL of your installation    | Yes               |
| `NEXT_PUBLIC_ALLOW_CREDENTIALS`                              | Enable email/password login        | No                |
| `NEXT_PUBLIC_DISABLE_EMAIL`                                  | Disable email features             | No                |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`       | Email configuration                | For email         |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`                   | Google OAuth                       | For Google login  |
| `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`                   | GitHub OAuth                       | For GitHub login  |
| `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`                 | Discord OAuth                      | For Discord login |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_DISCOVERY_URL` | Generic OIDC                       | For OIDC login    |
| `EMAIL_APP_NAME`                                             | Custom branding for email header   | No                |

See `.env.example` for the complete list.

## Tech Stack

- [Next.js](https://nextjs.org/) - React framework
- [tRPC](https://trpc.io/) - Type-safe API
- [Drizzle ORM](https://orm.drizzle.team/) - Database ORM
- [Better Auth](https://better-auth.com/) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling

## What's Different from Upstream

### Added

- ✅ **Calendar View** - Month view with drag-and-drop rescheduling
- ✅ **Local File Storage** - No S3 required, files stored locally
- ✅ **Collapsible Lists** - Collapse/expand lists with persistent state
- ✅ **Due Date Urgency Colors** - Red/orange/yellow based on deadline
- ✅ **Theme Presets** - 7 predefined color themes
- ✅ **Board Transitions** - Smooth animations between boards
- ✅ **Multi-Card Drag** - Bulk update cards in calendar view
- ✅ **Mobile Calendar** - Touch-optimized vertical day-row layout
- ✅ **PWA Support** - Installable app with offline page and service worker

### Removed (for simpler self-hosting)

- ❌ Lingui i18n (English only)
- ❌ S3 storage (local filesystem)
- ❌ Marketing pages (home, pricing, testimonials)
- ❌ Legal pages (privacy, terms)
- ❌ Analytics (PostHog, Umami)
- ❌ Novu Notifications (replaced with custom SMTP-based system)
- ❌ Billing (Stripe)
- ❌ Trello import

## License

[AGPLv3](LICENSE) - Original work by [kanbn](https://github.com/kanbn/kan)

Per the license, this modified version [mochimwaji/kan](https://github.com/mochimwaji/kan) provides source code access and carries prominent notices of modifications. See [CHANGELOG.md](CHANGELOG.md) for details.
