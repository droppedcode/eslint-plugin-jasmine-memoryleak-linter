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

describe('test-d-2', () => {
  let a = 2;
  let b = 2;

  it('test-i-1', () => {});
  it('test-i-2', () => {
    code('1');
    code('2');
  });
});
