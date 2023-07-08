import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';

/**
 * Prepend content to a call.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param content Content to prepend.
 * @param skipPredicate Predicate to find the node after insertion should happen.
 * @returns Fix for the prepend.
 */
export function insertToCallLastFunctionArgument<MessageIds extends string>(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.CallExpression,
  content: string,
  skipPredicate?: (node: TSESTree.Node) => boolean
): TSESLint.RuleFix {
  const call = node as TSESTree.CallExpression;

  if (call.arguments.length < 1)
    throw new Error('Missing argument on call to insert to.');
  const fn = call.arguments[call.arguments.length - 1] as TSESTree.FunctionLike;

  if (!fn.body) throw new Error('Missing body to insert to.');

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
          } else {
            break;
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