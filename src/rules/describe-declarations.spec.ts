import { ESLintUtils } from '@typescript-eslint/utils';

import { describeDeclarationRule } from './describe-declarations';

const ruleTester = new ESLintUtils.RuleTester({
  parser: '@typescript-eslint/parser',
});

const validNoDeclarationNoIt: string = `
  describe('test-describe', () => {
  });
`;

const validNoDeclaration: string = `
  describe('test-describe', () => {
    it('test-it', () => {
      let a = {};
    });
  });
`;

ruleTester.run('declaration-in-describe', describeDeclarationRule, {
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
afterEach(() => { a = null; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-let', () => {
  let a;
beforeEach(() => { a = {}; });
afterEach(() => { a = null; });
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
afterEach(() => { a = null; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfterConst',
              output: `
describe('test-describe-const', () => {
  let a;
beforeEach(() => { a = {}; });
afterEach(() => { a = null; });
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
afterEach(() => { a = null; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-var', () => {
  var a;
beforeEach(() => { a = {}; });
afterEach(() => { a = null; });
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
afterEach(() => { a = null; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-many-declaration', () => {
  var a;
  var b = {};
beforeEach(() => { a = {}; });
afterEach(() => { a = null; });
});
`,
            },
          ],
        },
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-many-declaration', () => {
  var a = {};
  var b;
beforeEach(() => { b = {}; });
afterEach(() => { b = null; });
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
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-it', () => {
  var a;
beforeEach(() => { a = {}; });
afterEach(() => { a = null; });
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
afterEach(() => { a = null; });

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
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-many-it', () => {
  var a;
beforeEach(() => { a = {}; });
afterEach(() => { a = null; });

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
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-many-same-line', () => {
  var a, b;
beforeEach(() => { b = {}; });
afterEach(() => { a = null;
b = null; });

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
afterEach(() => { a = null;
b = null; });

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
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-multi-level-it', () => {
  var a, b;
beforeEach(() => { b = {}; });
afterEach(() => { a = null;
b = null; });

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
  afterEach(() => { a = null; });
});
`,
      output: `
describe('test-describe-declaration-existing', () => {
  var a;
  var b;
  beforeEach(() => { a = {};
b = {}; });
  afterEach(() => { a = null;
b = null; });
});
`,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeBeforeAfter',
              output: `
describe('test-describe-declaration-existing', () => {
  var a;
  var b;
  beforeEach(() => { a = {};
b = {}; });
  afterEach(() => { a = null;
b = null; });
});
`,
            },
          ],
        },
      ],
    },
  ],
});
