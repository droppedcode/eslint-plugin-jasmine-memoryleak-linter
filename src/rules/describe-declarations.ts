import { AST_NODE_TYPES, TSESLint, TSESTree } from '@typescript-eslint/utils';
import { ReportSuggestionArray } from '@typescript-eslint/utils/dist/ts-eslint';

import {
  closestNodeOfType,
  siblingNodesOfType,
} from '../tools/node-extensions';

type MessageIds =
  | 'declarationInDescribe'
  | 'declarationInDescribeIt'
  | 'declarationInDescribeBeforeAfter'
  | 'declarationInDescribeManyIt'
  | 'declarationInDescribeBeforeAfterConst';

/**
 * Fixes the declaration by moving it to the "it" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param siblingIts Sibling it nodes.
 * @yields Fixes for the problem.
 */
function* fixMoveToIt(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.VariableDeclaration,
  siblingIts: TSESTree.Node[]
): IterableIterator<TSESLint.RuleFix> {
  const declaration = context.getSourceCode().getText(node);
  for (const sibling of siblingIts) {
    const fix = insertToCall(
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
 * @param siblingAfter Sibling afterEach node, if any.
 * @yields Fixes for the problem.
 */
function* fixMoveToBeforeAfter(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.VariableDeclaration,
  describe: TSESTree.CallExpression,
  siblingBefore: TSESTree.Node | undefined,
  siblingAfter: TSESTree.Node | undefined
): IterableIterator<TSESLint.RuleFix> {
  const initialization =
    node.declarations
      .filter((f) => f.init)
      .map((m) => context.getSourceCode().getText(m))
      .join(', ') + ';';

  const release = node.declarations
    .filter((f) => 'name' in f.id)
    .map((m) => m.id['name'] + ' = null;')
    .join('\n');

  if (siblingBefore) {
    const fix = insertToCall(
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
    const fix = insertToCall(
      context,
      fixer,
      describe,
      'beforeEach(() => { ' + initialization + ' });',
      (node) => node.type === AST_NODE_TYPES.VariableDeclaration
    );
    if (fix) {
      yield fix;
    }
  }

  if (siblingAfter) {
    const fix = insertToCall(
      context,
      fixer,
      siblingAfter,
      release,
      (node) =>
        node.type === AST_NODE_TYPES.ExpressionStatement &&
        node.expression.type === AST_NODE_TYPES.AssignmentExpression
    );
    if (fix) {
      yield fix;
    }
  } else {
    const fix = insertToCall(
      context,
      fixer,
      describe,
      'afterEach(() => { ' + release + ' });',
      (node) => node.type === AST_NODE_TYPES.VariableDeclaration
    );
    if (fix) {
      yield fix;
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

/**
 * Prepend content to a call.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param node Node to work on.
 * @param content Content to prepend.
 * @param skipPredicate Predicate to find the node after insertion should happen.
 * @returns Fix for the prepend.
 */
function insertToCall(
  context: Readonly<TSESLint.RuleContext<MessageIds, []>>,
  fixer: TSESLint.RuleFixer,
  node: TSESTree.Node,
  content: string,
  skipPredicate?: (node: TSESTree.Node) => boolean
): TSESLint.RuleFix | undefined {
  const call = node as TSESTree.CallExpression;

  if (call.arguments.length < 1) return undefined;
  const fn = call.arguments[call.arguments.length - 1] as TSESTree.FunctionLike;

  if (!fn.body) return undefined;

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

export const describeDeclarationRule: TSESLint.RuleModule<MessageIds> = {
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    messages: {
      declarationInDescribe: 'There are declarations in a describe.',
      declarationInDescribeIt: 'Move declaration to the "it".',
      declarationInDescribeManyIt: 'Move declaration to each "it".',
      declarationInDescribeBeforeAfter:
        'Initialize values in "beforeEach" and delete in "afterEach".',
      declarationInDescribeBeforeAfterConst:
        'Change declaration to let and initialize values in "beforeEach" and delete in "afterEach".',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [], // no options
  },
  create: (context) => ({
    VariableDeclaration: (node): void => {
      if (!node.declarations.some((s) => s.init)) return;

      const call = closestNodeOfType(
        node,
        AST_NODE_TYPES.CallExpression
      ) as TSESTree.CallExpression;
      if (
        call &&
        'callee' in call &&
        'name' in call.callee &&
        call.callee.name === 'describe'
      ) {
        const siblingCalls = siblingNodesOfType(
          node,
          AST_NODE_TYPES.ExpressionStatement
        ).map((m) => m['expression'] as TSESTree.Node);
        const siblingIts = siblingCalls.filter(
          (f) => 'callee' in f && 'name' in f.callee && f.callee.name === 'it'
        );
        const siblingBefore = siblingCalls.filter(
          (f) =>
            'callee' in f &&
            'name' in f.callee &&
            f.callee.name === 'beforeEach'
        );
        const siblingAfter = siblingCalls.filter(
          (f) =>
            'callee' in f && 'name' in f.callee && f.callee.name === 'afterEach'
        );

        const suggestions: ReportSuggestionArray<MessageIds> = [];
        let fix: TSESLint.ReportFixFunction | undefined;

        if (siblingIts.length === 1) {
          fix = (fixer): IterableIterator<TSESLint.RuleFix> =>
            fixMoveToIt(context, fixer, node, siblingIts);
          suggestions.push({
            messageId: 'declarationInDescribeIt',
            fix: fix,
          });
        } else if (siblingIts.length > 1) {
          suggestions.push({
            messageId: 'declarationInDescribeManyIt',
            fix: (fixer) => fixMoveToIt(context, fixer, node, siblingIts),
          });
        }

        if (node.kind !== 'const') {
          suggestions.push({
            messageId: 'declarationInDescribeBeforeAfter',
            fix: (fixer) =>
              fixMoveToBeforeAfter(
                context,
                fixer,
                node,
                call,
                siblingBefore[0],
                siblingAfter[0]
              ),
          });
        } else {
          suggestions.push({
            messageId: 'declarationInDescribeBeforeAfterConst',
            fix: (fixer) =>
              fixMoveToBeforeAfter(
                context,
                fixer,
                node,
                call,
                siblingBefore[0],
                siblingAfter[0]
              ),
          });
        }

        const report = {
          node: node,
          messageId: <MessageIds>'declarationInDescribe',
          suggest: suggestions,
        };

        fix ??= suggestions[suggestions.length - 1].fix;
        if (fix) {
          report['fix'] = fix;
        }

        return context.report(report);
      }

      return;
    },
  }),
};
