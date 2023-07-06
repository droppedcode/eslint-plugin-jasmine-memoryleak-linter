import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ReportSuggestionArray } from '@typescript-eslint/utils/dist/ts-eslint';

import {
  closestNodeOfType,
  siblingNodesOfType,
} from '../tools/node-extensions';

type MessageIds =
  | 'declarationInDescribe'
  | 'declarationInDescribeIt'
  | 'declarationInDescribeBeforeAfter'
  | 'declarationInDescribeManyIt';

/**
 * Fixes the declaration by moving it to the "it" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param siblingIts Sibling it nodes.
 * @yields Fixes for the problem.
 */
function* fixMoveToIt(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.Node,
  siblingIts: TSESTree.Node[]
): IterableIterator<TSESLint.RuleFix> {
  const declaration = context.getSourceCode().getText(node);
  for (const sibling of siblingIts) {
    const call = sibling as TSESTree.CallExpression;

    if (call.arguments.length < 2) continue;
    const fn = call.arguments[1] as TSESTree.FunctionLike;

    if (!fn.body) continue;

    if (fn.body.type !== AST_NODE_TYPES.BlockStatement) {
      yield fixer.replaceText(
        fn.body,
        '{ ' +
          context.getSourceCode().getText(fn.body) +
          ';\n' +
          declaration +
          ' }'
      );
    } else {
      if (fn.body.body.length === 0) {
        yield fixer.replaceText(fn.body, '{ ' + declaration + ' }');
      } else {
        yield fixer.insertTextBefore(fn.body.body[0], declaration + '\n');
      }
    }
  }
  yield fixer.remove(node);
}

export const describeDeclarationRule: TSESLint.RuleModule<MessageIds> = {
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    messages: {
      declarationInDescribe: 'There are declarations in a describe.',
      declarationInDescribeIt: 'Move declaration to the "it".',
      declarationInDescribeManyIt: 'Move declaration to each "it".',
      declarationInDescribeBeforeAfter:
        'Initialize values in "beforeEach" and delete in "afterEach".',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [], // no options
  },
  create: (context) => ({
    VariableDeclaration: (node): void => {
      const call = closestNodeOfType(node, AST_NODE_TYPES.CallExpression);
      if (
        call &&
        'callee' in call &&
        'name' in call.callee &&
        call.callee.name === 'describe'
      ) {
        const siblingCalls = siblingNodesOfType(
          node,
          AST_NODE_TYPES.ExpressionStatement
        ).map((m) => m['expression'] as TSESTree.Node);
        const siblingIts = siblingCalls.filter(
          (f) => 'callee' in f && 'name' in f.callee && f.callee.name === 'it'
        );
        const siblingBefore = siblingCalls.filter(
          (f) =>
            'callee' in f &&
            'name' in f.callee &&
            f.callee.name === 'beforeEach'
        );
        const siblingAfter = siblingCalls.filter(
          (f) =>
            'callee' in f && 'name' in f.callee && f.callee.name === 'afterEach'
        );

        const suggestions: ReportSuggestionArray<MessageIds> = [];

        if (siblingIts.length === 1) {
          suggestions.push({
            messageId: 'declarationInDescribeIt',
            fix: (fixer) => fixMoveToIt(context, fixer, node, siblingIts),
          });
        } else if (siblingIts.length > 1) {
          suggestions.push({
            messageId: 'declarationInDescribeManyIt',
            fix: (fixer) => fixMoveToIt(context, fixer, node, siblingIts),
          });
        }
        // suggestions.push({
        //   messageId: 'declarationInDescribeBeforeAfter',
        //   fix: fixer => { throw new Error('NotImplemented'); }
        // });

        return context.report({
          node: node,
          messageId: 'declarationInDescribe',
          suggest: suggestions,
        });
      }

      return;
    },
  }),
};
