import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ReportSuggestionArray } from '@typescript-eslint/utils/dist/ts-eslint';

import { hasCleanup } from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  closestCallExpressionIfName,
  isCallExpressionWithName,
  isNameIdentifier,
  isNodeOfType,
  siblingNodesOfType,
} from '../utils/node-utils';

type MessageIds =
  | 'assignmentInDescribe'
  | 'assignmentInDescribeBeforeAfterAll'
  | 'assignmentInDescribeBeforeAfterEach';

/**
 * Fixes the declaration by moving initialization to the "beforeEach" and removing to "afterEach" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param describe Describe node.
 * @param siblingBefore Sibling beforeEach node, if any.
 * @param siblingAfters Sibling afterEach nodes, if any.
 * @param suffix Suffix of the each commands.
 * @yields Fixes for the problem.
 */
function* fixMoveToBeforeAfter(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.AssignmentExpression,
  describe: TSESTree.CallExpression,
  siblingBefore: TSESTree.CallExpression | undefined,
  siblingAfters: TSESTree.CallExpression[],
  suffix: string
): IterableIterator<TSESLint.RuleFix> {
  if (!isNameIdentifier(node.left)) return;

  const initialization = context.getSourceCode().getText(node) + ';';
  const cleanup = !hasCleanup(siblingAfters, node.left.name)
    ? node.left.name + ' = undefined;'
    : undefined;

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
      'before' + suffix + '(() => { ' + initialization + ' });',
      (node) =>
        node.type === AST_NODE_TYPES.VariableDeclaration ||
        (node.type === AST_NODE_TYPES.ExpressionStatement &&
          (isCallExpressionWithName(node.expression, 'beforeEach') ||
            isCallExpressionWithName(node.expression, 'beforeAll') ||
            isNodeOfType(node.expression, AST_NODE_TYPES.AssignmentExpression)))
    );
    if (fix) {
      yield fix;
    }
  }

  if (cleanup) {
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
        'after' + suffix + '(() => { ' + cleanup + ' });',
        (node) =>
          node.type === AST_NODE_TYPES.VariableDeclaration ||
          (node.type === AST_NODE_TYPES.ExpressionStatement &&
            (isCallExpressionWithName(node.expression, 'beforeEach') ||
              isCallExpressionWithName(node.expression, 'beforeAll') ||
              isCallExpressionWithName(node.expression, 'afterEach') ||
              isCallExpressionWithName(node.expression, 'afterAll') ||
              isNodeOfType(
                node.expression,
                AST_NODE_TYPES.AssignmentExpression
              )))
      );
      if (fix) {
        yield fix;
      }
    }
  }

  yield fixer.remove(
    node.parent?.type === AST_NODE_TYPES.ExpressionStatement
      ? node.parent
      : node
  );
}

export const assignmentInDescribeRule: TSESLint.RuleModule<MessageIds> = {
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    messages: {
      assignmentInDescribe: 'There are assignments in a describe.',
      assignmentInDescribeBeforeAfterEach:
        'Initialize values in "beforeEach" and unreference in "afterEach".',
      assignmentInDescribeBeforeAfterAll:
        'Initialize values in "beforeAll" and unreference in "afterAll".',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [], // no options
  },
  create: (context) => ({
    AssignmentExpression: (node): void => {
      const call = closestCallExpressionIfName(node, 'describe');

      if (!call) return;

      const siblingCalls = siblingNodesOfType(
        node,
        AST_NODE_TYPES.ExpressionStatement
      ).map((m) => m.expression);
      const siblingBeforeEach = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) => isCallExpressionWithName(f, 'beforeEach'))
      );
      const siblingAfterEach = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) => isCallExpressionWithName(f, 'afterEach'))
      );
      const siblingBeforeAll = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) => isCallExpressionWithName(f, 'beforeAll'))
      );
      const siblingAfterAll = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) => isCallExpressionWithName(f, 'afterAll'))
      );

      const suggestions: ReportSuggestionArray<MessageIds> = [];

      addXSuggestion(
        node,
        suggestions,
        context,
        call,
        siblingBeforeEach,
        siblingAfterEach,
        'Each'
      );

      addXSuggestion(
        node,
        suggestions,
        context,
        call,
        siblingBeforeAll,
        siblingAfterAll,
        'All'
      );

      return context.report({
        node: node,
        messageId: 'assignmentInDescribe',
        suggest: suggestions,
        fix: suggestions[suggestions.length - 2].fix,
      });
    },
  }),
};

/**
 * Add a suggestion for eachX fix.
 * @param node Variable declaration.
 * @param suggestions Suggestions to push to.
 * @param context Rule context to use.
 * @param describe The describe where the variable is declared.
 * @param siblingBefore Sibling beforeX calls.
 * @param siblingAfter Sibling afterX calls.
 * @param suffix Function suffix to use.
 */
function addXSuggestion(
  node: TSESTree.AssignmentExpression,
  suggestions: TSESLint.ReportSuggestionArray<MessageIds>,
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  // eslint-disable-next-line jsdoc/require-jsdoc
  describe: TSESTree.CallExpression & { callee: { name: 'describe' } },
  siblingBefore: TSESTree.CallExpression[],
  siblingAfter: TSESTree.CallExpression[],
  suffix: string
): void {
  suggestions.push({
    messageId: <MessageIds>('assignmentInDescribeBeforeAfter' + suffix),
    fix: (fixer) =>
      fixMoveToBeforeAfter(
        context,
        fixer,
        node,
        describe,
        siblingBefore[0],
        siblingAfter,
        suffix
      ),
  });
}
