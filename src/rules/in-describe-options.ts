export type InDescribeRuleOptions = {
  /** Names of the functions that the rule is looking for. */
  functionNames: string[];
  /** Names of the functions that can initialize values before all tests. */
  initializationAllFunctionNames: string[];
  /** Names of the functions that can initialize values before each test. */
  initializationEachFunctionNames: string[];
  /** Names of the functions that can unreference values before all tests. */
  unreferenceAllFunctionNames: string[];
  /** Names of the functions that can unreference values before each test. */
  unreferenceEachFunctionNames: string[];
  /** Names of the functions that can use the values. */
  testFunctionNames: string[];
  /** Prefer using initialization in all function. */
  preferAll: boolean;
};

export const defaultJasmineInDescribeRuleOptions: InDescribeRuleOptions = {
  functionNames: ['describe', 'fdescribe', 'xdescribe'],
  initializationEachFunctionNames: ['beforeEach'],
  initializationAllFunctionNames: ['beforeAll'],
  unreferenceEachFunctionNames: ['afterEach'],
  unreferenceAllFunctionNames: ['afterAll'],
  testFunctionNames: ['it', 'fit', 'xit'],
  preferAll: false,
};

export const defaultMochaInDescribeRuleOptions: InDescribeRuleOptions = {
  functionNames: ['describe', 'fdescribe', 'xdescribe'],
  initializationEachFunctionNames: ['beforeEach'],
  initializationAllFunctionNames: ['before'],
  unreferenceEachFunctionNames: ['afterEach'],
  unreferenceAllFunctionNames: ['after'],
  testFunctionNames: ['it', 'test', 'fit', 'xit'],
  preferAll: false,
};

export const defaultInDescribeRuleOptions = {
  functionNames: ['describe', 'fdescribe', 'xdescribe'],
  initializationEachFunctionNames: ['beforeEach'],
  initializationAllFunctionNames: ['beforeAll', 'before'],
  unreferenceEachFunctionNames: ['afterEach'],
  unreferenceAllFunctionNames: ['afterAll', 'after'],
  testFunctionNames: ['it', 'test', 'fit', 'xit'],
  preferAll: false,
};

export const inDescribeRuleOptionsSchema = {
  type: 'object',
  properties: {
    functionNames: { type: 'array', items: { type: 'string' } },
    initializationEachFunctionNames: {
      type: 'array',
      items: { type: 'string' },
    },
    initializationAllFunctionNames: {
      type: 'array',
      items: { type: 'string' },
    },
    unreferenceEachFunctionNames: { type: 'array', items: { type: 'string' } },
    unreferenceAllFunctionNames: { type: 'array', items: { type: 'string' } },
    testFunctionNames: { type: 'array', items: { type: 'string' } },
    preferAll: { type: 'boolean' },
  },
  additionalProperties: false,
};
