import { RuleTester } from '@typescript-eslint/rule-tester';

import { noCleanupItRule } from './no-cleanup-it';

const ruleTester = new RuleTester();

ruleTester.run('no-cleanup, ', noCleanupItRule, {
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
