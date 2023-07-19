export type RuleOptions = {
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
};

export const defaultRuleOptions: RuleOptions = {
  functionNames: ['describe', 'fdescribe', 'xdescribe'],
  initializationEachFunctionNames: ['beforeEach'],
  initializationAllFunctionNames: ['beforeAll'],
  unreferenceEachFunctionNames: ['afterEach'],
  unreferenceAllFunctionNames: ['afterAll'],
  testFunctionNames: ['it', 'test', 'fit', 'xit'],
};
