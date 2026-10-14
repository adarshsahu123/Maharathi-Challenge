import base from './playwright.config';
import { defineConfig } from '@playwright/test';

// The real-voice check (opens a visible, muted Chrome window). Run with: npm run test:voice
export default defineConfig({ ...base, testIgnore: [], testMatch: /real-voice\.spec\.ts/ });
