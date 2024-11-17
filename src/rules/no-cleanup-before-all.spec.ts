import { RuleTester } from '@typescript-eslint/rule-tester';

import { noCleanupBeforeAllRule } from './no-cleanup-before-all';

const ruleTester = new RuleTester();

ruleTester.run('no-cleanup, ', noCleanupBeforeAllRule, {
  valid: [
    `
describe('no-cleanup-ok-has-cleanup', () => {
  var a;
  beforeAll(() => {
    a = {};
  });
  afterAll(() => { a = undefined; });
});
`,
    `
describe('no-cleanup-ok-same-line', () => {
  beforeAll(() => {
    var a = {};
  });
});
`,
    `
describe('no-cleanup-ok-local', () => {
  beforeAll(() => {
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
  beforeAll(() => {
    a = {};
  });
});
`,
      output: `
describe('no-cleanup', () => {
  var a;
  beforeAll(() => {
    a = {};
  });
afterAll(() => { a = undefined; });
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
  beforeAll(() => {
    a = {};
  });
afterAll(() => { a = undefined; });
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
  beforeAll(() => {
    a = {};
  });
  afterAll(() => {
    code();
  });
  afterAll(() => {
    code();
  });
});
`,
      output: `
describe('no-cleanup-has-after', () => {
  var a;
  beforeAll(() => {
    a = {};
  });
  afterAll(() => {
    code();
  });
  afterAll(() => {
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
  beforeAll(() => {
    a = {};
  });
  afterAll(() => {
    code();
  });
  afterAll(() => {
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
