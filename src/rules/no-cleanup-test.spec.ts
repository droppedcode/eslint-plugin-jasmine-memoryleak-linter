import { RuleTester } from '@typescript-eslint/rule-tester';

import { noCleanupTestRule } from './no-cleanup-test';

const ruleTester = new RuleTester({
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
    {
      code: `
describe('no-cleanup', () => {
  var a: object | undefined;
  it(() => {
    a = {};
  });
});
`,
      output: `
describe('no-cleanup', () => {
  var a: object | undefined;
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
  var a: object | undefined;
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
    {
      code: `
describe('no-cleanup', () => {
  var a: object;
  it(() => {
    a = {};
  });
});
`,
      output: `
describe('no-cleanup', () => {
  var a: object;
  it(() => {
    a = {};
a = undefined!;
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
  var a: object;
  it(() => {
    a = {};
a = undefined!;
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
