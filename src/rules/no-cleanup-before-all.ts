// Check if we are not cleaning up the data in afterAll

import { createRule } from './no-cleanup-base';
import { defaultNoCleanupAllOptions } from './no-cleanup-options';

export const noCleanupBeforeAllRule = createRule(
  defaultNoCleanupAllOptions,
  false
);
