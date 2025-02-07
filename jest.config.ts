import {compilerOptions} from './tsconfig.json';

// referência para lidar com paths no futuro: https://kulshekhar.github.io/ts-jest/docs/getting-started/paths-mapping/

export default {
    roots: ['src'],
    modulePaths: [compilerOptions.baseUrl],
    transform: {
        '\\.[jt]s$': ['esbuild-jest'],
    },
    'transformIgnorePatterns': [
        '<rootDir>/node_modules/(?!stack-trace)',
    ],
};
