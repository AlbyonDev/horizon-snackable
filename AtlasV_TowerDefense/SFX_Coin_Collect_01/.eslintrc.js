// @generated SignedSource<<934b0543fc2654896bc2f9b1ad4c1f9c>>
// @command : buck2 run //arvr/projects/mhe/tools/codegen/ts_auxiliary_files:generate_ts_auxiliary_files
/**
 * (c) Meta Platforms, Inc. and affiliates. Confidential and proprietary.
 */

module.exports = {
  extends: ['../../../.eslintrc.js'],
  parserOptions: {
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    ecmaVersion: 2018,
    sourceType: 'module',
  },
  ignorePatterns: ['.eslintrc.js'],
};
