import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ReportSuggestionArray } from '@typescript-eslint/utils/dist/ts-eslint';

import { hasCleanup } from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  closestCallExpressionIfName,
  isCallExpressionWithName,
  siblingNodesOfType,
} from '../utils/node-utils';

type MessageIds =
  | 'declarationInDescribe'
  | 'declarationInDescribeIt'
  | 'declarationInDescribeBeforeAfter'
  | 'declarationInDescribeManyIt'
  | 'declarationInDescribeBeforeAfterConst';

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
  node: TSESTree.VariableDeclaration,
  siblingIts: TSESTree.CallExpression[]
): IterableIterator<TSESLint.RuleFix> {
  const declaration = context.getSourceCode().getText(node);
  for (const sibling of siblingIts) {
    const fix = insertToCallLastFunctionArgument(
      context,
      fixer,
      sibling,
      declaration,
      (node) => node.type === AST_NODE_TYPES.VariableDeclaration
    );
    if (fix) {
      yield fix;
    }
  }
  yield fixer.remove(node);
}

/**
 * Fixes the declaration by moving initialization to the "beforeEach" and removing to "afterEach" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param describe Describe node.
 * @param siblingBefore Sibling beforeEach node, if any.
 * @param siblingAfters Sibling afterEach nodes, if any.
 * @yields Fixes for the problem.
 */
function* fixMoveToBeforeAfter(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.VariableDeclaration,
  describe: TSESTree.CallExpression,
  siblingBefore: TSESTree.CallExpression | undefined,
  siblingAfters: TSESTree.CallExpression[]
): IterableIterator<TSESLint.RuleFix> {
  const initialization =
    node.declarations
      .filter((f) => f.init)
      .map((m) => context.getSourceCode().getText(m))
      .join(', ') + ';';

  const cleanup = node.declarations
    .filter((f) => 'name' in f.id && !hasCleanup(siblingAfters, f.id['name']))
    .map((m) => m.id['name'] + ' = undefined;')
    .join('\n');

  if (siblingBefore) {
    const fix = insertToCallLastFunctionArgument(
      context,
      fixer,
      siblingBefore,
      initialization,
      (node) =>
        node.type === AST_NODE_TYPES.ExpressionStatement &&
        node.expression.type === AST_NODE_TYPES.AssignmentExpression
    );
    if (fix) {
      yield fix;
    }
  } else {
    const fix = insertToCallLastFunctionArgument(
      context,
      fixer,
      describe,
      'beforeEach(() => { ' + initialization + ' });',
      (node) => node.type === AST_NODE_TYPES.VariableDeclaration
    );
    if (fix) {
      yield fix;
    }
  }

  if (cleanup.length) {
    if (siblingAfters.length) {
      const fix = insertToCallLastFunctionArgument(
        context,
        fixer,
        siblingAfters[siblingAfters.length - 1],
        cleanup,
        () => true
      );
      if (fix) {
        yield fix;
      }
    } else {
      const fix = insertToCallLastFunctionArgument(
        context,
        fixer,
        describe,
        'afterEach(() => { ' + cleanup + ' });',
        (node) =>
          node.type === AST_NODE_TYPES.VariableDeclaration ||
          (node.type === AST_NODE_TYPES.ExpressionStatement &&
            isCallExpressionWithName(node.expression, 'beforeEach'))
      );
      if (fix) {
        yield fix;
      }
    }
  }

  yield fixer.replaceText(
    node,
    (node.kind === 'const' ? 'let' : node.kind) +
      ' ' +
      node.declarations
        .filter((f) => 'name' in f.id)
        .map((m) => m.id['name'])
        .join(', ') +
      ';'
  );
}

// TODO: add options to skip eg. const
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
      declarationInDescribeBeforeAfterConst:
        'Change declaration to let and initialize values in "beforeEach" and delete in "afterEach".',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [], // no options
  },
  create: (context) => ({
    VariableDeclaration: (node): void => {
      if (!node.declarations.some((s) => s.init)) return;

      const call = closestCallExpressionIfName(node, 'describe');

      if (!call) return;

      const siblingCalls = siblingNodesOfType(
        node,
        AST_NODE_TYPES.ExpressionStatement
      ).map((m) => m.expression);
      const siblingIts = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) => isCallExpressionWithName(f, 'it'))
      );
      const siblingBefore = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) => isCallExpressionWithName(f, 'beforeEach'))
      );
      const siblingAfter = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) => isCallExpressionWithName(f, 'afterEach'))
      );

      const suggestions: ReportSuggestionArray<MessageIds> = [];
      let fix: TSESLint.ReportFixFunction | undefined;

      if (siblingIts.length === 1) {
        fix = (fixer): IterableIterator<TSESLint.RuleFix> =>
          fixMoveToIt(context, fixer, node, siblingIts);
        suggestions.push({
          messageId: 'declarationInDescribeIt',
          fix: fix,
        });
      } else if (siblingIts.length > 1) {
        suggestions.push({
          messageId: 'declarationInDescribeManyIt',
          fix: (fixer) => fixMoveToIt(context, fixer, node, siblingIts),
        });
      }

      if (node.kind !== 'const') {
        suggestions.push({
          messageId: 'declarationInDescribeBeforeAfter',
          fix: (fixer) =>
            fixMoveToBeforeAfter(
              context,
              fixer,
              node,
              call,
              siblingBefore[0],
              siblingAfter
            ),
        });
      } else {
        suggestions.push({
          messageId: 'declarationInDescribeBeforeAfterConst',
          fix: (fixer) =>
            fixMoveToBeforeAfter(
              context,
              fixer,
              node,
              call,
              siblingBefore[0],
              siblingAfter
            ),
        });
      }

      const report = {
        node: node,
        messageId: <MessageIds>'declarationInDescribe',
        suggest: suggestions,
      };

      fix ??= suggestions[suggestions.length - 1].fix;
      if (fix) {
        report['fix'] = fix;
      }

      return context.report(report);
    },
  }),
};
