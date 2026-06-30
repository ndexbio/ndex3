module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['./jest-setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/test/playwright/'],
  moduleNameMapper: {
    // Path alias used throughout ndex3 (mirrors tsconfig "paths": { "@/*": ["./src/*"] })
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  transform: {
    // Override the project's Next.js tsconfig for the test compile:
    // - jsx: 'react-jsx'  → emit the JSX transform (Next uses 'preserve', which
    //                       leaves <Component/> as raw syntax Jest can't parse)
    // - module: 'commonjs' → single module graph for Jest
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
        module: 'commonjs',
        esModuleInterop: true,
      },
    }],
  },
  // @js4cytoscape/ndex-client ships ESM; allow it to be transformed instead of
  // ignored as a node_module. (Harmless if the package is already CJS.)
  transformIgnorePatterns: [
    '/node_modules/(?!(@js4cytoscape)/)',
  ],
}
