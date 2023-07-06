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
  valid: [validNoDeclarationNoIt, validNoDeclaration],
  invalid: [
    {
      code: `
        describe('test-describe', () => {
          let a = {};
        });
      `,
      errors: [{ messageId: 'declarationInDescribe' }],
    },
    {
      code: `
        describe('test-describe', () => {
          const a = {};
        });
      `,
      errors: [{ messageId: 'declarationInDescribe' }],
    },
    {
      code: `
        describe('test-describe', () => {
          var a = {};
        });
      `,
      errors: [{ messageId: 'declarationInDescribe' }],
    },
    {
      code: `
        describe('test-describe', () => {
          var a = {};
          var b = {};
        });
      `,
      errors: [
        { messageId: 'declarationInDescribe' },
        { messageId: 'declarationInDescribe' },
      ],
    },
    {
      code: `
        describe('test-describe', () => {
          var a = {};

          it('test-it1', () => {});
        });
      `,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeIt',
              output: `
        describe('test-describe', () => {
          

          it('test-it1', () => { var a = {}; });
        });
      `,
            },
          ],
        },
      ],
    },
    {
      code: `
        describe('test-describe', () => {
          var a = {};

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
        describe('test-describe', () => {
          

          it('test-it1', () => { var a = {}; });
          it('test-it2', () => {
            var a = {};
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
        describe('test-describe', () => {
          var a, b = {};

          it('test-it1', () => {});
        });
      `,
      errors: [
        {
          messageId: 'declarationInDescribe',
          suggestions: [
            {
              messageId: 'declarationInDescribeIt',
              output: `
        describe('test-describe', () => {
          

          it('test-it1', () => { var a, b = {}; });
        });
      `,
            },
          ],
        },
      ],
    },
  ],
});
