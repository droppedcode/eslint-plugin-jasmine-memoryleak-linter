import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

import {
  closestNodeOfType,
  closestNodeOfTypes,
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

/**
 * Checks if a variable is captured or not.
 * @param variable The VariableDeclarator.
 * @returns True if the variable is captured.
 */
export function isCaptured(variable: TSESTree.VariableDeclarator): boolean {
  if (!variable.parent)
    throw new Error('Parent is missing for VariableDeclarator.');
  if (!isNodeOfType(variable.parent, AST_NODE_TYPES.VariableDeclaration))
    throw new Error(
      'Parent for VariableDeclarator is not VariableDeclaration.'
    );

  if (variable.id.type !== AST_NODE_TYPES.Identifier) return false;

  const root =
    // With var we need function scope
    variable.parent.kind === 'var'
      ? <
          | TSESTree.ArrowFunctionExpression
          | TSESTree.FunctionExpression
          | TSESTree.Program
        >closestNodeOfTypes(variable, [
          AST_NODE_TYPES.ArrowFunctionExpression,
          AST_NODE_TYPES.FunctionExpression,
          AST_NODE_TYPES.Program,
        ])
      : closestNodeOfType(variable, AST_NODE_TYPES.BlockStatement);

  if (!root) return false;

  // Collect top level statements where we need to look for closure
  let statements: TSESTree.Statement[];
  switch (root.type) {
    case AST_NODE_TYPES.ArrowFunctionExpression:
      if (root.body.type === AST_NODE_TYPES.BlockStatement) {
        statements = root.body.body;
      } else {
        return false;
      }
      break;
    case AST_NODE_TYPES.FunctionExpression:
      statements = root.body.body;
      break;
    case AST_NODE_TYPES.Program:
      statements = root.body;
      break;
    case AST_NODE_TYPES.BlockStatement:
      statements = root.body;
      break;
  }

  for (const statement of statements) {
    if (
      hasClosureLookingForClosure(
        statement,
        // eslint-disable-next-line jsdoc/require-jsdoc
        <TSESTree.VariableDeclarator & { id: TSESTree.Identifier }>variable
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Looks for a closure that captures the variable.
 * Variable override detection for var declaration can cause false positives.
 * @param node Current node.
 * @param variable Variable declarator.
 * @returns True if there is a closure which captures the variable.
 */
function hasClosureLookingForClosure(
  node: TSESTree.Node,
  // eslint-disable-next-line jsdoc/require-jsdoc
  variable: TSESTree.VariableDeclarator & { id: TSESTree.Identifier }
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.BlockStatement:
      for (const child of node.body) {
        // Variable override
        if (
          isNodeOfType(child, AST_NODE_TYPES.VariableDeclaration) &&
          child.declarations.some(
            (s) => s !== variable && isNameIdentifier(s.id, variable.id.name)
          )
        )
          return false;

        if (hasClosureLookingForClosure(child, variable)) {
          return true;
        }
      }
      return false;
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
      // Argument overrides variable
      if (node.params.some((s) => isNameIdentifier(s, variable.id.name)))
        return false;

      if (node.body.type === AST_NODE_TYPES.BlockStatement) {
        for (const child of node.body.body) {
          if (hasClosureLookingForUse(child, variable.id.name)) return true;
        }
      } else {
        if (hasClosureLookingForUse(node.body, variable.id.name)) {
          return true;
        }
      }
      return false;
  }

  for (const descendant of traverseParts(node)) {
    if (hasClosureLookingForClosure(descendant, variable)) {
      return true;
    }
  }

  return false;
}

/**
 * Looks for a variable use.
 * Variable override detection for var declaration can cause false positives.
 * @param node Current node.
 * @param variable Variable name.
 * @returns True if there is a use of the variable.
 */
function hasClosureLookingForUse(
  node: TSESTree.Node,
  variable: string
): boolean {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier:
      return node.name === variable;
    case AST_NODE_TYPES.BlockStatement:
      for (const child of node.body) {
        // Variable override
        if (
          isNodeOfType(child, AST_NODE_TYPES.VariableDeclaration) &&
          child.declarations.some((s) => isNameIdentifier(s.id, variable))
        )
          return false;

        if (hasClosureLookingForUse(child, variable)) {
          return true;
        }
      }
      return false;
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
      // Argument overrides variable
      if (node.params.some((s) => isNameIdentifier(s, variable))) return false;

      if (node.body.type === AST_NODE_TYPES.BlockStatement) {
        for (const child of node.body.body) {
          if (hasClosureLookingForUse(child, variable)) return true;
        }
      } else {
        if (hasClosureLookingForUse(node.body, variable)) {
          return true;
        }
      }
      return false;
    case AST_NODE_TYPES.MemberExpression:
      // Ignore property
      return hasClosureLookingForUse(node.object, variable);
  }

  for (const descendant of traverseParts(node)) {
    if (hasClosureLookingForUse(descendant, variable)) {
      return true;
    }
  }

  return false;
}

/**
 * Iterates on all direct node in node.
 * @param node Current node.
 * @yields Nodes in the tree.
 */
function* traverseParts(node: TSESTree.Node): IterableIterator<TSESTree.Node> {
  switch (node.type) {
    case AST_NODE_TYPES.BlockStatement:
      yield* node.body;
      break;
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
      yield* node.params;

      if (node.body.type === AST_NODE_TYPES.BlockStatement) {
        yield* node.body.body;
      } else {
        yield node.body;
      }
      break;
    default:
      // Check for field is present and assume it is a node
      if ('argument' in node && node.argument) yield node.argument;
      if ('arguments' in node && node.arguments) yield* node.arguments;
      if ('params' in node && node.params) yield* node.params;
      if ('callee' in node && node.callee) yield node.callee;
      if ('left' in node && node.left) yield node.left;
      if ('right' in node && node.right) yield node.right;
      if ('object' in node && node.object) yield node.object;
      if ('property' in node && node.property) yield node.property;
      if ('expression' in node && node.expression && node.expression !== true)
        yield node.expression;
      break;
  }
}
