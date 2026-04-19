// Cross-platform replacement for:
//   mkdir -p dist/onboarding-assets && cp -R src/onboarding-assets/. dist/onboarding-assets/
import { cpSync, mkdirSync } from 'node:fs';

mkdirSync('dist/onboarding-assets', { recursive: true });
cpSync('src/onboarding-assets', 'dist/onboarding-assets', { recursive: true });
