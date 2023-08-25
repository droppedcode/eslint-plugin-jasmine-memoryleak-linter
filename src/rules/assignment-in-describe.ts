import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import {
  ReportSuggestionArray,
  RuleContext,
  RuleFix,
  RuleFixer,
  RuleModule,
} from '@typescript-eslint/utils/ts-eslint';

import {
  InDescribeRuleOptions,
  defaultInDescribeRuleOptions,
} from './in-describe-options';
import { findCaptures, findDeclarator, hasCleanup } from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  closestCallExpression,
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

export type AssignmentInDescribeRuleOptions = InDescribeRuleOptions;

type Context = Readonly<
  RuleContext<MessageIds, Partial<AssignmentInDescribeRuleOptions>[]>
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
  fixer: RuleFixer,
  options: AssignmentInDescribeRuleOptions,
  node: TSESTree.AssignmentExpression,
  describe: TSESTree.CallExpression,
  siblingBefore: TSESTree.CallExpression | undefined,
  siblingAfters: TSESTree.CallExpression[],
  beforeName: string,
  afterName: string
): IterableIterator<RuleFix> {
  if (!isNameIdentifier(node.left)) return;

  const initialization = context.getSourceCode().getText(node) + ';';
  const cleanup = !hasCleanup(siblingAfters, node.left.name)
    ? node.left.name + ' = undefined;'
    : undefined;

  if (siblingBefore) {
    yield* insertToCallLastFunctionArgument(
      context,
      fixer,
      siblingBefore,
      initialization,
      (node) =>
        node.type === AST_NODE_TYPES.ExpressionStatement &&
        node.expression.type === AST_NODE_TYPES.AssignmentExpression
          ? 'after'
          : undefined,
      'after'
    );
  } else {
    yield* insertToCallLastFunctionArgument(
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
          : undefined,
      'after'
    );
  }

  if (cleanup) {
    if (siblingAfters.length) {
      yield* insertToCallLastFunctionArgument(
        context,
        fixer,
        siblingAfters[siblingAfters.length - 1],
        cleanup,
        undefined,
        'after'
      );
    } else {
      yield* insertToCallLastFunctionArgument(
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
            : undefined,
        'after'
      );
    }
  }

  yield fixer.remove(
    node.parent?.type === AST_NODE_TYPES.ExpressionStatement
      ? node.parent
      : node
  );
}

export const assignmentInDescribeRule: RuleModule<
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
    schema: [
      {
        type: 'object',
        properties: {
          functionNames: { type: 'array', items: { type: 'string' } },
          initializationEachFunctionNames: {
            type: 'array',
            items: { type: 'string' },
          },
          initializationAllFunctionNames: {
            type: 'array',
            items: { type: 'string' },
          },
          unreferenceEachFunctionNames: {
            type: 'array',
            items: { type: 'string' },
          },
          unreferenceAllFunctionNames: {
            type: 'array',
            items: { type: 'string' },
          },
          testFunctionNames: { type: 'array', items: { type: 'string' } },
          preferAll: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
  },
  create: (context) => ({
    AssignmentExpression: (node): void => {
      if (!isNameIdentifier(node.left)) return;

      const options = Object.assign(
        {},
        defaultInDescribeRuleOptions,
        context.options[0]
      );

      const name = node.left.name;
      const call = closestCallExpressionIfName(node, options.functionNames);

      if (!call) return;

      const declarator = findDeclarator(name, node);
      // Probably global variable, we should not modify it
      if (!declarator) return;

      const captures = [...findCaptures(declarator)];
      if (captures.length === 0) return;

      const callCaptures = <TSESTree.CallExpression[]>(
        captures.map((m) => closestCallExpression(m)).filter((e) => !!e)
      );

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
          .filter(
            (f) =>
              isCallExpressionWithName(
                f,
                options.unreferenceEachFunctionNames
              ) ||
              isCallExpressionWithName(f, options.unreferenceAllFunctionNames)
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

        // Try determine the after fn name based on the current before name
        const captureBeforeEachName =
          callCaptures.find((call) =>
            isNameIdentifier(
              call.callee,
              options.initializationEachFunctionNames
            )
          )?.callee['name'] ?? siblingBeforeEach[0]?.callee['name'];
        const afterEachName =
          options.unreferenceEachFunctionNames[
            options.initializationEachFunctionNames.indexOf(
              captureBeforeEachName
            )
          ];

        addXSuggestion(
          node,
          suggestions,
          context,
          options,
          call,
          siblingBeforeEach,
          siblingAfterEach,
          captureBeforeEachName ?? options.initializationEachFunctionNames[0],
          afterEachName ?? options.unreferenceEachFunctionNames[0]
        );

        // Try determine the after fn name based on the current before name
        const captureBeforeAllName =
          callCaptures.find((call) =>
            isNameIdentifier(
              call.callee,
              options.initializationAllFunctionNames
            )
          )?.callee['name'] ?? siblingBeforeAll[0]?.callee['name'];
        const afterAllName =
          options.unreferenceAllFunctionNames[
            options.initializationAllFunctionNames.indexOf(captureBeforeAllName)
          ];

        addXSuggestion(
          node,
          suggestions,
          context,
          options,
          call,
          siblingBeforeAll,
          siblingAfterAll,
          captureBeforeAllName ?? options.initializationAllFunctionNames[0],
          afterAllName ?? options.unreferenceAllFunctionNames[0]
        );

        const isCapturedInAll =
          options.preferAll ||
          callCaptures.some((call) =>
            isNameIdentifier(
              call.callee,
              options.initializationAllFunctionNames
            )
          );

        return context.report({
          node: node,
          messageId: 'assignmentInDescribe',
          suggest: suggestions,
          // if we have all init, probably we need to move declarations to that
          fix: suggestions[suggestions.length - (isCapturedInAll ? 1 : 2)].fix,
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
  suggestions: ReportSuggestionArray<MessageIds>,
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
