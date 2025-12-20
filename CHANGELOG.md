# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/kanbn/kan/compare/v0.3.0...HEAD)

### Added

- **Calendar View**: New month calendar view for boards with toggle button and `v` keyboard shortcut. Cards display on their due dates with list colors. Drag-and-drop to reschedule cards or remove due dates. Navigate with `←`/`→` for months and `t` for today. Unscheduled sidebar shows cards without due dates.
- **Multi-Drag Calendar Support**: `bulkUpdate` mutation for updating multiple cards atomically when dragging to calendar dates.
- **DeleteConfirmation Component**: Generic, reusable delete confirmation dialog with configurable entity types, consolidating 6 separate components (~207 lines removed).
- **Section Headers**: Added clear section dividers to large files for better navigability:
  - `board/index.tsx`: State, Event Handlers, Mutations, Selection, Drag-Drop, Modal Content, Render
  - `card.repo.ts`: CREATE, UPDATE, READ, REORDER, DELETE (5 sections)
  - `board.repo.ts`: READ, CREATE, UPDATE, DELETE, HELPER (5 sections)
- **useBoardKeyboardShortcuts Hook**: Extracted keyboard shortcut logic from board/index.tsx (~79 lines).
- **Codebase Quality Documentation**: Added comprehensive guide in AGENTS.md covering large file rationale, two-phase visual state pattern, and i18n guidelines.
- **Due Date Urgency Coloring**: Cards now show due dates in contextual colors based on urgency: red (overdue), orange (due today), yellow (due within a week), default (later dates).
- **Collapsible Lists**: Lists can be collapsed/expanded by clicking the chevron toggle in the header. Collapse state persists across page refreshes using localStorage. Collapsed lists show a card count badge.
- **CollapsibleSection Component**: New reusable animated component for smooth collapse/expand transitions.
- **Board Transition Animations**: Smooth morph animation when navigating between boards list and board view using `BoardTransitionOverlay` and `BoardTransitionProvider`.
- **Sidebar Toggle Animations**: Smooth sliding transitions for left and right sidebar open/close states with visual feedback.
- **Card Right Sidebar Icons**: Added Lottie animations and icons for List, Labels, Members, and Due date sections in the card right panel.
- **Theme Presets**: Added 7 predefined color themes (Default Light/Dark, Ocean Blue, Forest Green, Sunset Warm, Lavender Dream, Slate Gray) with `ThemePresetSelector` component.
- **Color Utilities**: New `colorUtils.ts` with HSL conversion, pastel color derivation, contrast detection, and color blending functions.
- **IRSA Support**: Added IAM Roles for Service Accounts (IRSA) support for S3 authentication (#265).
- **OIDC Domain Limiting**: Added ability to limit OIDC logins to specific domains (#263).
- **SMTP SSL Configuration**: Added `SMTP_REJECT_UNAUTHORIZED` env var to allow invalid SSL certificates (#262).
- **JSDoc Documentation**: Added comprehensive JSDoc to `board.repo.ts` (15+ functions) and all shared utility functions.
- **Local File Storage**: Replaced S3 cloud storage with local filesystem storage for avatars and attachments, with new `/api/files/[...path]` endpoint.
- **Root Redirect**: Root path (`/`) now redirects to `/login` for streamlined self-hosted experience.

### Changed

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
- **Novu Notifications**: Removed notification service integration.
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
