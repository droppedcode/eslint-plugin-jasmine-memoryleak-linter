import 'jasmine';

describe('test-fix-good-order', () => {
    const b = {
        fn: () => { },
        pa: a,
        pb: run({ c })
    };
    const c = { a };
    const a = {};

    it('it', () => {
        b.fn();
    });
});