// Check if we are not cleaning up the data in afterAll

import { RuleModule } from '@typescript-eslint/utils/ts-eslint';

import { CleanupRuleOptions, MessageIds, createRule } from './no-cleanup-base';
import { defaultNoCleanupAllOptions } from './no-cleanup-options';

export const noCleanupBeforeAllRule: RuleModule<
  MessageIds,
  Partial<CleanupRuleOptions>[]
> = createRule(defaultNoCleanupAllOptions, false);
