// Check if we are not cleaning up the data in afterEach

import { createRule } from './no-cleanup-before-base';

export const noCleanupBeforeEachRule = createRule('Each');
