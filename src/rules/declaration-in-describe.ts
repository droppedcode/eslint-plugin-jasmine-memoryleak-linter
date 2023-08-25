import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';
import {
  RuleContext,
  RuleFixer,
  RuleFix,
  RuleModule,
  ReportSuggestionArray,
  ReportDescriptor,
} from '@typescript-eslint/utils/ts-eslint';

import {
  InDescribeRuleOptions,
  defaultInDescribeRuleOptions,
} from './in-describe-options';
import {
  CapturingNode,
  findCaptures,
  findDeclarator,
  hasCleanup,
  isUsed,
} from '../utils/common';
import { insertToCallLastFunctionArgument } from '../utils/fixer-utils';
import {
  closestCallExpression,
  closestCallExpressionIfName,
  closestNodeOfTypes,
  isCallExpressionWithName,
  isNameIdentifier,
  isNodeOfType,
  siblingNodes,
  siblingNodesOfType,
} from '../utils/node-utils';

type MessageIds =
  | 'declarationInDescribe'
  | 'declarationInDescribeIt'
  | 'declarationInDescribeBeforeAfterX'
  | 'declarationInDescribeManyIt'
  | 'declarationInDescribeBeforeAfterXConst'
  | 'declarationInDescribeForInit'
  | 'declarationInDescribeForInitMove'
  | 'declarationInDescribeForInitUseFunction';

export type DeclarationInDescribeRuleOptions = InDescribeRuleOptions & {
  /** Allow auto fixing for init issues. */
  forInit: boolean;
};

type Context = Readonly<
  RuleContext<MessageIds, Partial<DeclarationInDescribeRuleOptions>[]>
>;

/**
 * Information about a declarator.
 */
type DeclaratorMeta = {
  /** Declarator. */
  declarator: TSESTree.VariableDeclarator;
  /** Nodes that captures the declarator. */
  captures: CapturingNode[];
  /** Describe nodes that captures the declarator. */
  describeCaptures: (
    | (TSESTree.CallExpression & {
        // eslint-disable-next-line jsdoc/require-jsdoc
        callee: {
          // eslint-disable-next-line jsdoc/require-jsdoc
          name: string;
        };
      })
    | undefined
  )[];
};

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
  context: Context,
  fixer: RuleFixer,
  node: TSESTree.VariableDeclaration,
  targets: (TSESTree.CallExpression | CapturingNode)[],
  declarators: TSESTree.VariableDeclarator[],
  atStart: boolean
): IterableIterator<RuleFix> {
  const declaration =
    node.kind +
    ' ' +
    declarators.map((m) => context.getSourceCode().getText(m)).join(',') +
    ';';

  for (const target of targets) {
    yield* insertToCallLastFunctionArgument(
      context,
      fixer,
      target,
      declaration,
      (node) => {
        if (declarators.some((s) => isUsed(s, node))) return 'before';
        if (node.type === AST_NODE_TYPES.VariableDeclaration) return 'after';

        return undefined;
      },
      atStart ? 'before' : 'after'
    );
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
 * @param options Rule options.
 * @param node Node to work on.
 * @param describe Describe node.
 * @param siblingBefore Sibling beforeEach node, if any.
 * @param siblingAfters Sibling afterEach nodes, if any.
 * @param beforeName Name of the initialization function name.
 * @param afterName Name of the unreference function name.
 * @param declarators Captured declarators.
 * @yields Fixes for the problem.
 */
function* fixMoveToBeforeAfter(
  context: Context,
  fixer: RuleFixer,
  options: DeclarationInDescribeRuleOptions,
  node: TSESTree.VariableDeclaration,
  describe: TSESTree.CallExpression,
  siblingBefore: TSESTree.CallExpression | undefined,
  siblingAfters: TSESTree.CallExpression[],
  beforeName: string,
  afterName: string,
  declarators: TSESTree.VariableDeclarator[]
): IterableIterator<RuleFix> {
  const alreadyAssigned: Set<TSESTree.Statement> = new Set();

  const initialization = node.declarations
    .filter((f) => f.init && 'name' in f.id && declarators.indexOf(f) !== -1)
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    .map((m) => {
      const additionalNodes = siblingNodes(
        node,
        (n) =>
          !alreadyAssigned.has(n) &&
          n.type === AST_NODE_TYPES.ExpressionStatement &&
          ((n.expression.type === AST_NODE_TYPES.AssignmentExpression &&
            isUsed(m, n.expression.left)) ||
            (n.expression.type === AST_NODE_TYPES.CallExpression &&
              isUsed(m, n.expression.callee))) &&
          !!alreadyAssigned.add(n)
      );

      let content =
        m.id['name'] + ' = ' + context.getSourceCode().getText(m.init!) + ';';
      if (additionalNodes.length > 0) {
        content +=
          '\n' +
          additionalNodes
            .map((n) => context.getSourceCode().getText(n))
            .join('\n');
      }

      return <[TSESTree.VariableDeclarator, string]>[
        m,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        content,
      ];
    });

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
    for (const init of initialization) {
      yield* insertToCallLastFunctionArgument(
        context,
        fixer,
        siblingBefore,
        init[1],
        (node) => {
          if (isUsed(init[0], node)) return 'before';

          if (
            node.type === AST_NODE_TYPES.ExpressionStatement &&
            node.expression.type === AST_NODE_TYPES.AssignmentExpression &&
            isNameIdentifier(node.expression.left)
          ) {
            const dec = findDeclarator(
              node.expression.left.name,
              siblingBefore
            );
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            if (dec && isUsed(dec, init[0].init!)) {
              return 'after';
            }
          }

          return undefined;
        },
        'before'
      );
    }
  } else {
    yield* insertToCallLastFunctionArgument(
      context,
      fixer,
      describe,
      beforeName +
        '(() => { ' +
        initialization.map((m) => m[1]).join('\n') +
        ' });',
      (node) => {
        if (node.type === AST_NODE_TYPES.VariableDeclaration) return 'after';
        if (
          node.type === AST_NODE_TYPES.ExpressionStatement &&
          (isCallExpressionWithName(
            node.expression,
            options.initializationEachFunctionNames
          ) ||
            isCallExpressionWithName(
              node.expression,
              options.initializationAllFunctionNames
            ))
        )
          return 'after';

        return undefined;
      },
      'before'
    );
  }

  if (cleanup.length) {
    if (siblingAfters.length) {
      yield* insertToCallLastFunctionArgument(
        context,
        fixer,
        siblingAfters[siblingAfters.length - 1],
        cleanup,
        undefined,
        'after'
      );
    } else {
      yield* insertToCallLastFunctionArgument(
        context,
        fixer,
        describe,
        afterName + '(() => { ' + cleanup + ' });',
        (node) => {
          if (node.type === AST_NODE_TYPES.VariableDeclaration) return 'after';
          if (
            node.type === AST_NODE_TYPES.ExpressionStatement &&
            (isCallExpressionWithName(
              node.expression,
              options.initializationEachFunctionNames
            ) ||
              isCallExpressionWithName(
                node.expression,
                options.initializationAllFunctionNames
              ) ||
              isCallExpressionWithName(
                node.expression,
                options.unreferenceEachFunctionNames
              ) ||
              isCallExpressionWithName(
                node.expression,
                options.unreferenceAllFunctionNames
              ))
          )
            return 'after';

          return undefined;
        },
        'after'
      );
    }
  }

  yield fixer.replaceText(
    node,
    (node.kind === 'const' ? 'let' : node.kind) +
      ' ' +
      node.declarations
        .map((m) => getVariableBindingNameWithUndefined(context, m))
        .join(', ') +
      ';'
  );

  for (const already of alreadyAssigned) {
    yield fixer.remove(already);
  }
}

/**
 * Returns a variable declarator with undefined type if needed.
 * @param context Context to use.
 * @param declarator The original declarator.
 * @returns The declarator source.
 */
function getVariableBindingNameWithUndefined(
  context: Context,
  declarator: TSESTree.VariableDeclarator
): string {
  if (
    !declarator.id.typeAnnotation ||
    declarator.id.typeAnnotation.typeAnnotation.type ===
      AST_NODE_TYPES.TSUndefinedKeyword ||
    (declarator.id.typeAnnotation.typeAnnotation.type ===
      AST_NODE_TYPES.TSUnionType &&
      declarator.id.typeAnnotation.typeAnnotation.types.some(
        (s) => s.type === AST_NODE_TYPES.TSUndefinedKeyword
      ))
  )
    return context.getSourceCode().getText(declarator.id);

  return context.getSourceCode().getText(declarator.id) + ' | undefined';
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

/**
 * Create a fix for moving an init to the describe that uses it.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param declaration The variable declaration.
 * @param declarators The variable declarators.
 * @yields Fixes for the problem.
 */
function* fixInitMoveToDescribe(
  context: Context,
  fixer: RuleFixer,
  declaration: TSESTree.VariableDeclaration,
  declarators: DeclaratorMeta[]
): IterableIterator<RuleFix> {
  for (const declarator of declarators) {
    yield* fixMoveTo(
      context,
      fixer,
      declaration,
      declarator.captures,
      [declarator.declarator],
      true
    );
  }
}

/**
 * Create a fix for moving an init to the describe that uses it.
 * @param context Rule context.
 * @param fixer Fixer for the problem.
 * @param declaration The variable declaration.
 * @param declarators The variable declarators.
 * @yields Fixes for the problem.
 */
function* fixInitMoveToFunction(
  context: Context,
  fixer: RuleFixer,
  declaration: TSESTree.VariableDeclaration,
  declarators: DeclaratorMeta[]
): IterableIterator<RuleFix> {
  const creates = declarators
    .map((m) => {
      const name = m.declarator.id['name'] as string;
      return `function create${name[0].toUpperCase() + name.substring(1)}()${
        m.declarator.id.typeAnnotation
          ? context.getSourceCode().getText(m.declarator.id.typeAnnotation)
          : ''
      } { return ${
        m.declarator.init
          ? context.getSourceCode().getText(m.declarator.init)
          : 'undefined'
      }; }`;
    })
    .join('\n');

  if (declaration.declarations.length === declarators.length) {
    yield fixer.replaceText(declaration, creates);
  } else {
    yield fixer.insertTextBefore(declaration, creates);
    yield* declarators.map((m) => fixer.remove(m.declarator));
  }

  for (const meta of declarators) {
    const name = meta.declarator.id['name'] as string;
    const init = `const ${name} = create${
      name[0].toUpperCase() + name.substring(1)
    }();`;

    for (const capture of meta.captures) {
      yield* insertToCallLastFunctionArgument(
        context,
        fixer,
        capture,
        init,
        undefined,
        'before'
      );
    }
  }
}

// TODO: add options to skip eg. const
export const declarationInDescribeRule: RuleModule<
  MessageIds,
  Partial<DeclarationInDescribeRuleOptions>[]
> = {
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    messages: {
      declarationInDescribe: 'There are declarations in a describe.',
      declarationInDescribeIt: 'Move declarations to the "it".',
      declarationInDescribeManyIt: 'Move declarations to each "it".',
      declarationInDescribeBeforeAfterX:
        'Initialize values in "{{before}}" and unreference in "{{after}}".',
      declarationInDescribeBeforeAfterXConst:
        'Change declaration to let and initialize values in "{{before}}" and unreference in "{{after}}".',
      declarationInDescribeForInit:
        'There are declarations in a describe which is used for initialization, but captured.',
      declarationInDescribeForInitMove:
        'Move declarations to the describe that captures it.',
      declarationInDescribeForInitUseFunction:
        'Move declarations to a function and use that.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          functionNames: { type: 'array', items: { type: 'string' } },
          initializationEachFunctionNames: {
            type: 'array',
            items: { type: 'string' },
          },
          initializationAllFunctionNames: {
            type: 'array',
            items: { type: 'string' },
          },
          unreferenceEachFunctionNames: {
            type: 'array',
            items: { type: 'string' },
          },
          unreferenceAllFunctionNames: {
            type: 'array',
            items: { type: 'string' },
          },
          testFunctionNames: { type: 'array', items: { type: 'string' } },
          preferAll: { type: 'boolean' },
          forInit: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    ],
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

      const options = Object.assign(
        {},
        { forInit: true },
        defaultInDescribeRuleOptions,
        context.options[0]
      );

      const call = closestCallExpressionIfName(node, options.functionNames);

      if (!call) return;

      const declarators = node.declarations.map((declarator) => {
        const captures = [...findCaptures(declarator)];
        const callCaptures = <TSESTree.CallExpression[]>(
          captures.map((m) => closestCallExpression(m)).filter((e) => !!e)
        );

        return {
          declarator,
          captures,
          callCaptures: callCaptures,
          describeCaptures: callCaptures.filter((e) =>
            isNameIdentifier(e.callee, options.functionNames)
          ),
        };
      });

      // No captured declarators
      if (declarators.every((e) => e.captures.length === 0)) return;

      // Declarators we need before/after fixes
      let fixDeclarators = declarators
        .filter((f) => f.captures.length !== f.describeCaptures.length)
        .map((m) => m.declarator);

      const [beforeFix, describeFix] = <[DeclaratorMeta[], DeclaratorMeta[]]>(
        declarators.reduce(
          ([fix, desc], item) =>
            item.captures.length !== item.describeCaptures.length
              ? [[...fix, item], desc]
              : [fix, [...desc, item]],
          [[], []]
        )
      );

      const siblingCalls = siblingNodesOfType(
        node,
        AST_NODE_TYPES.ExpressionStatement
      ).map((m) => m.expression);
      const siblingBeforeEach = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) =>
          isCallExpressionWithName(f, options.initializationEachFunctionNames)
        )
      );
      const siblingAfterEach = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) =>
          isCallExpressionWithName(f, options.unreferenceEachFunctionNames)
        )
      );
      const siblingBeforeAll = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) =>
          isCallExpressionWithName(f, options.initializationAllFunctionNames)
        )
      );
      const siblingAfterAll = <TSESTree.CallExpression[]>(
        siblingCalls.filter((f) =>
          isCallExpressionWithName(f, options.unreferenceAllFunctionNames)
        )
      );

      if (beforeFix.length > 0) {
        const siblingIts = <TSESTree.CallExpression[]>(
          siblingCalls.filter((f) =>
            isCallExpressionWithName(f, options.testFunctionNames)
          )
        );

        const suggestions: ReportSuggestionArray<MessageIds> = [];

        fixDeclarators = fixDeclarators.filter(
          (f) => !hasCleanup(siblingAfterAll, f.id['name'])
        );

        if (fixDeclarators.length === 0) return;

        if (siblingIts.length === 1) {
          suggestions.push({
            messageId: 'declarationInDescribeIt',
            fix: (fixer): IterableIterator<RuleFix> =>
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

        // Try determine the after fn name based on the current before name
        const captureBeforeEachName =
          declarators
            .flatMap((f) => f.callCaptures)
            .find((call) =>
              isNameIdentifier(
                call.callee,
                options.initializationEachFunctionNames
              )
            )?.callee['name'] ?? siblingBeforeEach[0]?.callee['name'];
        const afterEachName =
          options.unreferenceEachFunctionNames[
            options.initializationEachFunctionNames.indexOf(
              captureBeforeEachName
            )
          ];

        addXSuggestion(
          node,
          suggestions,
          context,
          options,
          call,
          siblingBeforeEach,
          siblingAfterEach,
          captureBeforeEachName ?? options.initializationEachFunctionNames[0],
          afterEachName ?? options.unreferenceEachFunctionNames[0],
          fixDeclarators
        );

        // Try determine the after fn name based on the current before name
        const captureBeforeAllName =
          declarators
            .flatMap((f) => f.callCaptures)
            .find((call) =>
              isNameIdentifier(
                call.callee,
                options.initializationAllFunctionNames
              )
            )?.callee['name'] ?? siblingBeforeAll[0]?.callee['name'];
        const afterAllName =
          options.unreferenceAllFunctionNames[
            options.initializationAllFunctionNames.indexOf(captureBeforeAllName)
          ];

        addXSuggestion(
          node,
          suggestions,
          context,
          options,
          call,
          siblingBeforeAll,
          siblingAfterAll,
          captureBeforeAllName ?? options.initializationAllFunctionNames[0],
          afterAllName ?? options.unreferenceAllFunctionNames[0],
          fixDeclarators
        );

        const isCapturedInAll =
          options.preferAll ||
          declarators.some((declarator) =>
            declarator.callCaptures.some((call) =>
              isNameIdentifier(
                call.callee,
                options.initializationAllFunctionNames
              )
            )
          );

        const report: ReportDescriptor<MessageIds> = {
          node: node,
          messageId: 'declarationInDescribe',
          suggest: suggestions,
          // if we have all init, probably we need to move declarations to that
          fix: suggestions[suggestions.length - (isCapturedInAll ? 1 : 2)]?.fix,
        };

        return context.report(report);
      } else if (describeFix.length > 0) {
        const suggestions: ReportSuggestionArray<MessageIds> = [
          {
            messageId: 'declarationInDescribeForInitMove',
            fix: (fixer) =>
              fixInitMoveToDescribe(context, fixer, node, describeFix),
          },
          {
            messageId: 'declarationInDescribeForInitUseFunction',
            fix: (fixer) =>
              fixInitMoveToFunction(context, fixer, node, describeFix),
          },
        ];

        fixDeclarators = declarators.map((m) => m.declarator);
        fixDeclarators = fixDeclarators.filter(
          (f) => !hasCleanup(siblingAfterAll, f.id['name'])
        );

        // Try determine the after fn name based on the current before name
        const captureBeforeEachName =
          declarators
            .flatMap((f) => f.callCaptures)
            .find((call) =>
              isNameIdentifier(
                call.callee,
                options.initializationEachFunctionNames
              )
            )?.callee['name'] ?? siblingBeforeEach[0]?.callee['name'];
        const afterEachName =
          options.unreferenceEachFunctionNames[
            options.initializationEachFunctionNames.indexOf(
              captureBeforeEachName
            )
          ];

        addXSuggestion(
          node,
          suggestions,
          context,
          options,
          call,
          siblingBeforeEach,
          siblingAfterEach,
          captureBeforeEachName ?? options.initializationEachFunctionNames[0],
          afterEachName ?? options.unreferenceEachFunctionNames[0],
          fixDeclarators
        );

        // Try determine the after fn name based on the current before name
        const captureBeforeAllName =
          declarators
            .flatMap((f) => f.callCaptures)
            .find((call) =>
              isNameIdentifier(
                call.callee,
                options.initializationAllFunctionNames
              )
            )?.callee['name'] ?? siblingBeforeAll[0]?.callee['name'];
        const afterAllName =
          options.unreferenceAllFunctionNames[
            options.initializationAllFunctionNames.indexOf(captureBeforeAllName)
          ];

        addXSuggestion(
          node,
          suggestions,
          context,
          options,
          call,
          siblingBeforeAll,
          siblingAfterAll,
          captureBeforeAllName ?? options.initializationAllFunctionNames[0],
          afterAllName ?? options.unreferenceAllFunctionNames[0],
          fixDeclarators
        );

        return context.report({
          node: node,
          messageId: 'declarationInDescribeForInit',
          fix: options.preferAll
            ? suggestions[suggestions.length - 1].fix
            : options.forInit
            ? function* (fixer): IterableIterator<RuleFix> {
                for (const meta of describeFix) {
                  if (meta.captures.length > 1) {
                    yield* fixInitMoveToFunction(context, fixer, node, [meta]);
                  } else {
                    yield* fixInitMoveToDescribe(context, fixer, node, [meta]);
                  }
                }
              }
            : undefined,
          suggest: suggestions,
        });
      }
    },
  }),
};

/**
 * Add a suggestion for eachX fix.
 * @param node Variable declaration.
 * @param suggestions Suggestions to push to.
 * @param context Rule context to use.
 * @param options Options for the rule.
 * @param describe The describe where the variable is declared.
 * @param siblingBefore Sibling beforeX calls.
 * @param siblingAfter Sibling afterX calls.
 * @param beforeName Name of the initialization function name.
 * @param afterName Name of the unreference function name.
 * @param declarators Captured declarators.
 */
function addXSuggestion(
  node: TSESTree.VariableDeclaration,
  suggestions: ReportSuggestionArray<MessageIds>,
  context: Context,
  options: DeclarationInDescribeRuleOptions,
  // eslint-disable-next-line jsdoc/require-jsdoc
  describe: TSESTree.CallExpression & { callee: { name: string } },
  siblingBefore: TSESTree.CallExpression[],
  siblingAfter: TSESTree.CallExpression[],
  beforeName: string,
  afterName: string,
  declarators: TSESTree.VariableDeclarator[]
): void {
  if (node.kind !== 'const') {
    suggestions.push({
      messageId: 'declarationInDescribeBeforeAfterX',
      data: { before: beforeName, after: afterName },
      fix: (fixer) =>
        fixMoveToBeforeAfter(
          context,
          fixer,
          options,
          node,
          describe,
          siblingBefore[0],
          siblingAfter,
          beforeName,
          afterName,
          declarators
        ),
    });
  } else {
    suggestions.push({
      messageId: 'declarationInDescribeBeforeAfterXConst',
      data: { before: beforeName, after: afterName },
      fix: (fixer) =>
        fixMoveToBeforeAfter(
          context,
          fixer,
          options,
          node,
          describe,
          siblingBefore[0],
          siblingAfter,
          beforeName,
          afterName,
          declarators
        ),
    });
  }
}
