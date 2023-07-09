import { ESLintUtils } from '@typescript-eslint/utils';

import { declarationInDescribeRule } from './declaration-in-describe';

const ruleTester = new ESLintUtils.RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('declaration-in-describe', declarationInDescribeRule, {
  valid: [
    // No declaration
    'describe("test-describe", () => {});',
    // Declaration within it
    `
      describe('test-describe', () => {
        it('test-it', () => {
          let a = {};
        });
      });
    `,
    // Multi level describe declaration within it
    `
      describe('test-describe', () => {
        describe('test-describe', () => {
          it('test-it', () => {
            let a = {};
          });
        });
      });
    `,
  ],
  invalid: [
    {
      code: `
describe('test-describe-let', () => {
  let a = {};
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
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-let', () => {
  let a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
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
describe('test-describe-const', () => {
  const a = {};
});
`,
      output: `
describe('test-describe-const', () => {
  let a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEachConst',
              output: `
describe('test-describe-const', () => {
  let a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAllConst',
              output: `
describe('test-describe-const', () => {
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
  var a = {};
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
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-var', () => {
  var a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
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
describe('test-describe-many-declaration', () => {
  var a = {};
  var b = {};
});
`,
      output: `
describe('test-describe-many-declaration', () => {
  var a;
  var b = {};
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-many-declaration', () => {
  var a;
  var b = {};
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
              output: `
describe('test-describe-many-declaration', () => {
  var a;
  var b = {};
beforeAll(() => { a = {}; });
afterAll(() => { a = undefined; });
});
`,
            },
          ],
        },
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-many-declaration', () => {
  var a = {};
  var b;
beforeEach(() => { b = {}; });
afterEach(() => { b = undefined; });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
              output: `
describe('test-describe-many-declaration', () => {
  var a = {};
  var b;
beforeAll(() => { b = {}; });
afterAll(() => { b = undefined; });
});
`,
            },
          ],
        },
      ],
    },
    {
      code: `
describe('test-describe-it', () => {
  var a = {};
  it('test-it1', () => {});
});
`,
      output: `
describe('test-describe-it', () => {
  
  it('test-it1', () => { var a = {}; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeIt',
              output: `
describe('test-describe-it', () => {
  
  it('test-it1', () => { var a = {}; });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-it', () => {
  var a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
  it('test-it1', () => {});
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
              output: `
describe('test-describe-it', () => {
  var a;
beforeAll(() => { a = {}; });
afterAll(() => { a = undefined; });
  it('test-it1', () => {});
});
`,
            },
          ],
        },
      ],
    },
    {
      code: `
describe('test-describe-many-it', () => {
  var a = {};

  it('test-it1', () => {});
  it('test-it2', () => {
    someCode();
    someMoreCode();
  });
});
`,
      output: `
describe('test-describe-many-it', () => {
  var a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });

  it('test-it1', () => {});
  it('test-it2', () => {
    someCode();
    someMoreCode();
  });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeManyIt',
              output: `
describe('test-describe-many-it', () => {
  

  it('test-it1', () => { var a = {}; });
  it('test-it2', () => {
    var a = {};
someCode();
    someMoreCode();
  });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-many-it', () => {
  var a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });

  it('test-it1', () => {});
  it('test-it2', () => {
    someCode();
    someMoreCode();
  });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
              output: `
describe('test-describe-many-it', () => {
  var a;
beforeAll(() => { a = {}; });
afterAll(() => { a = undefined; });

  it('test-it1', () => {});
  it('test-it2', () => {
    someCode();
    someMoreCode();
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
describe('test-describe-many-same-line', () => {
  var a, b = {};

  it('test-it1', () => {});
});
`,
      output: `
describe('test-describe-many-same-line', () => {
  

  it('test-it1', () => { var a, b = {}; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeIt',
              output: `
describe('test-describe-many-same-line', () => {
  

  it('test-it1', () => { var a, b = {}; });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-many-same-line', () => {
  var a, b;
beforeEach(() => { b = {}; });
afterEach(() => { a = undefined;
b = undefined; });

  it('test-it1', () => {});
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
              output: `
describe('test-describe-many-same-line', () => {
  var a, b;
beforeAll(() => { b = {}; });
afterAll(() => { a = undefined;
b = undefined; });

  it('test-it1', () => {});
});
`,
            },
          ],
        },
      ],
    },
    {
      code: `
describe('test-describe-multi-level-it', () => {
  var a, b = {};

  describe('test-describe-2', () => {
    it('test-it1', () => {});
  });
});
`,
      output: `
describe('test-describe-multi-level-it', () => {
  var a, b;
beforeEach(() => { b = {}; });
afterEach(() => { a = undefined;
b = undefined; });

  describe('test-describe-2', () => {
    it('test-it1', () => {});
  });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-multi-level-it', () => {
  var a, b;
beforeEach(() => { b = {}; });
afterEach(() => { a = undefined;
b = undefined; });

  describe('test-describe-2', () => {
    it('test-it1', () => {});
  });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
              output: `
describe('test-describe-multi-level-it', () => {
  var a, b;
beforeAll(() => { b = {}; });
afterAll(() => { a = undefined;
b = undefined; });

  describe('test-describe-2', () => {
    it('test-it1', () => {});
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
describe('test-describe-declaration-existing', () => {
  var a;
  var b = {};
  beforeEach(() => { a = {}; });
  afterEach(() => { a = undefined; });
});
`,
      output: `
describe('test-describe-declaration-existing', () => {
  var a;
  var b;
  beforeEach(() => { a = {};
b = {}; });
  afterEach(() => { a = undefined;
b = undefined; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
              output: `
describe('test-describe-declaration-existing', () => {
  var a;
  var b;
  beforeEach(() => { a = {};
b = {}; });
  afterEach(() => { a = undefined;
b = undefined; });
});
`,
            },
            {
              messageId: 'declarationInDescribeBeforeAfterAll',
              output: `
describe('test-describe-declaration-existing', () => {
  var a;
  var b;
  beforeEach(() => { a = {}; });
beforeAll(() => { b = {}; });
  afterEach(() => { a = undefined; });
afterAll(() => { b = undefined; });
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
  var a = {};
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
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
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
              messageId: 'declarationInDescribeBeforeAfterAll',
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
  var a = {};
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
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
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
              messageId: 'declarationInDescribeBeforeAfterAll',
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
