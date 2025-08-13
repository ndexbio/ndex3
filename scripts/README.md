# Scripts

## generate-config.js

This script generates the `public/config.json` file using the base path defined in `next.config.ts`. This ensures that the base path configuration is centralized in a single location.

### Usage

```bash
npm run generate-config
```

The script automatically runs before `build` and `export` commands to ensure the config.json is always up to date with the current base path configuration.

### How it works

1. Imports the `BASE_PATH` constant from `next.config.ts`
2. Generates the complete config object with the correct `urlBaseName`
3. Writes the config to `public/config.json`

This approach ensures that if you need to change the base path, you only need to update it in one place: the `BASE_PATH` constant in `next.config.ts`.
