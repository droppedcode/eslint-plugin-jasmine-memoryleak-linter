export const defaultNoCleanupAllOptions = {
    initializationFunctionNames: ['beforeAll', 'before'],
    unreferenceFunctionNames: ['afterAll', 'after']
};

export const defaultNoCleanupEachOptions = {
    initializationFunctionNames: ['beforeEach'],
    unreferenceFunctionNames: ['afterEach']
};

export const defaultNoCleanupTestOptions = {
    initializationFunctionNames: ['it', 'fit', 'xit', 'test'],
    unreferenceFunctionNames: ['it', 'afterEach', 'afterAll', 'after'],
};

export const defaultJasmineNoCleanupAllOptions = {
    initializationFunctionNames: ['beforeAll'],
    unreferenceFunctionNames: ['afterAll']
};

export const defaultJasmineNoCleanupEachOptions = {
    initializationFunctionNames: ['beforeEach'],
    unreferenceFunctionNames: ['afterEach']
};

export const defaultJasmineNoCleanupTestOptions = {
    initializationFunctionNames: ['it', 'fit', 'xit'],
    unreferenceFunctionNames: ['it', 'afterEach', 'afterAll'],
};

export const defaultMochaNoCleanupAllOptions = {
    initializationFunctionNames: ['before'],
    unreferenceFunctionNames: ['after']
};

export const defaultMochaNoCleanupEachOptions = {
    initializationFunctionNames: ['beforeEach'],
    unreferenceFunctionNames: ['afterEach']
};

export const defaultMochaNoCleanupTestOptions = {
    initializationFunctionNames: ['it', 'fit', 'xit', 'test'],
    unreferenceFunctionNames: ['it', 'afterEach', 'after'],
};