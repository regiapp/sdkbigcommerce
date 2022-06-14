module.exports = {
    displayName: "payment-integration",
    preset: '../../jest.preset.js',
    globals: {
        'ts-jest': {
        tsconfig: '<rootDir>/tsconfig.spec.json',
        diagnostics: false,
    }
  },
  setupFilesAfterEnv: ['../../jest-setup.js'],
  coverageDirectory: '../../coverage/packages/payment-integration-core'
};
