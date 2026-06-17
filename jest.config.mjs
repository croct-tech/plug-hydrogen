export default {
    transform: {
        '^.+\\.[tj]sx?$': 'babel-jest',
    },
    testEnvironment: 'node',
    testMatch: ['<rootDir>/src/**/*.test.{ts,tsx}'],
    setupFilesAfterEnv: ['jest-extended/all', '<rootDir>/jest.setup.js'],
    restoreMocks: true,
    resetMocks: true,
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.test.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/index.ts',
        '!src/server/index.ts',
    ],
    coverageThreshold: {
        global: {
            lines: 100,
            functions: 100,
            branches: 100,
            statements: 100,
        },
    },
};
