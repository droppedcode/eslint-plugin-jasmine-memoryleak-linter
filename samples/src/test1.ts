import 'jasmine';

function code(comment?: string): void {}

describe('test-d-1', () => {
  let a = 2;

  it('test-i-1', () => {});
});

describe('test-d-2', () => {
  let a = 2;
  let b = 2;

  it('test-i-1', () => {});
});

describe('test-d-3', () => {
  let a = 2;
  let b = 2;

  it('test-i-1', () => {});
  it('test-i-2', () => {
    code('1');
    code('2');
  });
});

describe('test-d-3', () => {
  let a = 2;
  let b = 2;

  it('test-i-1', () => {});
  it('test-i-2', () => {
    code('1');
    code('2');
  });
});

describe('test-d-4', () => {
  let a;

  beforeEach(() => {
    a = 2;
  });
});

describe('test-d-5', () => {
  let a;

  beforeEach(() => {
    a = 2;
  });
  afterEach(() => {});
  afterEach(() => {});
});

describe('test-d-6', () => {
  let a;

  beforeAll(() => {
    a = 2;
  });
});

describe('test-d-7', () => {
  let a;

  describe('test-d-7-1', () => {
    beforeAll(() => {
      a = 2;
    });
  });
});

describe('test-d-8', () => {
  let a = 2;
});

describe('test-d-9', () => {
  let a;
  a = 2;
});
