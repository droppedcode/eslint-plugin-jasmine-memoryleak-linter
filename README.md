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

## Rules

All rules has a built in fix, but usually gives multiple suggestions to how to solve the issue.

### describe-declarations

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

(This is the default fix if there is one and only one "it" block.)

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

### assignment-in-describe

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

### no-cleanup-before-each-rule

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

### no-cleanup-before-all-rule

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

### no-cleanup-it-rule

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

## How to build

- download the source or clone it
- npm i
- npm run build (or build:samples to check out in the samples)

## How to debug

- vscode F5 (or debug) (on the selected jest test file) or run `npm test`

## Samples

The samples are a configured mini project that uses only these rules, so you can see it in action.
To try it out open the samples folder, do not run it from the main folder, because ESLint will have false results.
