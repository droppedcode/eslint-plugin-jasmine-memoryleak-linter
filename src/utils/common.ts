import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

import {
  getBodyNodesReversed,
  isNameIdentifier,
  isNodeOfType,
  isStatement,
  isTruishAssignment,
} from './node-utils';

/**
 * Get the last assignment to a variable in a CallExpression array.
 * @param calls CallExpressions.
 * @param name Name of the variable.
 * @returns True if it is cleanup assignment.
 */
export function getLastAssignment(
  calls: TSESTree.CallExpression[],
  name: string
): TSESTree.AssignmentExpression | undefined {
  for (let i = calls.length - 1; i >= 0; i--) {
    const after = calls[i];
    const body = after.arguments[
      after.arguments.length - 1
    ] as TSESTree.FunctionLike;

    for (const bodyChild of getBodyNodesReversed(body)) {
      const child =
        bodyChild.type === AST_NODE_TYPES.ExpressionStatement
          ? bodyChild.expression
          : bodyChild;

      if (
        child.type === AST_NODE_TYPES.AssignmentExpression &&
        isNameIdentifier(child.left, name)
      ) {
        return child;
      }
    }
  }

  return undefined;
}

/**
 * Check afterEach calls that the last assignment of a variable is a cleanup one.
 * @param afterEach AfterEach calls.
 * @param name Name of the variable.
 * @returns True if it has cleanup assignment.
 */
export function hasCleanup(
  afterEach: TSESTree.CallExpression[],
  name: string
): boolean | undefined {
  const assignment = getLastAssignment(afterEach, name);

  if (assignment === undefined) return undefined;

  return !isTruishAssignment(assignment);
}

/**
 * Search for the VariableDeclarator of a variable from the given point up.
 * This may not find var declarations if present after the from node also can show false positives in the same situation.
 * @param variable Name of the variable.
 * @param from Node to search from.
 * @param before Predicate to stop the search.
 * @returns The VariableDeclarator node if found.
 */
export function findDeclarator(
  variable: string,
  from: TSESTree.Node,
  before?: (node: TSESTree.Node) => boolean
): TSESTree.VariableDeclarator | undefined {
  return findDeclaratorUp(variable, from, before);
}

/**
 * Search for the VariableDeclarator of a variable from the given point up.
 * @param variable Name of the variable.
 * @param from Node to search from.
 * @param before Predicate to stop the search.
 * @returns The VariableDeclarator node if found.
 */
function findDeclaratorUp(
  variable: string,
  from: TSESTree.Node,
  before?: (node: TSESTree.Node) => boolean
): TSESTree.VariableDeclarator | undefined {
  if (before && before(from)) return undefined;

  if (isNodeOfType(from, AST_NODE_TYPES.VariableDeclarator)) {
    if (
      isNodeOfType(from.id, AST_NODE_TYPES.Identifier) &&
      from.id.name === variable
    ) {
      return from;
    }
  } else if (isNodeOfType(from, AST_NODE_TYPES.VariableDeclaration)) {
    const declarator = findVariableDeclaratorInDeclaration(from, variable);
    if (declarator) return declarator;
  }

  if (!from.parent) return undefined;

  if (isStatement(from) && from.parent.type === AST_NODE_TYPES.BlockStatement) {
    const index = from.parent.body.indexOf(from);

    for (let i = index - 1; i >= 0; i--) {
      const current = from.parent.body[i];
      if (isNodeOfType(current, AST_NODE_TYPES.VariableDeclaration)) {
        const declarator = findVariableDeclaratorInDeclaration(
          current,
          variable
        );
        if (declarator) return declarator;
      }
    }
  }

  return findDeclaratorUp(variable, from.parent, before);
}

/**
 * Find a VariableDeclarator in a VariableDeclaration if present.
 * @param node VariableDeclaration to search.
 * @param variable Name of the variable.
 * @returns The VariableDeclarator if found.
 */
export function findVariableDeclaratorInDeclaration(
  node: TSESTree.VariableDeclaration,
  variable: string
): TSESTree.VariableDeclarator | undefined {
  for (const declarator of node.declarations) {
    if (
      isNodeOfType(declarator.id, AST_NODE_TYPES.Identifier) &&
      declarator.id.name === variable
    ) {
      return declarator;
    }
  }

  return undefined;
}
