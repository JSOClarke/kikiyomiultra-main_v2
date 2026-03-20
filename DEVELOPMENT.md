# Kikiyomi Ultra - Development Guide

Welcome to the development documentation for Kikiyomi Ultra. This document outlines the architectural decisions and standards for this application.

## 1. Architecture Overview (React + Vite + Tailwind)
The application was refactored from a monolithic vanilla JS setup into a component-based React architecture using Vite for fast bundling and Tailwind CSS for utility-driven styling.

### UI Boundaries & Layout
- **Rule:** UI must be broken into **components**.
- **Rule:** Pages (`src/pages/`) only compose components together. They should **not** include layout CSS (like padding or margins).
- **Rule:** Layout components (`AppLayout`, `Sidebar`, `PageContainer`) define **structural boundaries only**.
- **Rule:** Use `<PageContainer>` for all pages to ensure standardized padding and scrolling behavior.
- **Rule:** Never use viewport width units (`vw`) inside layout wrappers; rely on standard flex/grid boundaries instead.

## 2. Global State Management (Zustand)
We use Zustand for all global state to avoid prop-drilling and widespread React Context re-renders.

### Global Store (`src/store/useStore.js`)
Manages application-wide UI states that persist or are needed globally:
- `theme` (Kiku Dark, Kiku Light, Matcha) - *Persisted to localStorage*.
- `isSidebarCollapsed` - *Persisted to localStorage*.
- Modal visibility states (Settings, Stats, History, etc.).

### Player Store (`src/store/usePlayerStore.js`)
A highly volatile, isolated store explicitly for the Reader/Player view. 
- Prevents audio timecode updates (`currentTime`) from triggering re-renders in the sidebar or application layout.
- Handles audio syncing, active book tracking, and subtitle tracking.

## 3. Theming Engine
The theming engine uses a hybrid approach of CSS Variables and Tailwind.
- Themes are defined in `src/index.css` under `[data-theme="theme-name"]` blocks.
- Zustand handles switching the string value of `data-theme` on the root HTML element.
- Tailwind (`tailwind.config.js`) maps utility classes (e.g., `bg-surface`) directly to the CSS Variables (`var(--surface)`).
- **Adding a theme:** Simply add a new CSS block in `index.css` and a `<option>` in the `SettingsModal.jsx`. 

## 4. Work in Progress
Currently migrating the audio player logic using injected Mock Data to solidify the React Player architecture before building the file parsing engine.
