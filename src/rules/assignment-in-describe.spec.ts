import { ESLintUtils } from '@typescript-eslint/utils';

import { assignmentInDescribeRule } from './assignment-in-describe';

const ruleTester = new ESLintUtils.RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('assignment-in-describe', assignmentInDescribeRule, {
  valid: [],
  invalid: [
    {
      code: `
describe('test-describe-let', () => {
  let a;
  a = {};
  call(() => a);
});
`,
      output: `
describe('test-describe-let', () => {
  let a;
  
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
  call(() => a);
});
`,
      errors: [
        {
          messageId: 'assignmentInDescribe',
          suggestions: [
            {
              messageId: 'assignmentInDescribeBeforeAfterEach',
              output: `
describe('test-describe-let', () => {
  let a;
  
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
  call(() => a);
});
`,
            },
            {
              messageId: 'assignmentInDescribeBeforeAfterAll',
              output: `
describe('test-describe-let', () => {
  let a;
  
beforeAll(() => { a = {}; });
afterAll(() => { a = undefined; });
  call(() => a);
});
`,
            },
          ],
        },
      ],
    },
    {
      code: `
describe('test-describe-var', () => {
  var a;
  a = {};
  call(() => a);
});
`,
      output: `
describe('test-describe-var', () => {
  var a;
  
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
  call(() => a);
});
`,
      errors: [
        {
          messageId: 'assignmentInDescribe',
          suggestions: [
            {
              messageId: 'assignmentInDescribeBeforeAfterEach',
              output: `
describe('test-describe-var', () => {
  var a;
  
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
  call(() => a);
});
`,
            },
            {
              messageId: 'assignmentInDescribeBeforeAfterAll',
              output: `
describe('test-describe-var', () => {
  var a;
  
beforeAll(() => { a = {}; });
afterAll(() => { a = undefined; });
  call(() => a);
});
`,
            },
          ],
        },
      ],
    },
    {
      code: `
describe('test-describe-has-many-before', () => {
  var a;
  a = {};
  beforeEach(() => { code(); });
  beforeEach(() => { code(); });
  beforeAll(() => { code(); });
  beforeAll(() => { code(); });
  call(() => a);
});
`,
      output: `
describe('test-describe-has-many-before', () => {
  var a;
  
  beforeEach(() => { a = {};
code(); });
  beforeEach(() => { code(); });
  beforeAll(() => { code(); });
  beforeAll(() => { code(); });
afterEach(() => { a = undefined; });
  call(() => a);
});
`,
      errors: [
        {
          messageId: 'assignmentInDescribe',
          suggestions: [
            {
              messageId: 'assignmentInDescribeBeforeAfterEach',
              output: `
describe('test-describe-has-many-before', () => {
  var a;
  
  beforeEach(() => { a = {};
code(); });
  beforeEach(() => { code(); });
  beforeAll(() => { code(); });
  beforeAll(() => { code(); });
afterEach(() => { a = undefined; });
  call(() => a);
});
`,
            },
            {
              messageId: 'assignmentInDescribeBeforeAfterAll',
              output: `
describe('test-describe-has-many-before', () => {
  var a;
  
  beforeEach(() => { code(); });
  beforeEach(() => { code(); });
  beforeAll(() => { a = {};
code(); });
  beforeAll(() => { code(); });
afterAll(() => { a = undefined; });
  call(() => a);
});
`,
            },
          ],
        },
      ],
    },
    {
      code: `
describe('test-describe-has-many-after', () => {
  var a;
  a = {};
  afterEach(() => { code(); });
  afterEach(() => { code(); });
  afterAll(() => { code(); });
  afterAll(() => { code(); });
  call(() => a);
});
`,
      output: `
describe('test-describe-has-many-after', () => {
  var a;
  
beforeEach(() => { a = {}; });
  afterEach(() => { code(); });
  afterEach(() => { code();
a = undefined; });
  afterAll(() => { code(); });
  afterAll(() => { code(); });
  call(() => a);
});
`,
      errors: [
        {
          messageId: 'assignmentInDescribe',
          suggestions: [
            {
              messageId: 'assignmentInDescribeBeforeAfterEach',
              output: `
describe('test-describe-has-many-after', () => {
  var a;
  
beforeEach(() => { a = {}; });
  afterEach(() => { code(); });
  afterEach(() => { code();
a = undefined; });
  afterAll(() => { code(); });
  afterAll(() => { code(); });
  call(() => a);
});
`,
            },
            {
              messageId: 'assignmentInDescribeBeforeAfterAll',
              output: `
describe('test-describe-has-many-after', () => {
  var a;
  
beforeAll(() => { a = {}; });
  afterEach(() => { code(); });
  afterEach(() => { code(); });
  afterAll(() => { code(); });
  afterAll(() => { code();
a = undefined; });
  call(() => a);
});
`,
            },
          ],
        },
      ],
    },
  ],
});
