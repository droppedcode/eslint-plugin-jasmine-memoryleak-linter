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
});
`,
      output: `
describe('test-describe-let', () => {
  let a;
  
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
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
});
`,
      output: `
describe('test-describe-var', () => {
  var a;
  
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
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
});
`,
            },
          ],
        },
      ],
    },
  ],
});
