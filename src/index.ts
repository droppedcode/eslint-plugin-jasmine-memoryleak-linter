import { assignmentInDescribeRule } from './rules/assignment-in-describe';
import { beforeMixedUpAssignmentRule, defaultJasmineBeforeMixedUpAssignmentOptions, defaultMochaBeforeMixedUpAssignmentOptions } from './rules/before-mixed-up-assignments';
import { declarationInDescribeRule } from './rules/declaration-in-describe';
import { defaultJasmineInDescribeRuleOptions, defaultMochaInDescribeRuleOptions } from './rules/in-describe-options';
import { noCleanupBeforeAllRule } from './rules/no-cleanup-before-all';
import { noCleanupBeforeEachRule } from './rules/no-cleanup-before-each';
import { defaultJasmineNoCleanupAllOptions, defaultJasmineNoCleanupEachOptions, defaultJasmineNoCleanupTestOptions, defaultMochaNoCleanupAllOptions, defaultMochaNoCleanupEachOptions, defaultMochaNoCleanupTestOptions } from './rules/no-cleanup-options';
import { noCleanupTestRule } from './rules/no-cleanup-test';

export const rules = {
  'declaration-in-describe': declarationInDescribeRule,
  'assignment-in-describe': assignmentInDescribeRule,
  'no-cleanup-test': noCleanupTestRule,
  'no-cleanup-before-each': noCleanupBeforeEachRule,
  'no-cleanup-before-all': noCleanupBeforeAllRule,
  'before-mixed-up-assignment': beforeMixedUpAssignmentRule,
};

const declarationInDescribePreferOverride = {
  preferAll: true
};

const assignmentInDescribePreferOverride = {
  preferAll: true
};

export const configs = {
  recommended: {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': 'error',
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': 'error',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': 'error',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': 'error',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': 'error',
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': 'warn',
    },
  },
  warn: {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': 'warn',
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': 'warn',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': 'warn',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': 'warn',
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': 'warn',
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': 'warn',
    },
  },
  preferAll: {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': ['error', declarationInDescribePreferOverride],
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': ['error', assignmentInDescribePreferOverride],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': ['error'],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': ['error'],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': ['error'],
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': 'warn',
    },
  },
  // Jasmine
  'jasmine--recommended': {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': ['error', defaultJasmineInDescribeRuleOptions],
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': ['error', defaultJasmineInDescribeRuleOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': ['error', defaultJasmineNoCleanupTestOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': ['error', defaultJasmineNoCleanupEachOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': ['error', defaultJasmineNoCleanupAllOptions],
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': ['warn', defaultJasmineBeforeMixedUpAssignmentOptions],
    },
  },
  'jasmine--warn': {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': ['warn', defaultJasmineInDescribeRuleOptions],
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': ['warn', defaultJasmineInDescribeRuleOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': ['warn', defaultJasmineNoCleanupTestOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': ['warn', defaultJasmineNoCleanupEachOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': ['warn', defaultJasmineNoCleanupAllOptions],
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': ['warn', defaultJasmineBeforeMixedUpAssignmentOptions],
    },
  },
  'jasmine--preferAll': {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': ['error', Object.assign({}, defaultJasmineInDescribeRuleOptions, declarationInDescribePreferOverride)],
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': ['error', Object.assign({}, defaultJasmineInDescribeRuleOptions, assignmentInDescribePreferOverride)],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': ['error', defaultJasmineNoCleanupTestOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': ['error', defaultJasmineNoCleanupEachOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': ['error', defaultJasmineNoCleanupAllOptions],
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': ['warn', defaultJasmineBeforeMixedUpAssignmentOptions],
    },
  },
  // Mocha
  'mocha--recommended': {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': ['error', defaultMochaInDescribeRuleOptions],
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': ['error', defaultMochaInDescribeRuleOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': ['error', defaultMochaNoCleanupTestOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': ['error', defaultMochaNoCleanupEachOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': ['error', defaultMochaNoCleanupAllOptions],
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': ['warn', defaultMochaBeforeMixedUpAssignmentOptions],
    },
  },
  'mocha--warn': {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': ['warn', defaultMochaInDescribeRuleOptions],
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': ['warn', defaultMochaInDescribeRuleOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': ['warn', defaultMochaNoCleanupTestOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': ['warn', defaultMochaNoCleanupEachOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': ['warn', defaultMochaNoCleanupAllOptions],
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': ['warn', defaultMochaBeforeMixedUpAssignmentOptions],
    },
  },
  'mocha--preferAll': {
    plugins: ['@droppedcode/eslint-plugin-jasmine-memoryleak-linter'],

    rules: {
      '@droppedcode/jasmine-memoryleak-linter/declaration-in-describe': ['error', Object.assign({}, defaultMochaInDescribeRuleOptions, declarationInDescribePreferOverride)],
      '@droppedcode/jasmine-memoryleak-linter/assignment-in-describe': ['error', Object.assign({}, defaultMochaInDescribeRuleOptions, assignmentInDescribePreferOverride)],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-test': ['error', defaultMochaNoCleanupTestOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each': ['error', defaultMochaNoCleanupEachOptions],
      '@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all': ['error', defaultMochaNoCleanupAllOptions],
      '@droppedcode/jasmine-memoryleak-linter/before-mixed-up-assignment': ['warn', defaultMochaBeforeMixedUpAssignmentOptions],
    },
  },
};
