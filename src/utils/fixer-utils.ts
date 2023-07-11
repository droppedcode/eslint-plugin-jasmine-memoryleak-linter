import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';

import { CapturingNode } from './common';
import { isCallExpression } from './node-utils';

/**
 * Prepend content to a call.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param content Content to prepend.
 * @param skipPredicate Predicate to find the node after insertion should happen, this will test all nodes and insert after the last true result.
 * @returns Fix for the prepend.
 */
export function insertToCallLastFunctionArgument<MessageIds extends string>(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.CallExpression | CapturingNode,
  content: string,
  skipPredicate?: (node: TSESTree.Node) => boolean
): TSESLint.RuleFix | undefined {
  let body: TSESTree.BlockStatement | TSESTree.Expression;

  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (node.arguments.length < 1) return undefined;

    const lastArg = node.arguments[node.arguments.length - 1];

    body =
      lastArg.type === AST_NODE_TYPES.SpreadElement
        ? lastArg.argument
        : lastArg;
  } else {
    body = node.body;
  }

  // Handle inject, fakeAsync... calls
  if (isCallExpression(body)) {
    const lastArg = body.arguments[body.arguments.length - 1];

    body =
      lastArg.type === AST_NODE_TYPES.SpreadElement
        ? lastArg.argument
        : lastArg;
  }

  if (body.type !== AST_NODE_TYPES.BlockStatement && 'body' in body) {
    if (body.body.type === AST_NODE_TYPES.ClassBody) {
      // This should not happen...
      return undefined;
    } else {
      body = body.body;
    }
  }

  if (body.type !== AST_NODE_TYPES.BlockStatement) {
    return fixer.replaceText(
      body,
      '{ ' + context.getSourceCode().getText(body) + ';\n' + content + ' }'
    );
  } else {
    if (body.body.length === 0) {
      return fixer.replaceText(body, '{ ' + content + ' }');
    } else {
      let afterNode;
      if (skipPredicate) {
        for (const n of body.body) {
          if (skipPredicate(n)) {
            afterNode = n;
          }
        }
      }

      if (afterNode) {
        return fixer.insertTextAfter(afterNode, '\n' + content);
      } else {
        return fixer.insertTextBefore(body.body[0], content + '\n');
      }
    }
  }
}
