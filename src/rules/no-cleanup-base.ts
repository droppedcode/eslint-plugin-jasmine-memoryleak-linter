// Check if we are not cleaning up the data in afterX
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import {
  RuleContext,
  RuleFixer,
  RuleFix,
  RuleModule,
  ReportSuggestionArray,
} from '@typescript-eslint/utils/ts-eslint';

import { findDeclarator, getLastAssignment } from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  ancestorCallExpressionIfName,
  closestCallExpression,
  isCallExpressionWithName,
  isNameIdentifier,
  isTruishAssignment,
  siblingNodesOfType,
} from '../utils/node-utils';

export type MessageIds =
  | 'assignmentWithoutCleanup'
  | 'assignmentInCleanup'
  | 'assignmentInCleanupAdd'
  | 'assignmentInCleanupReplace';

export type CleanupRuleOptions = {
  /** Names of the functions that can initialize values. */
  initializationFunctionNames: string[];
  /** Names of the functions that can unreference values. */
  unreferenceFunctionNames: string[];
};

type Context = Readonly<RuleContext<MessageIds, Partial<CleanupRuleOptions>[]>>;

/**
 * Fixes the declaration by add dereference to "afterX" calls.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param cleanup Cleanup code.
 * @param describe Describe node.
 * @param after AfterX node, if any.
 * @param dereferenceMethod Dereference method name.
 * @yields Fix for the problem.
 */
function* fixToDereference(
  context: Context,
  fixer: RuleFixer,
  cleanup: string,
  describe: TSESTree.CallExpression,
  after: TSESTree.CallExpression | undefined,
  dereferenceMethod: string
): IterableIterator<RuleFix> {
  if (after) {
    yield* insertToCallLastFunctionArgument(
      context,
      fixer,
      after,
      cleanup,
      undefined,
      'after'
    );
  } else {
    yield* insertToCallLastFunctionArgument(
      context,
      fixer,
      describe,
      dereferenceMethod + '(() => { ' + cleanup + ' });',
      (node) =>
        node.type === AST_NODE_TYPES.VariableDeclaration ||
        (node.type === AST_NODE_TYPES.ExpressionStatement &&
          (isCallExpressionWithName(node.expression, 'beforeEach') ||
            isCallExpressionWithName(node.expression, 'beforeAll') ||
            isCallExpressionWithName(node.expression, 'afterEach') ||
            isCallExpressionWithName(node.expression, 'afterAll')))
          ? 'after'
          : undefined
    );
  }
}

/**
 * Create an each* rule.
 * @param defaultRuleOptions Default rule options.
 * @param dereferenceInSameMethod Should the dereference be in the same method.
 * @returns The rule.
 */
export function createRule(
  defaultRuleOptions: CleanupRuleOptions,
  dereferenceInSameMethod: boolean
): RuleModule<MessageIds, Partial<CleanupRuleOptions>[]> {
  return {
    defaultOptions: [],
    meta: {
      type: 'suggestion',
      messages: {
        assignmentWithoutCleanup:
          'There is assignment in "{{before}}" but no cleanup in "{{after}}".',
        assignmentInCleanup: 'Last assignment is not a cleanup.',
        assignmentInCleanupAdd: 'Add a cleanup assignment.',
        assignmentInCleanupReplace: 'Replace assignment to cleanup.',
      },
      fixable: 'code',
      hasSuggestions: true,
      schema: [
        {
          type: 'object',
          properties: {
            initializationFunctionNames: {
              type: 'array',
              items: { type: 'string' },
            },
            unreferenceFunctionNames: {
              type: 'array',
              items: { type: 'string' },
            },
          },
          additionalProperties: false,
        },
      ],
    },
    create: (context) => ({
      AssignmentExpression: (node): void => {
        if (!isNameIdentifier(node.left)) return;
        // Non truish assignment is skipped.
        if (!isTruishAssignment(node)) return;

        const name = node.left.name;

        const options = Object.assign(
          {},
          defaultRuleOptions,
          context.options[0]
        );
        const call = ancestorCallExpressionIfName(
          node,
          options.initializationFunctionNames
        );

        if (!call) return;

        // Check if this is within a VariableDeclaration
        if (node.parent?.type === AST_NODE_TYPES.VariableDeclaration) return;
        // Local declaration
        if (findDeclarator(name, node, (n) => n === call)) return;

        const declaration = findDeclarator(name, node);
        const useExclamation =
          !!declaration &&
          declaration.id.typeAnnotation?.typeAnnotation &&
          !hasUndefinedType(declaration.id.typeAnnotation.typeAnnotation);

        const dereferenceSiblings = siblingNodesOfType(
          call,
          AST_NODE_TYPES.ExpressionStatement,
          (n) =>
            isCallExpressionWithName(
              n.expression,
              options.unreferenceFunctionNames
            ) &&
            n.expression.arguments.length > 0 &&
            n.expression.arguments[n.expression.arguments.length - 1]['body']
        ).map((m) => m.expression as TSESTree.CallExpression);

        if (dereferenceInSameMethod) {
          dereferenceSiblings.splice(0, 0, call);
        }

        const child = getLastAssignment(dereferenceSiblings, name);

        const unref = useExclamation ? ' = undefined!;' : ' = undefined;';

        if (child) {
          if (isTruishAssignment(child)) {
            const suggestions: ReportSuggestionArray<MessageIds> = [];

            if (!dereferenceInSameMethod) {
              suggestions.push({
                messageId: 'assignmentInCleanupReplace',
                fix: (fixer) => fixer.replaceText(child.right, unref),
              });
            }

            suggestions.push({
              messageId: 'assignmentInCleanupAdd',
              fix: (fixer) =>
                insertToCallLastFunctionArgument(
                  context,
                  fixer,
                  dereferenceSiblings[dereferenceSiblings.length - 1],
                  name + unref,
                  undefined,
                  'after'
                ) ?? fixer.insertTextAfter(child, ''),
            });

            return context.report({
              messageId: 'assignmentInCleanup',
              node: child,
              fix: (fixer) =>
                insertToCallLastFunctionArgument(
                  context,
                  fixer,
                  dereferenceSiblings[dereferenceSiblings.length - 1],
                  name + unref,
                  undefined,
                  'after'
                ) ?? fixer.insertTextAfter(child, ''),
              suggest: suggestions,
            });
          } else {
            // There is cleanup code, nothing to do.
            return;
          }
        }

        if (!call.parent) throw new Error('Missing parent.');
        const parent = closestCallExpression(call.parent);
        if (!parent) throw new Error('Missing parent call.');

        const afterName =
          options.unreferenceFunctionNames[
            options.initializationFunctionNames.indexOf(call.callee.name)
          ] ?? options.unreferenceFunctionNames[0];

        return context.report({
          messageId: 'assignmentWithoutCleanup',
          data: {
            before: call.callee.name,
            after: afterName,
          },
          node: node,
          fix: (fixer) =>
            fixToDereference(
              context,
              fixer,
              name + unref,
              parent,
              dereferenceSiblings[dereferenceSiblings.length - 1],
              afterName
            ) ?? fixer.insertTextAfter(parent, ''),
          suggest: [
            {
              messageId: 'assignmentInCleanupAdd',
              fix: (fixer) =>
                fixToDereference(
                  context,
                  fixer,
                  name + unref,
                  parent,
                  dereferenceSiblings[dereferenceSiblings.length - 1],
                  afterName
                ) ?? fixer.insertTextAfter(parent, ''),
            },
          ],
        });
      },
    }),
  };
}

/**
 * Checks if a type annotation contains undefined as an option.
 * Does not follow type declarations.
 * @param typeAnnotation Annotation to check.
 * @returns True if it contains undefined.
 */
function hasUndefinedType(typeAnnotation: TSESTree.TypeNode): boolean {
  return (
    typeAnnotation.type === AST_NODE_TYPES.TSUndefinedKeyword ||
    typeAnnotation.type === AST_NODE_TYPES.TSAnyKeyword ||
    (typeAnnotation.type === AST_NODE_TYPES.TSUnionType &&
      typeAnnotation.types.some(
        (s) => s.type === AST_NODE_TYPES.TSUndefinedKeyword
      ))
  );
}
