# AGENTS.md - Recruitment Tracker Development Guide

## Build/Test Commands
- `npm start` - Start development server
- `npm run build` - Build for production  
- `npm test` - Run all tests
- `npm test -- --testNamePattern="test name"` - Run single test
- `npm run deploy` - Deploy to GitHub Pages

## Code Style Guidelines

### Imports & Structure
- React imports first: `import React, { useState, useEffect } from 'react';`
- Third-party libraries next: `import { NavLink } from 'react-router-dom';`
- Local imports last: `import { useData } from '../contexts/DataContext';`
- Use absolute imports from src/: `import { supabase } from '../services/supabaseClient';`

### Component Patterns
- Functional components with hooks only
- Use `useData` context for state management, not local state
- Destructure props in function signature
- Export default: `export default ComponentName;`

### Naming Conventions
- Components: PascalCase (`Sidebar.js`, `ConfirmationModal.js`)
- Functions/variables: camelCase (`handleLogout`, `notificationCount`)
- Constants: UPPER_SNAKE_CASE (`SUPABASE_URL_BASE`)
- Files: kebab-case for styles (`Sidebar.css`)

### Error Handling
- Use try/catch for async operations
- Return early from components for loading/error states
- Use confirmation modals for destructive actions

### Styling
- CSS modules: import `../styles/ComponentName.css`
- Use BEM-style class names: `sidebar__nav-link`
- Responsive design with mobile-first approach

### Database
- Use Supabase client from `services/supabaseClient.js`
- All data operations through DataContext context
- Handle loading states and error cases