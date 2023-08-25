// Check if we are not cleaning up the data in afterEach

import { RuleModule } from '@typescript-eslint/utils/ts-eslint';

import { CleanupRuleOptions, MessageIds, createRule } from './no-cleanup-base';
import { defaultNoCleanupTestOptions } from './no-cleanup-options';

export const noCleanupItRule: RuleModule<
  MessageIds,
  Partial<CleanupRuleOptions>[]
> = createRule(defaultNoCleanupTestOptions, true);
