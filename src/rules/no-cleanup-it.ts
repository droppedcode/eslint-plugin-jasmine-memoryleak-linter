// Check if we are not cleaning up the data in afterEach

import { createRule } from './no-cleanup-base';

export const noCleanupItRule = createRule('it', 'afterEach');
