# ESLint plugin to find and fix jasmine memory leaks

This plugin for eslint looks for errors with the usage of jasmine (or mocha but that is just a coincidence based on the same naming conventions).

## Configuration

To configure the ESLint use the usual way:

- add as a plugin
- add the rules you want to use (or use the recommended ruleset)

```json
{
  // ...
  "plugins": [
    // ...
    "@droppedcode/eslint-plugin-jasmine-memoryleak-linter"
  ],
  "rules": {
    // ...
    "@droppedcode/jasmine-memoryleak-linter/describe-declarations": "error",
    "@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-each-rule": "error",
    "@droppedcode/jasmine-memoryleak-linter/no-cleanup-before-all-rule": "error"
  }
}
```

or use predefined configuration

```json
{
  // ...
  "extends": [
    // ...
    "@droppedcode/eslint-plugin-jasmine-memoryleak-linter/recommended"
  ]
}
```

## Rules

All rules has a built in fix, but usually gives multiple suggestions to how to solve the issue.

### declaration-in-describe (There are declarations in a describe.)

Looks for cases where variables are declared and initialized within a "describe" method:

```ts
describe('test-describe-let', () => {
  let a = {}; // This will trigger it

  it('test', () => {
    // use a...
  });
});
```

This can be fixed in multiple ways:

#### Move declarations to the "it" block(s)

Moves the declaration logic to the "it" blocks. This will cause the variable to be local and GC will clean it up.

```ts
describe('test-describe-let', () => {
  it('test', () => {
    let a = {};
    // use a...
  });
});
```

#### Initialize values in "beforeEach" and unreference in "afterEach"

(This is the default fix.)

```ts
describe('test-describe-let', () => {
  let a;

  beforeEach(() => {
    a = {};
  });

  afterEach(() => {
    a = undefined;
  });

  it('test', () => {
    // use a...
  });
});
```

#### Initialize values in "beforeAll" and unreference in "afterAll"

```ts
describe('test-describe-let', () => {
  let a;

  beforeAll(() => {
    a = {};
  });

  afterAll(() => {
    a = undefined;
  });

  it('test', () => {
    // use a...
  });
});
```

#### declaration-in-describe (There are declarations in a describe which is used for initialization, but captured.)

Looks for cases where variables are declared and initialized within a "describe" method, but used only for initialization in an other describe:

```ts
describe('test-describe-let', () => {
  let a = [1, 2]; // This will trigger it

  describe('inner', () => {
    a.forEach(() => {});
  });
});
```

```ts
describe('test-describe-let', () => {
  describe('inner', () => {
    let a = [1, 2];

    a.forEach(() => {});
  });
});
```

#### Options

```ts
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
```

The default options are a merge of jasmine and mocha naming convention, but there are separate configurations if that is preferred.

```ts
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
```

### assignment-in-describe (There are assignments in a describe.)

Looks for cases when assignment to a variable happens in a describe but not within a declaration.

```ts
describe('test-describe-let', () => {
  let a;
  a = {}; // This will trigger it

  it('test', () => {
    // use a...
  });
});
```

#### Initialize values in "beforeEach" and unreference in "afterEach"

(This is the default fix.)

```ts
describe('test-describe-let', () => {
  let a;

  beforeEach(() => {
    a = {};
  });

  afterEach(() => {
    a = undefined;
  });

  it('test', () => {
    // use a...
  });
});
```

#### Initialize values in "beforeAll" and unreference in "afterAll"

```ts
describe('test-describe-let', () => {
  let a;

  beforeAll(() => {
    a = {};
  });

  afterAll(() => {
    a = undefined;
  });

  it('test', () => {
    // use a...
  });
});
```

#### Options

Same as declaration-in-describe rule.

### no-cleanup-before-each-rule (There is assignment in "beforeEach" but no cleanup in "afterEach".)

Looks for cases when we assign a value to a variable in a beforeEach call, but there is no or the last assignment is not a dereference.

If we dereference it in an afterAll, this rule will still trigger (initialization and cleanup should happen in the same level).

```ts
describe('test-describe-let', () => {
  let a;

  beforeEach(() => {
    a = {}; // This will trigger it
  });
});
```

The fix for this will unreference the variable in a afterEach call.

```ts
describe('test-describe-let', () => {
  let a;

  beforeEach(() => {
    a = {};
  });

  afterEach(() => {
    a = undefined;
  });
});
```

#### Options

```ts
export const defaultNoCleanupEachOptions = {
    initializationFunctionNames: ['beforeEach'],
    unreferenceFunctionNames: ['afterEach']
};

There are mocha and jasmine variant of the options.
```

### no-cleanup-before-all-rule (There is assignment in "beforeAll" but no cleanup in "afterAll".)

Looks for cases when we assign a value to a variable in a beforeAll call, but there is no or the last assignment is not a dereference.

If we dereference it in an afterEach, this rule will still trigger (initialization and cleanup should happen in the same level).

```ts
describe('test-describe-let', () => {
  let a;

  beforeAll(() => {
    a = {}; // This will trigger it
  });
});
```

The fix for this will unreference the variable in a afterEach call.

```ts
describe('test-describe-let', () => {
  let a;

  beforeAll(() => {
    a = {};
  });

  afterAll(() => {
    a = undefined;
  });
});
```

#### Options

```ts
export const defaultNoCleanupAllOptions = {
    initializationFunctionNames: ['beforeAll', 'before'],
    unreferenceFunctionNames: ['afterAll', 'after']
};

There are mocha and jasmine variant of the options.
```

### no-cleanup-it-rule (There is assignment in "it" but no cleanup in "it".)

Looks for cases when we assign a value to a variable in a beforeAll call, but there is no or the last assignment is not a dereference.

If we dereference it in an afterEach, this rule will still trigger (initialization and cleanup should happen in the same level).

```ts
describe('test-describe-let', () => {
  let a;

  beforeAll(() => {
    a = {}; // This will trigger it
  });
});
```

The fix for this will unreference the variable in a afterEach call.

```ts
describe('test-describe-let', () => {
  let a;

  beforeAll(() => {
    a = {};
  });

  afterAll(() => {
    a = undefined;
  });
});
```

#### Options

```ts
export const defaultNoCleanupTestOptions = {
    initializationFunctionNames: ['it', 'fit', 'xit', 'test'],
    unreferenceFunctionNames: ['it', 'afterEach', 'afterAll', 'after'],
};

There are mocha and jasmine variant of the options.

```

## How to build

- download the source or clone it
- npm i
- npm run build (or build:samples to check out in the samples)

## How to debug

- vscode F5 (or debug) (on the selected jest test file) or run `npm test`

## Samples

The samples are a configured mini project that uses only these rules, so you can see it in action.
To try it out open the samples folder, do not run it from the main folder, because ESLint will have false results.

## Known issues

- "`var`" declarations in certain situations (when it is not used like a "`let`") can break some logics.
- Mocha method suffixes are not supported e.g. `describe.only`.
- Variable captures outside test methods can be problematic, e.g. using forEach in a describe to go through test data and call it on each members, or using test data in the names of it, describe blocks.
