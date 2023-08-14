import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';

import {
  closestNodeOfType,
  closestNodeOfTypes,
  getBodyNodesReversed,
  isCallExpression,
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

export type CapturingNode =
  | TSESTree.ArrowFunctionExpression
  | TSESTree.FunctionDeclaration
  | TSESTree.FunctionExpression;
type VariableDeclaratorWithIdentifier = TSESTree.VariableDeclarator & {
  // eslint-disable-next-line jsdoc/require-jsdoc
  id: TSESTree.Identifier;
};

/**
 * Get root statements for variable analysis.
 * @param variable The VariableDeclarator.
 * @returns The root statements.
 */
function getRootStatementsForVairableAnalysis(
  variable: TSESTree.VariableDeclarator
): TSESTree.Statement[] {
  if (!variable.parent)
    throw new Error('Parent is missing for VariableDeclarator.');
  if (!isNodeOfType(variable.parent, AST_NODE_TYPES.VariableDeclaration))
    throw new Error(
      'Parent for VariableDeclarator is not VariableDeclaration.'
    );

  if (variable.id.type !== AST_NODE_TYPES.Identifier) return [];

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

  if (!root) return [];

  // Collect top level statements where we need to look for closure
  let statements: TSESTree.Statement[];
  switch (root.type) {
    case AST_NODE_TYPES.ArrowFunctionExpression:
      if (root.body.type === AST_NODE_TYPES.BlockStatement) {
        statements = root.body.body;
      } else {
        return [];
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

  return statements;
}

/**
 * Searches for captures for a variable.
 * @param variable The VariableDeclarator.
 * @yields The capturing node.
 */
export function* findCaptures(
  variable: TSESTree.VariableDeclarator
): IterableIterator<CapturingNode> {
  if (variable.id.type !== AST_NODE_TYPES.Identifier) return;

  for (const statement of getRootStatementsForVairableAnalysis(variable)) {
    yield* findCapturesLookingForClosure(
      statement,
      <VariableDeclaratorWithIdentifier>variable,
      undefined,
      new Set()
    );
  }
}

/**
 * Checks if a variable is captured or not.
 * @param variable The VariableDeclarator.
 * @returns True if the variable is captured.
 */
export function isCaptured(variable: TSESTree.VariableDeclarator): boolean {
  return !findCaptures(variable).next().done;
}

/**
 * Searches for uses for a variable.
 * @param variable The VariableDeclarator.
 * @yields The using node.
 */
export function* findUses(
  variable: TSESTree.VariableDeclarator
): IterableIterator<TSESTree.Identifier> {
  if (variable.id.type !== AST_NODE_TYPES.Identifier) return;

  for (const statement of getRootStatementsForVairableAnalysis(variable)) {
    yield* findUsesOfVariable(
      statement,
      <VariableDeclaratorWithIdentifier>variable
    );
  }
}

/**
 * Checks if a variable is captured or not.
 * @param variable The VariableDeclarator.
 * @param parent The parent to look in, if undefined uses the root of the declaration.
 * @returns True if the variable is captured.
 */
export function isUsed(
  variable: TSESTree.VariableDeclarator,
  parent?: TSESTree.Node
): boolean {
  if (variable.id.type !== AST_NODE_TYPES.Identifier) false;

  return parent
    ? !findUsesOfVariable(
        parent,
        <VariableDeclaratorWithIdentifier>variable
      ).next().done
    : !findUses(variable).next().done;
}

/**
 * Looks for a closures that captures the variable.
 * Variable override detection for var declaration can cause false positives.
 * @param node Current node.
 * @param variable Variable declarator.
 * @param candidate Current yield candidate.
 * @param yielded Already yielded nodes.
 * @yields Nodes that capture the variable.
 */
function* findCapturesLookingForClosure(
  node: TSESTree.Node,
  variable: VariableDeclaratorWithIdentifier,
  candidate: CapturingNode | undefined,
  yielded: Set<CapturingNode>
): IterableIterator<CapturingNode> {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier:
      if (candidate && node.name === variable.id.name) {
        const currentCount = yielded.size;
        yielded.add(candidate);
        if (currentCount !== yielded.size) {
          yield candidate;
        }
      }
      break;
    case AST_NODE_TYPES.MemberExpression:
      // Ignore property
      yield* findCapturesLookingForClosure(
        node.object,
        variable,
        candidate,
        yielded
      );
      break;
    case AST_NODE_TYPES.BlockStatement:
      for (const child of node.body) {
        // Variable override
        if (
          !(
            isNodeOfType(child, AST_NODE_TYPES.VariableDeclaration) &&
            child.declarations.some(
              (s) => s !== variable && isNameIdentifier(s.id, variable.id.name)
            )
          )
        ) {
          yield* findCapturesLookingForClosure(
            child,
            variable,
            candidate,
            yielded
          );
        }
      }
      break;
    case AST_NODE_TYPES.Property:
      yield* findCapturesLookingForClosure(
        node.value,
        variable,
        candidate,
        yielded
      );
      break;
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
    case AST_NODE_TYPES.FunctionDeclaration:
      // Argument overrides variable
      if (!node.params.some((s) => isNameIdentifier(s, variable.id.name))) {
        yield* findCapturesLookingForClosure(
          node.body,
          variable,
          node,
          yielded
        );
      }
      break;
    default:
      for (const descendant of traverseParts(node)) {
        yield* findCapturesLookingForClosure(
          descendant,
          variable,
          candidate,
          yielded
        );
      }
      break;
  }
}

/**
 * Looks for a uses of variable.
 * Variable override detection for var declaration can cause false positives.
 * @param node Current node.
 * @param variable Variable declarator.
 * @yields Nodes that capture the variable.
 */
function* findUsesOfVariable(
  node: TSESTree.Node,
  variable: VariableDeclaratorWithIdentifier
): IterableIterator<TSESTree.Identifier> {
  switch (node.type) {
    case AST_NODE_TYPES.Identifier:
      if (node.name === variable.id.name) yield node;
      break;
    case AST_NODE_TYPES.BlockStatement:
      for (const child of node.body) {
        // Variable override
        if (
          !(
            isNodeOfType(child, AST_NODE_TYPES.VariableDeclaration) &&
            child.declarations.some(
              (s) => s !== variable && isNameIdentifier(s.id, variable.id.name)
            )
          )
        ) {
          yield* findUsesOfVariable(child, variable);
        }
      }
      break;
    case AST_NODE_TYPES.ArrowFunctionExpression:
    case AST_NODE_TYPES.FunctionExpression:
    case AST_NODE_TYPES.FunctionDeclaration:
      // Argument overrides variable
      if (!node.params.some((s) => isNameIdentifier(s, variable.id.name))) {
        yield* findUsesOfVariable(node.body, variable);
      }
      break;
    case AST_NODE_TYPES.Property:
      yield* findUsesOfVariable(node.value, variable);
      break;
    case AST_NODE_TYPES.MemberExpression:
      yield* findUsesOfVariable(node.object, variable);
      break;
    default:
      for (const descendant of traverseParts(node)) {
        yield* findUsesOfVariable(descendant, variable);
      }
      break;
  }
}

/**
 * Iterates on all direct node in node.
 * @param node Current node.
 * @yields Nodes in the tree.
 */
export function* traverseParts(
  node: TSESTree.Node
): IterableIterator<TSESTree.Node> {
  // Check for field is present and assume it is a node
  if ('argument' in node && node.argument) yield node.argument;
  if ('arguments' in node && node.arguments) yield* node.arguments;
  if ('properties' in node && node.properties) yield* node.properties;
  if ('elements' in node && node.elements) {
    for (const element of node.elements) {
      if (element) yield element;
    }
  }
  if ('key' in node && node.key) yield node.key;
  if (
    'value' in node &&
    node.value &&
    typeof node.value === 'object' &&
    'type' in node.value
  )
    yield node.value;
  if ('params' in node && node.params) yield* node.params;
  if ('callee' in node && node.callee) yield node.callee;
  if ('left' in node && node.left) yield node.left;
  if ('right' in node && node.right) yield node.right;
  if ('object' in node && node.object) yield node.object;
  if ('property' in node && node.property) yield node.property;
  if ('declarations' in node && node.declarations) yield* node.declarations;
  if ('expression' in node && node.expression && node.expression !== true)
    yield node.expression;
  if ('expressions' in node && node.expressions) yield* node.expressions;
  if ('init' in node && node.init) yield node.init;
  if ('id' in node && node.id) yield node.id;
  if ('body' in node && node.body) {
    if (Array.isArray(node.body)) {
      yield* node.body;
    } else {
      yield node.body;
    }
  }
}

/**
 * Iterates on all nodes.
 * @param node Current node.
 * @yields Nodes in the tree.
 */
export function* traversePartsDeep(
  node: TSESTree.Node
): IterableIterator<TSESTree.Node> {
  for (const part of traverseParts(node)) {
    yield part;
    yield* traversePartsDeep(part);
  }
}

/**
 * Traverses the tree and adds the parent node.
 * @param node Current node.
 */
export function applyParent(node: TSESTree.Node): void {
  for (const part of traverseParts(node)) {
    part.parent = node;
    applyParent(part);
  }
}

/**
 * Checks the assignement statements if the usages are mixed up.
 * @param block The block statement to reorder.
 * @returns True if the statements are mixed up.
 */
export function isStatementsBasedOnAssignmentAndUsageMixedUp<
  TMessageIds extends string,
  TOptions
>(block: TSESTree.BlockStatement): boolean {
  const currentList = block.body;
  const newList: TSESTree.Statement[] = [];
  const declarators: Map<
    TSESTree.Statement,
    TSESTree.VariableDeclarator | undefined
  > = new Map();

  for (const statement of currentList) {
    if (
      statement.type === AST_NODE_TYPES.ExpressionStatement &&
      statement.expression.type === AST_NODE_TYPES.AssignmentExpression &&
      isNameIdentifier(statement.expression.left)
    ) {
      if (!declarators.has(statement)) {
        declarators.set(
          statement,
          findDeclarator(statement.expression.left.name, statement)
        );
      }

      const declarator = declarators.get(statement);
      if (!declarator) continue;

      for (let i = 0; i < newList.length; i++) {
        if (isUsed(declarator, newList[i])) {
          return true;
        }
      }

      newList.push(statement);
    } else {
      newList.push(statement);
    }
  }

  return false;
}

/**
 * Reorders the assignement statements if the usages are mixed up.
 * @param context The rule context.
 * @param fixer The fixer used.
 * @param block The block statement to reorder.
 * @param additionalStatements Additional statements to insert.
 * @yields Code fixes.
 */
export function* reorderStatementsBasedOnAssignmentAndUsage<
  TMessageIds extends string,
  TOptions
>(
  context: Readonly<TSESLint.RuleContext<TMessageIds, Partial<TOptions>[]>>,
  fixer: TSESLint.RuleFixer,
  block: TSESTree.BlockStatement,
  ...additionalStatements: TSESTree.Statement[]
): IterableIterator<TSESLint.RuleFix> {
  let currentList = [...block.body, ...additionalStatements];
  let newList: TSESTree.Statement[] = [];
  const declarators: Map<
    TSESTree.Statement,
    TSESTree.VariableDeclarator | undefined
  > = new Map();

  let hasChanges = additionalStatements.length > 0;

  // We need to run multiple times for complex cases, limit the run count to the statement count
  // If this is not enough, probably we have circular dependency
  const maxRunCount = currentList.length;

  for (let run = 0; run < maxRunCount; run++) {
    let hasChangesInRun = false;

    for (const statement of currentList) {
      if (
        statement.type === AST_NODE_TYPES.ExpressionStatement &&
        statement.expression.type === AST_NODE_TYPES.AssignmentExpression &&
        isNameIdentifier(statement.expression.left)
      ) {
        if (!declarators.has(statement)) {
          declarators.set(
            statement,
            findDeclarator(statement.expression.left.name, statement)
          );
        }

        const declarator = declarators.get(statement);
        if (!declarator) continue;

        let isInserted = false;

        for (let i = 0; i < newList.length; i++) {
          if (isUsed(declarator, newList[i])) {
            newList.splice(i, 0, statement);
            isInserted = true;
            hasChangesInRun = true;
            hasChanges = true;
            break;
          }
        }

        if (!isInserted) {
          newList.push(statement);
        }
      } else {
        newList.push(statement);
      }
    }

    if (hasChangesInRun) {
      currentList = newList;
      newList = [];
    } else {
      break;
    }
  }

  if (hasChanges) {
    yield fixer.replaceText(
      block,
      `{ ${newList.map((m) => context.getSourceCode().getText(m)).join('\n')} }`
    );
  }
}

/**
 * Locate a call's last arguments body with statements.
 * This is used to locate function calls statements like before, it...
 * @param node Node to locate the body for.
 * @returns The content of the call or undefined if not found.
 */
export function getCallFunctionBody(
  node: TSESTree.CallExpression | CapturingNode
): TSESTree.BlockStatement | TSESTree.Expression | undefined {
  let body: TSESTree.BlockStatement | TSESTree.Expression;

  if (node.type === AST_NODE_TYPES.CallExpression) {
    if (node.arguments.length < 1) return;

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

    if (!lastArg) return;

    body =
      lastArg.type === AST_NODE_TYPES.SpreadElement
        ? lastArg.argument
        : lastArg;
  }

  if (body.type !== AST_NODE_TYPES.BlockStatement && 'body' in body) {
    if (body.body.type === AST_NODE_TYPES.ClassBody) {
      // This should not happen...
      return;
    } else {
      body = body.body;
    }
  }

  return body;
}
