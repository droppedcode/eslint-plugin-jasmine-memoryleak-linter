import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';

import { CapturingNode } from './common';
import { isCallExpression } from './node-utils';

/**
 * Prepend content to a call.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param content Content to prepend.
 * @param placementCheck Function to determine the placement relative to a node.
 * @param defaultPlacement Default placement.
 * @returns Fix for the prepend.
 */
export function insertToCallLastFunctionArgument<
  MessageIds extends string,
  Options
>(
  context: Readonly<TSESLint.RuleContext<MessageIds, Partial<Options>[]>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.CallExpression | CapturingNode,
  content: string,
  placementCheck?: (node: TSESTree.Node) => 'before' | 'after' | undefined,
  defaultPlacement: 'before' | 'after' = 'after'
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

    if (!lastArg) return undefined;

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
    let placement = defaultPlacement;
    if (placementCheck) {
      const value = placementCheck(body);
      if (value) {
        placement = value;
      }
    }
    return fixer.replaceText(
      body,
      placement === 'before'
        ? '{ ' + content + '\n' + context.getSourceCode().getText(body) + '; }'
        : '{ ' + context.getSourceCode().getText(body) + ';\n' + content + ' }'
    );
  } else {
    if (body.body.length === 0) {
      return fixer.replaceText(body, '{ ' + content + ' }');
    } else {
      let placementTarget;
      let placementType = defaultPlacement;
      if (placementCheck) {
        for (const n of body.body) {
          const value = placementCheck(n);
          if (value) {
            placementTarget = n;
            placementType = value;

            if (value === 'before') break;
          }
        }
      }

      if (placementTarget) {
        return placementType === 'before'
          ? fixer.insertTextBefore(placementTarget, content + '\n')
          : fixer.insertTextAfter(placementTarget, '\n' + content);
      } else {
        return placementType === 'before'
          ? fixer.insertTextBefore(body.body[0], content + '\n')
          : fixer.insertTextAfter(
              body.body[body.body.length - 1],
              '\n' + content
            );
      }
    }
  }
}
