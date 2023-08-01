import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

type NodeWithType<
  TNode extends TSESTree.Node,
  TType extends AST_NODE_TYPES
// eslint-disable-next-line jsdoc/require-jsdoc
> = TNode & { type: TType };

/**
 * Returns if node is the specified type.
 * @param node Node to test.
 * @param type Type to look for.
 * @returns The closest node of type or undefined.
 */
export function isNodeOfType<
  TNode extends TSESTree.Node,
  TType extends AST_NODE_TYPES
>(node: TNode, type: TType): node is NodeWithType<TNode, TType> {
  return node.type === type;
}

/**
 * Returns if node is CallExpression type.
 * @param node Node to test.
 * @returns True if node is of type.
 */
export function isCallExpression<T extends TSESTree.Node>(
  node: T
): node is T & TSESTree.CallExpression {
  return node.type == AST_NODE_TYPES.CallExpression;
}

/**
 * Returns if node is the specified type.
 * @param node Node to test.
 * @param name Name of the callee.
 * @returns True if node is of type.
 */
export function isCallExpressionWithName<
  T extends TSESTree.Node,
  TName extends string
>(
  node: T,
  name: TName | TName[]
  // eslint-disable-next-line jsdoc/require-jsdoc
): node is T & TSESTree.CallExpression & { callee: { name: TName } } {
  return isCallExpression(node) && isNameIdentifier(node.callee, name);
}

/**
 * Returns the closest ancestor with the specified type.
 * @param node Node to test.
 * @param type Type to look for.
 * @returns The closest node of type or undefined.
 */
export function closestNodeOfType<TType extends AST_NODE_TYPES>(
  node: TSESTree.Node,
  type: TType
  // eslint-disable-next-line jsdoc/require-jsdoc
): NodeWithType<TSESTree.Node, TType> | undefined {
  if (isNodeOfType(node, type)) return node;
  if (!node.parent) return;

  return closestNodeOfType(node.parent, type);
}

/**
 * Returns the closest ancestor with any of the specified types.
 * @param node Node to test.
 * @param types Types to look for.
 * @returns The closest node or undefined.
 */
export function closestNodeOfTypes(
  node: TSESTree.Node,
  types: AST_NODE_TYPES[]
  // eslint-disable-next-line jsdoc/require-jsdoc
): TSESTree.Node | undefined {
  if (types.some((s) => isNodeOfType(node, s))) return node;
  if (!node.parent) return;

  return closestNodeOfTypes(node.parent, types);
}

/**
 * Returns the closest ancestor with the specified type.
 * @param node Node to test.
 * @param type Type to look for.
 * @param filter Filter the results.
 * @returns The closest node of type or undefined.
 */
export function siblingNodesOfType<TType extends AST_NODE_TYPES>(
  node: TSESTree.Node,
  type: TType,
  filter?: (node: NodeWithType<TSESTree.Node, TType>) => boolean
  // eslint-disable-next-line jsdoc/require-jsdoc
): NodeWithType<TSESTree.Node, TType>[] {
  if (!node.parent) return [];
  const block =
    node.parent.type === AST_NODE_TYPES.ExpressionStatement
      ? node.parent.parent
      : node.parent;
  if (!block) return [];
  if (block.type !== AST_NODE_TYPES.BlockStatement) return [];

  return <NodeWithType<TSESTree.Node, TType>[]>(
    block.body.filter((f) => f !== node && isNodeOfType(f, type) && (!filter || filter(f)))
  );
}

/**
 * Returns the closest ancestor with the specified type.
 * @param node Node to test.
 * @param type Type to look for.
 * @param filter Filter the results.
 * @returns The closest node of type or undefined.
 */
export function siblingNodes(
  node: TSESTree.Node,
  filter?: (node: TSESTree.Statement) => boolean
  // eslint-disable-next-line jsdoc/require-jsdoc
): TSESTree.Statement[] {
  if (!node.parent) return [];
  const block =
    node.parent.type === AST_NODE_TYPES.ExpressionStatement
      ? node.parent.parent
      : node.parent;
  if (!block) return [];
  if (block.type !== AST_NODE_TYPES.BlockStatement) return [];

  return filter ? block.body.filter((f) => f !== node && filter(f)) : block.body.filter((f) => f !== node);
}

/**
 * Returns the closest CallExpression ancestor.
 * @param node Node to test.
 * @returns The closest node of type or undefined.
 */
export function closestCallExpression(
  node: TSESTree.Node
  // eslint-disable-next-line jsdoc/require-jsdoc
): TSESTree.CallExpression | undefined {
  return closestNodeOfType(node, AST_NODE_TYPES.CallExpression);
}

/**
 * Returns the closest CallExpression ancestor if it has the specified name.
 * @param node Node to test.
 * @param name Name of the callee.
 * @returns The closest node of type or undefined.
 */
export function closestCallExpressionIfName<TName extends string>(
  node: TSESTree.Node,
  name: TName | TName[]
  // eslint-disable-next-line jsdoc/require-jsdoc
): (TSESTree.CallExpression & { callee: { name: TName } }) | undefined {
  const call = closestNodeOfType(node, AST_NODE_TYPES.CallExpression);
  if (!call) return;
  if (!isNameIdentifier(call.callee)) return;

  const callee = call.callee.name;

  return (
    typeof name === 'string' ? callee === name : name.some((s) => callee === s)
  )
    ? // eslint-disable-next-line jsdoc/require-jsdoc
    <TSESTree.CallExpression & { callee: { name: TName } }>call
    : undefined;
}

/**
 * Get the body nodes.
 * @param node Node to get body for.
 * @yields The body nodes.
 */
export function* getBodyNodes(
  node: TSESTree.FunctionLike
): IterableIterator<TSESTree.Node> {
  if (!node.body) return;

  if (node.body.type === AST_NODE_TYPES.BlockStatement) {
    for (const child of node.body.body) {
      yield child;
    }
  } else {
    yield node.body;
  }
}

/**
 * Get the body nodes in reversed order.
 * @param node Node to get body for.
 * @yields The body nodes.
 */
export function* getBodyNodesReversed(
  node: TSESTree.FunctionLike
): IterableIterator<TSESTree.Node> {
  if (!node?.body) return;

  if (node.body.type === AST_NODE_TYPES.BlockStatement) {
    for (let i = node.body.body.length - 1; i >= 0; i--) {
      yield node.body.body[i];
    }
  } else {
    yield node.body;
  }
}

/**
 * Checks if an AssignmentExpression will assign a truish value.
 * @param node AssignmentExpression node.
 * @returns True if truish.
 */
export function isTruishAssignment(
  node: TSESTree.AssignmentExpression
): boolean {
  // We ignore special cases like *= 0
  if (node.operator !== '=') return true;

  switch (node.right.type) {
    case AST_NODE_TYPES.Identifier:
      return node.right.name !== 'undefined';
    case AST_NODE_TYPES.Literal:
      return !!node.right.value;
    default:
      return true;
  }
}

/**
 * Checks if a node is a named Identifier.
 * @param node Node to check.
 * @param name Name value of the identifier.
 * @returns True if the node is a named Identifier with the given value.
 */
export function isNameIdentifier<
  TNode extends TSESTree.Node,
  TName extends string
>(
  node: TNode,
  name?: TName | TName[]
  // eslint-disable-next-line jsdoc/require-jsdoc
): node is TNode & TSESTree.Identifier & { name: TName } {
  return (
    node.type === AST_NODE_TYPES.Identifier &&
    'name' in node &&
    (name === undefined ||
      (typeof name === 'string'
        ? node.name === name
        : name.some((s) => node.name === s)))
  );
}

/**
 * Checks if a node is statement type.
 * @param node Node to check.
 * @returns True if the node is a statement.
 */
export function isStatement<TNode extends TSESTree.Node>(
  node: TNode
): node is TNode &
(
  | TSESTree.BlockStatement
  | TSESTree.BreakStatement
  | TSESTree.ClassDeclarationWithName
  | TSESTree.ContinueStatement
  | TSESTree.DebuggerStatement
  | TSESTree.DoWhileStatement
  | TSESTree.ExportAllDeclaration
  | TSESTree.ExportDefaultDeclaration
  | TSESTree.ExportNamedDeclaration
  | TSESTree.ExpressionStatement
  | TSESTree.ForInStatement
  | TSESTree.ForOfStatement
  | TSESTree.ForStatement
  | TSESTree.FunctionDeclarationWithName
  | TSESTree.IfStatement
  | TSESTree.ImportDeclaration
  | TSESTree.LabeledStatement
  | TSESTree.ReturnStatement
  | TSESTree.SwitchStatement
  | TSESTree.ThrowStatement
  | TSESTree.TryStatement
  | TSESTree.TSDeclareFunction
  | TSESTree.TSEnumDeclaration
  | TSESTree.TSExportAssignment
  | TSESTree.TSImportEqualsDeclaration
  | TSESTree.TSInterfaceDeclaration
  | TSESTree.TSModuleDeclaration
  | TSESTree.TSNamespaceExportDeclaration
  | TSESTree.TSTypeAliasDeclaration
  | TSESTree.VariableDeclaration
  | TSESTree.WhileStatement
  | TSESTree.WithStatement
) {
  switch (node.type) {
    case AST_NODE_TYPES.BlockStatement:
    case AST_NODE_TYPES.BreakStatement:
    case AST_NODE_TYPES.ContinueStatement:
    case AST_NODE_TYPES.DebuggerStatement:
    case AST_NODE_TYPES.DoWhileStatement:
    case AST_NODE_TYPES.ExportAllDeclaration:
    case AST_NODE_TYPES.ExportDefaultDeclaration:
    case AST_NODE_TYPES.ExportNamedDeclaration:
    case AST_NODE_TYPES.ExpressionStatement:
    case AST_NODE_TYPES.ForInStatement:
    case AST_NODE_TYPES.ForOfStatement:
    case AST_NODE_TYPES.ForStatement:
    case AST_NODE_TYPES.IfStatement:
    case AST_NODE_TYPES.ImportDeclaration:
    case AST_NODE_TYPES.LabeledStatement:
    case AST_NODE_TYPES.ReturnStatement:
    case AST_NODE_TYPES.SwitchStatement:
    case AST_NODE_TYPES.ThrowStatement:
    case AST_NODE_TYPES.TryStatement:
    case AST_NODE_TYPES.TSDeclareFunction:
    case AST_NODE_TYPES.TSEnumDeclaration:
    case AST_NODE_TYPES.TSExportAssignment:
    case AST_NODE_TYPES.TSImportEqualsDeclaration:
    case AST_NODE_TYPES.TSInterfaceDeclaration:
    case AST_NODE_TYPES.TSModuleDeclaration:
    case AST_NODE_TYPES.TSNamespaceExportDeclaration:
    case AST_NODE_TYPES.TSTypeAliasDeclaration:
    case AST_NODE_TYPES.VariableDeclaration:
    case AST_NODE_TYPES.WhileStatement:
    case AST_NODE_TYPES.WithStatement:
      return true;
    case AST_NODE_TYPES.ClassDeclaration:
    case AST_NODE_TYPES.FunctionDeclaration:
      return (
        'id' in node &&
        !!node.id &&
        'type' in node.id &&
        node.id.type === AST_NODE_TYPES.Identifier
      );
    default:
      return false;
  }
}
