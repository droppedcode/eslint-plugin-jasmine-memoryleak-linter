import { assignmentInDescribeRule } from './rules/assignment-in-describe';
import { declarationInDescribeRule } from './rules/declaration-in-describe';
import { noCleanupBeforeAllRule } from './rules/no-cleanup-before-all';
import { noCleanupBeforeEachRule } from './rules/no-cleanup-before-each';
import { noCleanupItRule } from './rules/no-cleanup-it';

export const rules = {
  'declaration-in-describe': declarationInDescribeRule,
  'assignment-in-describe': assignmentInDescribeRule,
  'no-cleanup-it': noCleanupItRule,
  'no-cleanup-before-each': noCleanupBeforeEachRule,
  'no-cleanup-before-all': noCleanupBeforeAllRule,
};

export const configs = {
  recommended: {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': 'error',
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': 'error',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-it': 'error',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': 'error',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': 'error',
    },
  },
};
