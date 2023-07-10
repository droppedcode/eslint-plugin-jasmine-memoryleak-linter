import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ReportSuggestionArray } from '@typescript-eslint/utils/dist/ts-eslint';

import { hasCleanup, isCaptured } from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  closestCallExpressionIfName,
  isCallExpressionWithName,
  siblingNodesOfType,
} from '../utils/node-utils';

type MessageIds =
  | 'declarationInDescribe'
  | 'declarationInDescribeIt'
  | 'declarationInDescribeBeforeAfterAll'
  | 'declarationInDescribeBeforeAfterEach'
  | 'declarationInDescribeManyIt'
  | 'declarationInDescribeBeforeAfterEachConst'
  | 'declarationInDescribeBeforeAfterAllConst';

/**
 * Fixes the declaration by moving it to the "it" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param siblingIts Sibling it nodes.
 * @param declarators Captured declarators.
 * @yields Fixes for the problem.
 */
function* fixMoveToIt(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.VariableDeclaration,
  siblingIts: TSESTree.CallExpression[],
  declarators: TSESTree.VariableDeclarator[]
): IterableIterator<TSESLint.RuleFix> {
  const declaration = context.getSourceCode().getText(node);
  for (const sibling of siblingIts) {
    const fix = insertToCallLastFunctionArgument(
      context,
      fixer,
      sibling,
      declaration,
      (node) => node.type === AST_NODE_TYPES.VariableDeclaration
    );
    if (fix) {
      yield fix;
    }
  }
  yield fixer.remove(node);
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
      .filter((f) => f.init && declarators.indexOf(f) !== -1)
      .map((m) => context.getSourceCode().getText(m))
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
        .filter((f) => 'name' in f.id)
        .map((m) => m.id['name'])
        .join(', ') +
      ';'
  );
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
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [], // no options
  },
  create: (context) => ({
    VariableDeclaration: (node): void => {
      if (!node.declarations.some((s) => s.init)) return;

      const call = closestCallExpressionIfName(node, 'describe');

      if (!call) return;

      const declarators = node.declarations.filter((s) => isCaptured(s));

      // No captured declarators
      if (declarators.length === 0) return;

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
      let fix: TSESLint.ReportFixFunction | undefined;

      if (siblingIts.length === 1) {
        fix = (fixer): IterableIterator<TSESLint.RuleFix> =>
          fixMoveToIt(context, fixer, node, siblingIts, declarators);
        suggestions.push({
          messageId: 'declarationInDescribeIt',
          fix: fix,
        });
      } else if (siblingIts.length > 1) {
        suggestions.push({
          messageId: 'declarationInDescribeManyIt',
          fix: (fixer) =>
            fixMoveToIt(context, fixer, node, siblingIts, declarators),
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
        declarators
      );

      addXSuggestion(
        node,
        suggestions,
        context,
        call,
        siblingBeforeAll,
        siblingAfterAll,
        'All',
        declarators
      );

      const report = {
        node: node,
        messageId: <MessageIds>'declarationInDescribe',
        suggest: suggestions,
      };

      fix ??= suggestions[suggestions.length - 2].fix;
      if (fix) {
        report['fix'] = fix;
      }

      return context.report(report);
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
