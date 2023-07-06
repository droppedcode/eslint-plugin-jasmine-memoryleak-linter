import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

/**
 * Returns the closest ancestor with the specified type.
 * @param node Node to test.
 * @param type Type to look for.
 * @returns The closest node of type or undefined.
 */
export function closestNodeOfType(
  node: TSESTree.Node | undefined,
  type: AST_NODE_TYPES
): TSESTree.Node | undefined {
  if (!node) return;
  if (node.type === type) return node;

  return closestNodeOfType(node.parent, type);
}

/**
 * Returns the closest ancestor with the specified type.
 * @param node Node to test.
 * @param type Type to look for.
 * @returns The closest node of type or undefined.
 */
export function siblingNodesOfType(
  node: TSESTree.Node | undefined,
  type: AST_NODE_TYPES
): TSESTree.Node[] {
  if (!node) return [];
  if (!node.parent) return [];
  if (node.parent.type !== AST_NODE_TYPES.BlockStatement) return [];

  return node.parent.body.filter((f) => f !== node && f.type === type);
}
