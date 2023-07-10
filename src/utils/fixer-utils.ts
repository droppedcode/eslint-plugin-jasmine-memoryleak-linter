import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';

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
  node: TSESTree.CallExpression,
  content: string,
  skipPredicate?: (node: TSESTree.Node) => boolean
): TSESLint.RuleFix | undefined {
  if (node.arguments.length < 1) return undefined;
  let fn = node.arguments[node.arguments.length - 1];

  // Handle inject, fakeAsync... calls
  if (isCallExpression(fn)) {
    fn = fn.arguments[fn.arguments.length - 1];
  }

  if (!('body' in fn)) return undefined;

  if (fn.body.type !== AST_NODE_TYPES.BlockStatement) {
    return fixer.replaceText(
      fn.body,
      '{ ' + context.getSourceCode().getText(fn.body) + ';\n' + content + ' }'
    );
  } else {
    if (fn.body.body.length === 0) {
      return fixer.replaceText(fn.body, '{ ' + content + ' }');
    } else {
      let afterNode;
      if (skipPredicate) {
        for (const n of fn.body.body) {
          if (skipPredicate(n)) {
            afterNode = n;
          }
        }
      }

      if (afterNode) {
        return fixer.insertTextAfter(afterNode, '\n' + content);
      } else {
        return fixer.insertTextBefore(fn.body.body[0], content + '\n');
      }
    }
  }
}
