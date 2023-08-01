import { ESLintUtils } from '@typescript-eslint/utils';

import { noCleanupTestRule } from './no-cleanup-test';

const ruleTester = new ESLintUtils.RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('no-cleanup, ', noCleanupTestRule, {
  valid: [
    `
describe('no-cleanup-ok-has-cleanup', () => {
  var a;
  it(() => {
    a = {};
    a = undefined; 
  });
});
`,
    `
describe('no-cleanup-ok-same-line', () => {
  it(() => {
    var a = {};
  });
});
`,
    `
describe('no-cleanup-ok-local', () => {
  it(() => {
    var a;

    a = {};
  });
});
`,
  ],
  invalid: [
    {
      code: `
describe('no-cleanup', () => {
  var a;
  it(() => {
    a = {};
  });
});
`,
      output: `
describe('no-cleanup', () => {
  var a;
  it(() => {
    a = {};
a = undefined;
  });
});
`,
      errors: [
        {
          messageId: 'assignmentInCleanup',
          suggestions: [
            {
              messageId: 'assignmentInCleanupAdd',
              output: `
describe('no-cleanup', () => {
  var a;
  it(() => {
    a = {};
a = undefined;
  });
});
`,
            },
          ],
        },
      ],
    },
  ],
});
