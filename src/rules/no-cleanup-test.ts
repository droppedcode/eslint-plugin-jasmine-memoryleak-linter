// Check if we are not cleaning up the data in afterEach

import { createRule } from './no-cleanup-base';
import { defaultNoCleanupTestOptions } from './no-cleanup-options';

export const noCleanupTestRule = createRule(defaultNoCleanupTestOptions, true);
