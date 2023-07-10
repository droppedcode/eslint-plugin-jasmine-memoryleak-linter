import { ESLintUtils } from '@typescript-eslint/utils';

import { declarationInDescribeRule } from './declaration-in-describe';

const ruleTester = new ESLintUtils.RuleTester({
  parser: '@typescript-eslint/parser',
});

ruleTester.run('declaration-in-describe', declarationInDescribeRule, {
  valid: [
    // No declaration
    'describe("test-describe-no-declaration", () => {});',
    // Declaration within it
    `
      describe('test-describe-within-it', () => {
        it('test-it', () => {
          let a = {};
          call(() => a);
        });
      });
    `,
    // Multi level describe declaration within it
    `
      describe('test-describe-multilevel-within-it', () => {
        describe('test-describe', () => {
          it('test-it', () => {
            let a = {};
            call(() => a);
          });
        });
      });
    `,
    // Non captured
    `
      describe('test-describe-non-captured', () => {
        let a = {};
        it('test-it', () => { });
      });
    `,
  ],
  invalid: [
    {
      code: `
describe('test-describe-let', () => {
  let a = {};
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
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
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
              messageId: 'declarationInDescribeBeforeAfterAll',
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
describe('test-describe-const', () => {
  const a = {};
  call(() => a);
});
`,
      output: `
describe('test-describe-const', () => {
  let a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
  call(() => a);
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
  call(() => a);
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
  var a = {};
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
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterEach',
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
              messageId: 'declarationInDescribeBeforeAfterAll',
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
describe('test-describe-many-declaration', () => {
  var a = {};
  var b = {};
  call(() => a + b);
});
`,
      output: `
describe('test-describe-many-declaration', () => {
  var a;
  var b = {};
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });
  call(() => a + b);
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
  call(() => a + b);
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
  call(() => a + b);
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
  call(() => a + b);
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
  call(() => a + b);
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
  it('test-it1', () => { a; });
});
`,
      output: `
describe('test-describe-it', () => {
  
  it('test-it1', () => { var a = {};
a; });
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
  
  it('test-it1', () => { var a = {};
a; });
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
  it('test-it1', () => { a; });
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
  it('test-it1', () => { a; });
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

  it('test-it1', () => { a; });
  it('test-it2', () => {
    someCode(a);
    someMoreCode();
  });
});
`,
      output: `
describe('test-describe-many-it', () => {
  var a;
beforeEach(() => { a = {}; });
afterEach(() => { a = undefined; });

  it('test-it1', () => { a; });
  it('test-it2', () => {
    someCode(a);
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
  

  it('test-it1', () => { var a = {};
a; });
  it('test-it2', () => {
    var a = {};
someCode(a);
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

  it('test-it1', () => { a; });
  it('test-it2', () => {
    someCode(a);
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

  it('test-it1', () => { a; });
  it('test-it2', () => {
    someCode(a);
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

  it('test-it1', () => { a + b; });
});
`,
      output: `
describe('test-describe-many-same-line', () => {
  

  it('test-it1', () => { var a, b = {};
a + b; });
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
  

  it('test-it1', () => { var a, b = {};
a + b; });
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

  it('test-it1', () => { a + b; });
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

  it('test-it1', () => { a + b; });
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
    it('test-it1', () => { a + b; });
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
    it('test-it1', () => { a + b; });
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
    it('test-it1', () => { a + b; });
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
    it('test-it1', () => { a + b; });
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
  call(() => b);
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
  call(() => b);
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
  call(() => b);
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
  call(() => b);
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
  call(() => a);
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
  var a = {};
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
  call(() => a);
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
