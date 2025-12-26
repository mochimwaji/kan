# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/kanbn/kan/compare/v0.3.0...HEAD)

### Added

#### 🎨 UI/UX Enhancements

- **Theme Presets**: Added 7 predefined color themes (Default Light/Dark, Ocean Blue, Forest Green, Sunset Warm, Lavender Dream, Slate Gray) with `ThemePresetSelector`.
- **Board Transition Animations**: Smooth morph animations when navigating between boards list and board view.
- **Collapsible Lists**: Lists can be collapsed/expanded with persistent state and card count badges.
- **Due Date Urgency Coloring**: Contextual colors for due dates (red for overdue, orange for today, yellow for upcoming).
- **Sidebar Animations**: Smooth sliding transitions for left and right sidebars.
- **Card Decorations**: Added Lottie animations and icons for card properties (Labels, Members, etc.).

#### 🚀 New Features

- **Calendar View**: Month calendar view for boards (`v` shortcut) with drag-and-drop rescheduling.
- **Local File Storage**: Replaced S3 with local filesystem storage for avatars and attachments.
- **Multi-Drag Calendar Support**: Atomic updates when dragging multiple cards to calendar dates.
- **Email Notification System**: Custom SMTP-based notification system replacing Novu:
  - Notification subscription management in Settings UI
  - Configurable digest emails (daily/weekly) with card matching and filters
  - Immediate change notifications for card updates
  - Configurable branding via `EMAIL_APP_NAME` environment variable
  - Built-in SMTP test functionality
  - Scheduler for automated digest processing (hourly) and queue handling

#### 🛠️ Developer Experience (DX)

- **Section Headers**: Added clear dividers to large files (`board/index.tsx`, `*.repo.ts`) for better navigability.
- **DeleteConfirmation Component**: Reusable dialog consolidating 6 separate components (~207 lines removed).
- **useBoardKeyboardShortcuts Hook**: Extracted keyboard logic from the main board component.
- **JSDoc & Guides**: Added comprehensive JSDoc to repository functions and quality guidelines in `AGENTS.md`.

#### 🔧 Backend & Auth

- **OIDC Domain Limiting**: Ability to restrict logins to specific domains (#263).
- **SMTP Enhancements**: Added `SMTP_REJECT_UNAUTHORIZED` for custom SSL certificates (#262).
- **Root Redirect**: Root path (`/`) now redirects to `/login` for easier self-hosting.

- **Drag-and-Drop Library**: Migrated from deprecated `react-beautiful-dnd` to actively maintained `@hello-pangea/dnd` (API-compatible drop-in replacement).
- **React Query Configuration**: Added explicit stale time (30s), garbage collection time (5min), and disabled refetchOnWindowFocus for better performance.
- **Code Organization**: Improved structure of large files with section headers instead of extracting to smaller files, preserving critical coupling for two-phase visual state pattern.
- Improved page transition animations across workspace navigation (Boards, Templates, Members, Settings).
- Enhanced settings tab navigation with tab content fade transitions.
- Refined right sidebar button alignment to match left sidebar structure.
- List header now includes collapse toggle button and card count badge when collapsed.
- **Self-Hosted Focus**: Streamlined codebase for self-hosted deployments by removing cloud-specific features.

### Fixed

- **i18n Coverage**: Added Lingui `t` macro to `RevokeApiKeyConfirmation.tsx` (8 strings) and `NewApiKeyForm.tsx` (4 strings).
- **Lint Cleanup**: Resolved 34+ lint warnings in `board/index.tsx` including `any` type issues, unsafe member access, and unnecessary conditionals.
- **calendarOrder Typing**: Added `CardWithCalendarOrder` interface for proper typing of calendar order field.
- Fixed `@ts-expect-error` in `ChecklistItemRow.tsx` by using proper `React.FocusEvent` type.
- Fixed flashing issues during board navigation transitions.
- Fixed sidebar toggle icon directions for right-side drawer.
- Resolved scrollbar inconsistency in settings tabs.
- Fixed missed `<Trans>` component in `ActivityList.tsx` and missing `zodResolver` import in `UpdateBoardSlugForm.tsx`.

### Security

- Upgraded dependencies to reduce vulnerabilities from 34 to 10 (0 critical, 0 high).
- Updated `next` to ^15.5.8, `better-auth` to ^1.2.8, `nodemailer` to ^6.10.1.
- Added `pnpm.overrides` for transitive dependency security fixes.

### Removed

- **Lingui i18n**: Removed entire internationalization system (`@lingui/*` packages, translation files, macros). All strings now hardcoded in English.
- **Marketing Pages**: Removed home page (`/`), FAQs, Testimonials, Features, Logos, and CTA components.
- **Legal Pages**: Removed `/privacy` and `/terms` cloud service policy pages.
- **Email Unsubscribe**: Removed `/unsubscribe` page and related functionality.
- **S3 Storage**: Replaced with local filesystem storage (S3 support removed).
- **PostHog Analytics**: Removed analytics integration.
- **Novu Notifications**: Replaced with custom SMTP-based notification system (see New Features).
- Removed deprecated `@lingui/babel-preset-react` (replaced by Lingui 5.x macro system).
- Removed `StrictModeDroppable.tsx` wrapper (no longer needed with `@hello-pangea/dnd`).
- **Stripe billing** - Removed entire `packages/stripe`, billing UI, subscription schema.
- **Trello import** - Removed import routers, pages, API routes, and related schemas.
- **Non-English locales** - Removed fr, de, es, it, nl, pl, ru from `apps/web/src/locales/`.
- **LanguageSelector component** - Removed from settings and footer.
- **Docs app** - Removed `apps/docs/` documentation site.
- **Database cleanup** - Removed `import`, `integrations`, `subscription`, `feedback` tables and `importId`/`stripeCustomerId` columns.
- **FeedbackModal** - Removed feedback modal component and all usage from views.

## [0.3.0](https://github.com/kanbn/kan/compare/v0.2.4...v0.3.0) - 2025-12-09

### Added

- **Structured Logging**: Introduced `@kan/logger` for type-safe, environment-aware logging with context support.
- **List Customization**: Added ability to set custom colors for lists with `ListColorPicker`.
- **Theming System**: Implemented `ThemePresetSelector` and enhanced color management.
- **UI Animations**: Added smooth transitions for pages, tabs, and board overlays.
- **Docker Optimizations**: Implemented multi-stage builds with caching strategies to significantly reduce build times.

### Changed

- Replaced direct `process.env` usage with `next-runtime-env` for better type safety.
- Refactored `List` component to support dynamic theming.
- Updated `Dockerfile` to use `turbo prune` for smaller image sizes.

### Fixed

- Resolved flashing issues with drag-and-drop interactions.
- Fixed scrollbar jittering on board and settings pages.
- Corrected various visual bugs in dark mode.

## [0.2.4](https://github.com/kanbn/kan/compare/v0.2.3...v0.2.4) - 2025-01-14

### Added

- Button to view and update board public URL directly from board page
- Redirect from root to login page for self-hosted instances

### Changed

- Updated all label router endpoints to return consistent structure
- Added verbose error logging to magic link invitation process

### Fixed

- Updated tRPC dependencies and added OpenAPI meta to providers endpoint

## [0.2.3](https://github.com/kanbn/kan/compare/v0.2.2...v0.2.3) - 2025-07-07

### Added

- Mobile support with responsive navigation and layout
- Template selection when creating new boards with predefined lists and labels
- S3_FORCE_PATH_STYLE configuration for MinIO compatibility

### Changed

- Improved mobile UI styling and layout containers
- Enhanced iOS mobile support with viewport fixes and zoom prevention
- Improved card view layout for mobile devices

### Fixed

- Mobile dashboard min-width issues
- Dynamic viewport height on mobile devices
- Scroll functionality on card pages

## [0.2.2](https://github.com/kanbn/kan/compare/v0.2.1...v0.2.2) - 2025-06-28

### Added

- Localization and multi-language support
- URLs are now rendered as clickable links in card descriptions

### Changed

- Improved email configuration with optional SMTP authentication

## [0.2.1](https://github.com/kanbn/kan/compare/v0.2.0...v0.2.1) - 2025-06-19

### Added

- PostHog analytics integration
- Debug logging for email functionality
- Standalone mode support for Next.js
- Environment variable for configuring web port
- Docker Compose setup with PostgreSQL

### Changed

- SMTP authentication is now optional
- Added `SMTP_SECURE` configuration option
- Improved Docker build process with better context handling

### Fixed

- Default output mode for Next.js builds
- Container environment variable configuration
- Docker Compose volume naming
- Build context and static file copying in Docker
- Comment rendering inside contenteditable elements

## [0.2.0](https://github.com/kanbn/kan/compare/v0.1.0...v0.2.0) - 2025-06-10

### Added

- Trello integration with OAuth authentication and user field mapping
- Board visibility controls with dropdown menu and success notifications
- Markdown editor for card descriptions
- Email/password authentication for self-hosters
- Account deletion functionality with cascade delete for workspaces
- Enhanced scrollbar styles for dark mode

### Changed

- Simplified auth configuration to use `NEXT_PUBLIC_BASE_URL` instead of `BETTER_AUTH_URL`
- Updated self-hosting documentation
- Improved database schema with relation names

### Fixed

- List buttons stacking issue
- Editor onChange prop is now optional
- Renamed markdown prop to content in Editor component
- Router navigation for disabled signup redirects

## [0.1.0](https://github.com/kanbn/kan/releases/tag/v0.1.0) - 2025-06-02

### Added

- Initial release of Kan
- Core project management features
- Board, list, and card management
- User authentication system
- Workspace collaboration
- Comment system
- Activity logging
- Docker deployment support
- Self-hosting capabilities

### Changed

- Updated license link in footer
