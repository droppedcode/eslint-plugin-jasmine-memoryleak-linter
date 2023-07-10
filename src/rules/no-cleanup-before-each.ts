// Check if we are not cleaning up the data in afterEach

import { createRule } from './no-cleanup-base';

export const noCleanupBeforeEachRule = createRule('beforeEach', 'afterEach', false);
