import { ESLintUtils } from '@typescript-eslint/utils';

import { noCleanupBeforeEachRule } from './no-cleanup-before-each';

const ruleTester = new ESLintUtils.RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('no-cleanup, ', noCleanupBeforeEachRule, {
  valid: [
    `
describe('no-cleanup-ok-has-cleanup', () => {
  var a;
  beforeEach(() => {
    a = {};
  });
  afterEach(() => { a = undefined; });
});
`,
    `
describe('no-cleanup-ok-same-line', () => {
  beforeEach(() => {
    var a = {};
  });
});
`,
    `
describe('no-cleanup-ok-local', () => {
  beforeEach(() => {
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
  beforeEach(() => {
    a = {};
  });
});
`,
      output: `
describe('no-cleanup', () => {
  var a;
  beforeEach(() => {
    a = {};
  });
afterEach(() => { a = undefined; });
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
  beforeEach(() => {
    a = {};
  });
afterEach(() => { a = undefined; });
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
  beforeEach(() => {
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
  beforeEach(() => {
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
  beforeEach(() => {
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
