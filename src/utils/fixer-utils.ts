import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';

import { CapturingNode, getCallFunctionBody } from './common';

/**
 * Prepend content to a call.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param content Content to prepend.
 * @param placementCheck Function to determine the placement relative to a node.
 * @param defaultPlacement Default placement.
 * @param fixOrderingOfAssignments Fix the ordering of assignments in the target block.
 * @yields Fixes for the insert.
 */
export function* insertToCallLastFunctionArgument<
  MessageIds extends string,
  Options
>(
  context: Readonly<TSESLint.RuleContext<MessageIds, Partial<Options>[]>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.CallExpression | CapturingNode,
  content: string,
  placementCheck?: (node: TSESTree.Node) => 'before' | 'after' | undefined,
  defaultPlacement: 'before' | 'after' = 'after',
  fixOrderingOfAssignments: boolean = false
): IterableIterator<TSESLint.RuleFix> {
  const body = getCallFunctionBody(node);

  if (!body) return;

  if (body.type !== AST_NODE_TYPES.BlockStatement) {
    let placement = defaultPlacement;
    if (placementCheck) {
      const value = placementCheck(body);
      if (value) {
        placement = value;
      }
    }
    yield fixer.replaceText(
      body,
      placement === 'before'
        ? '{ ' + content + '\n' + context.getSourceCode().getText(body) + '; }'
        : '{ ' + context.getSourceCode().getText(body) + ';\n' + content + ' }'
    );
  } else {
    if (body.body.length === 0) {
      yield fixer.replaceText(body, '{ ' + content + ' }');
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
        yield placementType === 'before'
          ? fixer.insertTextBefore(placementTarget, content + '\n')
          : fixer.insertTextAfter(placementTarget, '\n' + content);
      } else {
        yield placementType === 'before'
          ? fixer.insertTextBefore(body.body[0], content + '\n')
          : fixer.insertTextAfter(
              body.body[body.body.length - 1],
              '\n' + content
            );
      }

      // if (fixOrderingOfAssignments) {
      //   yield* reorderAssignementStatementsIfUsageIsMixedUp(context, fixer, body);
      // }
    }
  }
}
