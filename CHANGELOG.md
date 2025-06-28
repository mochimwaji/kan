# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased](https://github.com/kanbn/kan/compare/v0.2.2...HEAD)

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
