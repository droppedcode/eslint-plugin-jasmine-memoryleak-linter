import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ReportSuggestionArray } from '@typescript-eslint/utils/dist/ts-eslint';

import { CapturingNode, findCaptures, hasCleanup } from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  closestCallExpressionIfName,
  closestNodeOfTypes,
  isCallExpressionWithName,
  isNameIdentifier,
  isNodeOfType,
  siblingNodesOfType,
} from '../utils/node-utils';

type MessageIds =
  | 'declarationInDescribe'
  | 'declarationInDescribeIt'
  | 'declarationInDescribeBeforeAfterAll'
  | 'declarationInDescribeBeforeAfterEach'
  | 'declarationInDescribeManyIt'
  | 'declarationInDescribeBeforeAfterEachConst'
  | 'declarationInDescribeBeforeAfterAllConst'
  | 'declarationInDescribeForInit'
  | 'declarationInDescribeForInitMove';

/**
 * Fixes the declaration by moving it to the "it" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param targets Sibling it nodes.
 * @param declarators Captured declarators.
 * @param atStart Should be inserted at start or after declarations.
 * @yields Fixes for the problem.
 */
function* fixMoveTo(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.VariableDeclaration,
  targets: (TSESTree.CallExpression | CapturingNode)[],
  declarators: TSESTree.VariableDeclarator[],
  atStart: boolean
): IterableIterator<TSESLint.RuleFix> {
  const declaration =
    node.kind +
    ' ' +
    declarators.map((m) => context.getSourceCode().getText(m)).join(',') +
    ';';

  for (const target of targets) {
    const fix = insertToCallLastFunctionArgument(
      context,
      fixer,
      target,
      declaration,
      (node) => !atStart && node.type === AST_NODE_TYPES.VariableDeclaration
    );

    if (fix) {
      yield fix;
    }
  }

  if (node.declarations.length === declarators.length) {
    yield fixer.remove(node);
  } else {
    yield* declarators.map((m) => fixer.remove(m));
  }
}

/**
 * Fixes the declaration by moving initialization to the "beforeEach" and removing to "afterEach" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param describe Describe node.
 * @param siblingBefore Sibling beforeEach node, if any.
 * @param siblingAfters Sibling afterEach nodes, if any.
 * @param suffix Suffix of the each commands.
 * @param declarators Captured declarators.
 * @yields Fixes for the problem.
 */
function* fixMoveToBeforeAfter(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.VariableDeclaration,
  describe: TSESTree.CallExpression,
  siblingBefore: TSESTree.CallExpression | undefined,
  siblingAfters: TSESTree.CallExpression[],
  suffix: string,
  declarators: TSESTree.VariableDeclarator[]
): IterableIterator<TSESLint.RuleFix> {
  const initialization =
    node.declarations
      .filter((f) => f.init && 'name' in f.id && declarators.indexOf(f) !== -1)
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      .map(
        (m) => m.id['name'] + ' = ' + context.getSourceCode().getText(m.init!)
      )
      .join(', ') + ';';

  const cleanup = node.declarations
    .filter(
      (f) =>
        'name' in f.id &&
        declarators.indexOf(f) !== -1 &&
        !hasCleanup(siblingAfters, f.id['name'])
    )
    .map((m) => m.id['name'] + ' = undefined;')
    .join('\n');

  if (siblingBefore) {
    const fix = insertToCallLastFunctionArgument(
      context,
      fixer,
      siblingBefore,
      initialization,
      (node) =>
        node.type === AST_NODE_TYPES.ExpressionStatement &&
        node.expression.type === AST_NODE_TYPES.AssignmentExpression
    );
    if (fix) {
      yield fix;
    }
  } else {
    const fix = insertToCallLastFunctionArgument(
      context,
      fixer,
      describe,
      'before' + suffix + '(() => { ' + initialization + ' });',
      (node) =>
        node.type === AST_NODE_TYPES.VariableDeclaration ||
        (node.type === AST_NODE_TYPES.ExpressionStatement &&
          (isCallExpressionWithName(node.expression, 'beforeEach') ||
            isCallExpressionWithName(node.expression, 'beforeAll')))
    );
    if (fix) {
      yield fix;
    }
  }

  if (cleanup.length) {
    if (siblingAfters.length) {
      const fix = insertToCallLastFunctionArgument(
        context,
        fixer,
        siblingAfters[siblingAfters.length - 1],
        cleanup,
        () => true
      );
      if (fix) {
        yield fix;
      }
    } else {
      const fix = insertToCallLastFunctionArgument(
        context,
        fixer,
        describe,
        'after' + suffix + '(() => { ' + cleanup + ' });',
        (node) =>
          node.type === AST_NODE_TYPES.VariableDeclaration ||
          (node.type === AST_NODE_TYPES.ExpressionStatement &&
            (isCallExpressionWithName(node.expression, 'beforeEach') ||
              isCallExpressionWithName(node.expression, 'beforeAll') ||
              isCallExpressionWithName(node.expression, 'afterEach') ||
              isCallExpressionWithName(node.expression, 'afterAll')))
      );
      if (fix) {
        yield fix;
      }
    }
  }

  yield fixer.replaceText(
    node,
    (node.kind === 'const' ? 'let' : node.kind) +
      ' ' +
      node.declarations
        .map((m) => context.getSourceCode().getText(m.id))
        .join(', ') +
      ';'
  );
}

/**
 * Check if a declarator is allowed.
 * @param declarator VariableDeclarator to check.
 * @param kind Declaration kind.
 * @returns True if the declaration is allowed.
 */
function allowedDeclarator(
  declarator: TSESTree.VariableDeclarator,
  kind: 'const' | 'let' | 'var'
): boolean {
  // No init
  if (!declarator.init) return true;

  // Must be const
  if (kind !== 'const') return false;

  // Allow literals
  if (isNodeOfType(declarator.init, AST_NODE_TYPES.Literal)) return true;

  // Allow undefined
  if (isNameIdentifier(declarator.init, 'undefined')) return true;

  return false;
}

// TODO: add options to skip eg. const
export const declarationInDescribeRule: TSESLint.RuleModule<MessageIds> = {
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    messages: {
      declarationInDescribe: 'There are declarations in a describe.',
      declarationInDescribeIt: 'Move declarations to the "it".',
      declarationInDescribeManyIt: 'Move declarations to each "it".',
      declarationInDescribeBeforeAfterEach:
        'Initialize values in "beforeEach" and unreference in "afterEach".',
      declarationInDescribeBeforeAfterEachConst:
        'Change declaration to let and initialize values in "beforeEach" and unreference in "afterEach".',
      declarationInDescribeBeforeAfterAll:
        'Initialize values in "beforeAll" and unreference in "afterAll".',
      declarationInDescribeBeforeAfterAllConst:
        'Change declaration to let and initialize values in "beforeAll" and unreference in "afterAll".',
      declarationInDescribeForInit:
        'There are declarations in a describe which is used for initialization, but captured.',
      declarationInDescribeForInitMove:
        'Move declarations to the describe that captures it.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [], // no options
  },
  create: (context) => ({
    VariableDeclaration: (node): void => {
      if (!node.declarations.some((s) => !allowedDeclarator(s, node.kind)))
        return;

      // Within a function
      if (
        closestNodeOfTypes(node, [
          AST_NODE_TYPES.CallExpression,
          AST_NODE_TYPES.FunctionDeclaration,
        ])?.type === AST_NODE_TYPES.FunctionDeclaration
      )
        return;

      const call = closestCallExpressionIfName(node, 'describe');

      if (!call) return;

      const declarators = node.declarations.map((declarator) => {
        const captures = [...findCaptures(declarator)];
        return {
          declarator,
          captures,
          describeCaptures: captures
            .map((m) => closestCallExpressionIfName(m, 'describe'))
            .filter((e) => !!e),
        };
      });

      // No captured declarators
      if (declarators.every((e) => e.captures.length === 0)) return;

      // Declarators we need before/after fixes
      const fixDeclarators = declarators
        .filter((f) => f.captures.length !== f.describeCaptures.length)
        .map((m) => m.declarator);

      const [beforeFix, describeFix] = declarators.reduce(
        ([fix, desc], item) =>
          item.captures.length !== item.describeCaptures.length
            ? [[...fix, item], desc]
            : [fix, [...desc, item]],
        [[], []]
      );

      if (beforeFix.length > 0) {
        const siblingCalls = siblingNodesOfType(
          node,
          AST_NODE_TYPES.ExpressionStatement
        ).map((m) => m.expression);
        const siblingIts = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) => isCallExpressionWithName(f, 'it'))
        );
        const siblingBeforeEach = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) => isCallExpressionWithName(f, 'beforeEach'))
        );
        const siblingAfterEach = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) => isCallExpressionWithName(f, 'afterEach'))
        );
        const siblingBeforeAll = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) => isCallExpressionWithName(f, 'beforeAll'))
        );
        const siblingAfterAll = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) => isCallExpressionWithName(f, 'afterAll'))
        );

        const suggestions: ReportSuggestionArray<MessageIds> = [];

        if (siblingIts.length === 1) {
          suggestions.push({
            messageId: 'declarationInDescribeIt',
            fix: (fixer): IterableIterator<TSESLint.RuleFix> =>
              fixMoveTo(
                context,
                fixer,
                node,
                siblingIts,
                fixDeclarators,
                false
              ),
          });
        } else if (siblingIts.length > 1) {
          suggestions.push({
            messageId: 'declarationInDescribeManyIt',
            fix: (fixer) =>
              fixMoveTo(
                context,
                fixer,
                node,
                siblingIts,
                fixDeclarators,
                false
              ),
          });
        }

        addXSuggestion(
          node,
          suggestions,
          context,
          call,
          siblingBeforeEach,
          siblingAfterEach,
          'Each',
          fixDeclarators
        );

        addXSuggestion(
          node,
          suggestions,
          context,
          call,
          siblingBeforeAll,
          siblingAfterAll,
          'All',
          fixDeclarators
        );

        const report: TSESLint.ReportDescriptor<MessageIds> = {
          node: node,
          messageId: 'declarationInDescribe',
          suggest: suggestions,
          fix: suggestions[suggestions.length - 2]?.fix,
        };

        return context.report(report);
      } else if (describeFix.length > 0) {
        const report: TSESLint.ReportDescriptor<MessageIds> = {
          node: node,
          messageId: 'declarationInDescribeForInit',
          fix: function* (fixer): IterableIterator<TSESLint.RuleFix> {
            for (const item of describeFix) {
              yield* fixMoveTo(
                context,
                fixer,
                node,
                item.captures,
                [item.declarator],
                true
              );
            }
          },
          suggest: [
            {
              messageId: 'declarationInDescribeForInitMove',
              fix: function* (fixer): IterableIterator<TSESLint.RuleFix> {
                for (const item of describeFix) {
                  yield* fixMoveTo(
                    context,
                    fixer,
                    node,
                    item.captures,
                    [item.declarator],
                    true
                  );
                }
              },
            },
          ],
        };

        return context.report(report);
      }
    },
  }),
};

/**
 * Add a suggestion for eachX fix.
 * @param node Variable declaration.
 * @param suggestions Suggestions to push to.
 * @param context Rule context to use.
 * @param describe The describe where the variable is declared.
 * @param siblingBefore Sibling beforeX calls.
 * @param siblingAfter Sibling afterX calls.
 * @param suffix Function suffix to use.
 * @param declarators Captured declarators.
 */
function addXSuggestion(
  node: TSESTree.VariableDeclaration,
  suggestions: TSESLint.ReportSuggestionArray<MessageIds>,
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  // eslint-disable-next-line jsdoc/require-jsdoc
  describe: TSESTree.CallExpression & { callee: { name: 'describe' } },
  siblingBefore: TSESTree.CallExpression[],
  siblingAfter: TSESTree.CallExpression[],
  suffix: string,
  declarators: TSESTree.VariableDeclarator[]
): void {
  if (node.kind !== 'const') {
    suggestions.push({
      messageId: <MessageIds>('declarationInDescribeBeforeAfter' + suffix),
      fix: (fixer) =>
        fixMoveToBeforeAfter(
          context,
          fixer,
          node,
          describe,
          siblingBefore[0],
          siblingAfter,
          suffix,
          declarators
        ),
    });
  } else {
    suggestions.push({
      messageId: <MessageIds>(
        ('declarationInDescribeBeforeAfter' + suffix + 'Const')
      ),
      fix: (fixer) =>
        fixMoveToBeforeAfter(
          context,
          fixer,
          node,
          describe,
          siblingBefore[0],
          siblingAfter,
          suffix,
          declarators
        ),
    });
  }
}
