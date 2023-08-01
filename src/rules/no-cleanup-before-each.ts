// Check if we are not cleaning up the data in afterEach

import { createRule } from './no-cleanup-base';
import { defaultNoCleanupEachOptions } from './no-cleanup-options';

export const noCleanupBeforeEachRule = createRule(
  defaultNoCleanupEachOptions,
  false
);
