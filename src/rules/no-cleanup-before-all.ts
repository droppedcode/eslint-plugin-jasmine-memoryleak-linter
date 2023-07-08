// Check if we are not cleaning up the data in afterAll

import { createRule } from './no-cleanup-before-base';

export const noCleanupBeforeAllRule = createRule('All');
