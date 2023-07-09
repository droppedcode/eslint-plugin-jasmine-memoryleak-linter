import { ESLintUtils } from '@typescript-eslint/utils';

import { noCleanupItRule } from './no-cleanup-it';

const ruleTester = new ESLintUtils.RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('no-cleanup, ', noCleanupItRule, {
  valid: [
    `
describe('no-cleanup-ok-has-cleanup', () => {
  var a;
  it(() => {
    a = {};
  });
  afterEach(() => { a = undefined; });
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
afterEach(() => { a = undefined; });
  it(() => {
    a = {};
  });
});
`,
      errors: [
        {
          messageId: 'assignmentWithoutCleanup',
          suggestions: [
            {
              messageId: 'assignmentInCleanupAdd',
              output: `
describe('no-cleanup', () => {
  var a;
afterEach(() => { a = undefined; });
  it(() => {
    a = {};
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
describe('no-cleanup-has-after', () => {
  var a;
  it(() => {
    a = {};
  });
  afterEach(() => {
    code();
  });
  afterEach(() => {
    code();
  });
});
`,
      output: `
describe('no-cleanup-has-after', () => {
  var a;
  it(() => {
    a = {};
  });
  afterEach(() => {
    code();
  });
  afterEach(() => {
    code();
a = undefined;
  });
});
`,
      errors: [
        {
          messageId: 'assignmentWithoutCleanup',
          suggestions: [
            {
              messageId: 'assignmentInCleanupAdd',
              output: `
describe('no-cleanup-has-after', () => {
  var a;
  it(() => {
    a = {};
  });
  afterEach(() => {
    code();
  });
  afterEach(() => {
    code();
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
