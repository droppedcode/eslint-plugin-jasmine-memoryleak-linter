// Check if we are not cleaning up the data in afterAll

import { createRule } from './no-cleanup-base';

export const noCleanupBeforeAllRule = createRule('beforeAll', 'afterAll', false);
