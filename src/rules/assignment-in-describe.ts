import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ReportSuggestionArray } from '@typescript-eslint/utils/dist/ts-eslint';

import { RuleOptions, defaultRuleOptions } from './options';
import { findDeclarator, hasCleanup, isCaptured } from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  closestCallExpressionIfName,
  closestNodeOfTypes,
  isCallExpressionWithName,
  isNameIdentifier,
  isNodeOfType,
  siblingNodesOfType,
} from '../utils/node-utils';

type MessageIds =
  | 'assignmentInDescribe'
  | 'assignmentInDescribeBeforeAfterX'
  | 'assignmentInDescribeTooComplex';

export type AssignmentInDescribeRuleOptions = RuleOptions;

type Context = Readonly<
  TSESLint.RuleContext<MessageIds, Partial<AssignmentInDescribeRuleOptions>[]>
>;

/**
 * Fixes the declaration by moving initialization to the "beforeEach" and removing to "afterEach" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param options Rule options.
 * @param node Node to work on.
 * @param describe Describe node.
 * @param siblingBefore Sibling beforeEach node, if any.
 * @param siblingAfters Sibling afterEach nodes, if any.
 * @param beforeName Name of the initialization function name.
 * @param afterName Name of the unreference function name.
 * @yields Fixes for the problem.
 */
function* fixMoveToBeforeAfter(
  context: Context,
  fixer: TSESLint.RuleFixer,
  options: AssignmentInDescribeRuleOptions,
  node: TSESTree.AssignmentExpression,
  describe: TSESTree.CallExpression,
  siblingBefore: TSESTree.CallExpression | undefined,
  siblingAfters: TSESTree.CallExpression[],
  beforeName: string,
  afterName: string
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
          ? 'after'
          : undefined
    );
    if (fix) {
      yield fix;
    }
  } else {
    const fix = insertToCallLastFunctionArgument(
      context,
      fixer,
      describe,
      beforeName + '(() => { ' + initialization + ' });',
      (node) =>
        node.type === AST_NODE_TYPES.VariableDeclaration ||
        (node.type === AST_NODE_TYPES.ExpressionStatement &&
          (isCallExpressionWithName(
            node.expression,
            options.initializationEachFunctionNames
          ) ||
            isCallExpressionWithName(
              node.expression,
              options.initializationAllFunctionNames
            ) ||
            isNodeOfType(node.expression, AST_NODE_TYPES.AssignmentExpression)))
          ? 'after'
          : undefined
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
        undefined,
        'after'
      );
      if (fix) {
        yield fix;
      }
    } else {
      const fix = insertToCallLastFunctionArgument(
        context,
        fixer,
        describe,
        afterName + '(() => { ' + cleanup + ' });',
        (node) =>
          node.type === AST_NODE_TYPES.VariableDeclaration ||
          (node.type === AST_NODE_TYPES.ExpressionStatement &&
            (isCallExpressionWithName(
              node.expression,
              options.initializationEachFunctionNames
            ) ||
              isCallExpressionWithName(
                node.expression,
                options.initializationAllFunctionNames
              ) ||
              isCallExpressionWithName(
                node.expression,
                options.unreferenceEachFunctionNames
              ) ||
              isCallExpressionWithName(
                node.expression,
                options.unreferenceAllFunctionNames
              ) ||
              isNodeOfType(
                node.expression,
                AST_NODE_TYPES.AssignmentExpression
              )))
            ? 'after'
            : undefined
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

export const assignmentInDescribeRule: TSESLint.RuleModule<
  MessageIds,
  Partial<AssignmentInDescribeRuleOptions>[]
> = {
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    messages: {
      assignmentInDescribe: 'There are assignments in a describe.',
      assignmentInDescribeBeforeAfterX:
        'Initialize values in "{{before}}" and unreference in "{{after}}".',
      assignmentInDescribeTooComplex:
        'There are assignments in a describe, logic too complex to fix.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [], // no options
  },
  create: (context) => ({
    AssignmentExpression: (node): void => {
      if (!isNameIdentifier(node.left)) return;

      const options = Object.assign({}, defaultRuleOptions, context.options[0]);

      const name = node.left.name;
      const call = closestCallExpressionIfName(node, options.functionNames);

      if (!call) return;

      const declarator = findDeclarator(name, node);
      // Probably global variable, we should not modify it
      if (!declarator) return;

      if (!isCaptured(declarator)) return;

      const closest = closestNodeOfTypes(node, [
        AST_NODE_TYPES.CallExpression,
        AST_NODE_TYPES.FunctionDeclaration,
      ]);
      if (closest && closest.type !== AST_NODE_TYPES.CallExpression) {
        const siblingAfterEach = siblingNodesOfType(
          closest,
          AST_NODE_TYPES.ExpressionStatement
        )
          .map((m) => m.expression)
          .filter((f) =>
            isCallExpressionWithName(f, options.unreferenceEachFunctionNames)
          );

        if (
          hasCleanup(
            <TSESTree.CallExpression[]>siblingAfterEach,
            node.left.name
          )
        )
          return;

        return context.report({
          node: node,
          messageId: 'assignmentInDescribeTooComplex',
        });
      } else {
        const siblingCalls = siblingNodesOfType(
          node,
          AST_NODE_TYPES.ExpressionStatement
        ).map((m) => m.expression);
        const siblingBeforeEach = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) =>
            isCallExpressionWithName(f, options.initializationEachFunctionNames)
          )
        );
        const siblingAfterEach = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) =>
            isCallExpressionWithName(f, options.unreferenceEachFunctionNames)
          )
        );
        const siblingBeforeAll = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) =>
            isCallExpressionWithName(f, options.initializationAllFunctionNames)
          )
        );
        const siblingAfterAll = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) =>
            isCallExpressionWithName(f, options.unreferenceAllFunctionNames)
          )
        );

        const suggestions: ReportSuggestionArray<MessageIds> = [];

        addXSuggestion(
          node,
          suggestions,
          context,
          options,
          call,
          siblingBeforeEach,
          siblingAfterEach,
          options.initializationEachFunctionNames[0],
          options.unreferenceEachFunctionNames[0]
        );

        addXSuggestion(
          node,
          suggestions,
          context,
          options,
          call,
          siblingBeforeAll,
          siblingAfterAll,
          options.initializationAllFunctionNames[0],
          options.unreferenceAllFunctionNames[0]
        );

        return context.report({
          node: node,
          messageId: 'assignmentInDescribe',
          suggest: suggestions,
          fix: suggestions[suggestions.length - 2].fix,
        });
      }
    },
  }),
};

/**
 * Add a suggestion for eachX fix.
 * @param node Variable declaration.
 * @param suggestions Suggestions to push to.
 * @param context Rule context to use.
 * @param options Rule options.
 * @param describe The describe where the variable is declared.
 * @param siblingBefore Sibling beforeX calls.
 * @param siblingAfter Sibling afterX calls.
 * @param beforeName Name of the initialization function name.
 * @param afterName Name of the unreference function name.
 */
function addXSuggestion(
  node: TSESTree.AssignmentExpression,
  suggestions: TSESLint.ReportSuggestionArray<MessageIds>,
  context: Context,
  options: AssignmentInDescribeRuleOptions,
  // eslint-disable-next-line jsdoc/require-jsdoc
  describe: TSESTree.CallExpression & { callee: { name: string } },
  siblingBefore: TSESTree.CallExpression[],
  siblingAfter: TSESTree.CallExpression[],
  beforeName: string,
  afterName: string
): void {
  suggestions.push({
    messageId: 'assignmentInDescribeBeforeAfterX',
    data: { before: beforeName, after: afterName },
    fix: (fixer) =>
      fixMoveToBeforeAfter(
        context,
        fixer,
        options,
        node,
        describe,
        siblingBefore[0],
        siblingAfter,
        beforeName,
        afterName
      ),
  });
}
