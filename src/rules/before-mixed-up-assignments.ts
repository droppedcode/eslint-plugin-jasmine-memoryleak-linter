import { AST_NODE_TYPES, TSESLint } from '@typescript-eslint/utils';

import { defaultInDescribeRuleOptions } from './in-describe-options';
import { getCallFunctionBody, isStatementsBasedOnAssignmentAndUsageMixedUp, reorderStatementsBasedOnAssignmentAndUsage } from '../utils/common';
import {
  isNameIdentifier,
} from '../utils/node-utils';

type MessageIds =
  | 'beforeMixedUpAssignement'
  | 'beforeMixedUpAssignementReorder';

export type BeforeMixedUpAssignmentRuleOptions = {
  /** Function names the rule is triggered. */
  functionNames: string[]
};

export const defaultBeforeMixedUpAssignmentOptions: BeforeMixedUpAssignmentRuleOptions = {
  functionNames: ['beforeEach', 'beforeAll', 'before']
};

export const defaultJasmineBeforeMixedUpAssignmentOptions: BeforeMixedUpAssignmentRuleOptions = {
  functionNames: ['beforeEach', 'beforeAll']
};

export const defaultMochaBeforeMixedUpAssignmentOptions: BeforeMixedUpAssignmentRuleOptions = {
  functionNames: ['beforeEach', 'before']
};

const optionsSchema = {
  type: 'object',
  properties: {
    functionNames: { type: 'array', items: { type: 'string' } },
  },
  additionalProperties: false
};

export const beforeMixedUpAssignmentRule: TSESLint.RuleModule<
  MessageIds,
  Partial<BeforeMixedUpAssignmentRuleOptions>[]
> = {
  defaultOptions: [],
  meta: {
    type: 'suggestion',
    messages: {
      beforeMixedUpAssignement: 'Assignements are not in the correct order.',
      beforeMixedUpAssignementReorder: 'Reorder statements so assignment is before usage.',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [optionsSchema],
  },
  create: (context) => ({
    CallExpression: (node): void => {
      const options = Object.assign(
        {},
        defaultInDescribeRuleOptions,
        context.options[0]
      );

      if (!isNameIdentifier(node.callee, options.functionNames)) return;

      const body = getCallFunctionBody(node);

      if (!body || body.type !== AST_NODE_TYPES.BlockStatement) return;

      if (!isStatementsBasedOnAssignmentAndUsageMixedUp(body)) return;

      return context.report({
        messageId: 'beforeMixedUpAssignement',
        node: node,
        fix: (fixer) => reorderStatementsBasedOnAssignmentAndUsage(context, fixer, body),
        suggest: [
          {
            messageId: 'beforeMixedUpAssignementReorder',
            fix: (fixer) => reorderStatementsBasedOnAssignmentAndUsage(context, fixer, body),
          }
        ]
      });
    },
  }),
};
