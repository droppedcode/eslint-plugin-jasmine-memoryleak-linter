// Check if we are not cleaning up the data in afterX
import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';

import { findDeclarator, getLastAssignment } from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  closestCallExpression,
  closestCallExpressionIfName,
  isCallExpressionWithName,
  isNameIdentifier,
  isTruishAssignment,
  siblingNodesOfType,
} from '../utils/node-utils';

type MessageIds =
  | 'assignmentWithoutCleanup'
  | 'assignmentInCleanup'
  | 'assignmentInCleanupAdd'
  | 'assignmentInCleanupReplace';

/**
 * Fixes the declaration by add dereference to "afterX" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param cleanup Cleanup code.
 * @param describe Describe node.
 * @param after AfterX node, if any.
 * @param dereferenceMethod Dereference method name.
 * @returns Fix for the problem.
 */
function fixToDereference(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  cleanup: string,
  describe: TSESTree.CallExpression,
  after: TSESTree.CallExpression | undefined,
  dereferenceMethod: string
): TSESLint.RuleFix | undefined {
  if (after) {
    return insertToCallLastFunctionArgument(
      context,
      fixer,
      after,
      cleanup,
      () => true
    );
  } else {
    return insertToCallLastFunctionArgument(
      context,
      fixer,
      describe,
      dereferenceMethod + '(() => { ' + cleanup + ' });',
      (node) =>
        node.type === AST_NODE_TYPES.VariableDeclaration ||
        (node.type === AST_NODE_TYPES.ExpressionStatement &&
          (isCallExpressionWithName(node.expression, 'beforeEach') ||
            isCallExpressionWithName(node.expression, 'beforeAll') ||
            isCallExpressionWithName(node.expression, 'afterEach') ||
            isCallExpressionWithName(node.expression, 'afterAll')))
    );
  }
}

/**
 * Create an each* rule.
 * @param assignmentMethod Name of the method which should assign the value.
 * @param dereferenceMethod Name of the method which should dereference the value.
 * @returns The rule.
 */
export function createRule(
  assignmentMethod: string,
  dereferenceMethod: string
): TSESLint.RuleModule<MessageIds> {
  return {
    defaultOptions: [],
    meta: {
      type: 'suggestion',
      messages: {
        assignmentWithoutCleanup:
          'There is assignment in "' +
          assignmentMethod +
          '" but no cleanup in "' +
          dereferenceMethod +
          '".',
        assignmentInCleanup:
          'Last assignment in "' + dereferenceMethod + '" is not a cleanup.',
        assignmentInCleanupAdd: 'Add a cleanup assignment.',
        assignmentInCleanupReplace: 'Replace assignment to cleanup.',
      },
      fixable: 'code',
      hasSuggestions: true,
      schema: [], // no options
    },
    create: (context) => ({
      AssignmentExpression: (node): void => {
        if (!isNameIdentifier(node.left)) return;
        // Non truish assignment is skipped.
        if (!isTruishAssignment(node)) return;

        const name = node.left.name;

        const call = closestCallExpressionIfName(node, assignmentMethod);

        if (!call) return;

        // Check if this is within a VariableDeclaration
        if (node.parent?.type === AST_NODE_TYPES.VariableDeclaration) return;
        // Local declaration
        if (findDeclarator(name, node, (n) => n === call)) return;

        const dereferenceSiblings = siblingNodesOfType(
          call,
          AST_NODE_TYPES.ExpressionStatement,
          (n) =>
            isCallExpressionWithName(n.expression, dereferenceMethod) &&
            n.expression.arguments.length > 0 &&
            n.expression.arguments[n.expression.arguments.length - 1]['body']
        ).map((m) => m.expression as TSESTree.CallExpression);

        const child = getLastAssignment(dereferenceSiblings, name);

        if (child) {
          if (isTruishAssignment(child)) {
            return context.report({
              messageId: 'assignmentInCleanup',
              node: child,
              fix: (fixer) =>
                insertToCallLastFunctionArgument(
                  context,
                  fixer,
                  dereferenceSiblings[dereferenceSiblings.length - 1],
                  name + ' = undefined;',
                  () => true
                ) ?? fixer.insertTextAfter(child, ''),
              suggest: [
                {
                  messageId: 'assignmentInCleanupReplace',
                  fix: (fixer) =>
                    fixer.replaceText(child.right, ' = undefined;'),
                },
                {
                  messageId: 'assignmentInCleanupAdd',
                  fix: (fixer) =>
                    insertToCallLastFunctionArgument(
                      context,
                      fixer,
                      dereferenceSiblings[dereferenceSiblings.length - 1],
                      name + ' = undefined;',
                      () => true
                    ) ?? fixer.insertTextAfter(child, ''),
                },
              ],
            });
          } else {
            // There is cleanup code, nothing to do.
            return;
          }
        }

        if (!call.parent) throw new Error('Missing parent.');
        const parent = closestCallExpression(call.parent);
        if (!parent) throw new Error('Missing parent call.');

        return context.report({
          messageId: 'assignmentWithoutCleanup',
          node: node,
          fix: (fixer) =>
            fixToDereference(
              context,
              fixer,
              name + ' = undefined;',
              parent,
              dereferenceSiblings[dereferenceSiblings.length - 1],
              dereferenceMethod
            ) ?? fixer.insertTextAfter(parent, ''),
          suggest: [
            {
              messageId: 'assignmentInCleanupAdd',
              fix: (fixer) =>
                fixToDereference(
                  context,
                  fixer,
                  name + ' = undefined;',
                  parent,
                  dereferenceSiblings[dereferenceSiblings.length - 1],
                  dereferenceMethod
                ) ?? fixer.insertTextAfter(parent, ''),
            },
          ],
        });
      },
    }),
  };
}
