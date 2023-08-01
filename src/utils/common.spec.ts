import { parse } from '@typescript-eslint/parser';
import { AST_NODE_TYPES, TSESTree } from '@typescript-eslint/utils';

import { isUsed, findUses, applyParent, traversePartsDeep } from './common';
import { first } from './iterable';
import { isNameIdentifier } from './node-utils';

describe('findUses', () => {
    test('complex', () => {
        const program = parse(`
describe('test', () => {    
  const a = new A();
  const b = {
    a,
    p0: 0,
    p1: ''
  };
  const c = Some.func({ pb: new B().m({ pa: [mod({ b })] }) }).change();
  A.fn({ p: [f({ c })] });
  beforeEach(() => T.f({ p: [i({ a })] }));
});
`, {
            loc: true,
            range: true,
            raw: true,
            tokens: true,
            comment: true,
            eslintVisitorKeys: true,
            eslintScopeManager: true
        });

        applyParent(program);
        const a = first(traversePartsDeep(program), node => node.type === AST_NODE_TYPES.VariableDeclarator && isNameIdentifier(node.id) && node.id.name === 'a') as TSESTree.VariableDeclarator;
        const b = first(traversePartsDeep(program), node => node.type === AST_NODE_TYPES.VariableDeclarator && isNameIdentifier(node.id) && node.id.name === 'b') as TSESTree.VariableDeclarator;
        const c = first(traversePartsDeep(program), node => node.type === AST_NODE_TYPES.VariableDeclarator && isNameIdentifier(node.id) && node.id.name === 'c') as TSESTree.VariableDeclarator;

        const aUses = [...findUses(a)];

        expect(aUses.length).toBe(3);

        const bUses = [...findUses(b)];

        expect(bUses.length).toBe(2);

        const cUses = [...findUses(c)];

        expect(cUses.length).toBe(2);
    });
});

describe('isUsed', () => {
    test('complex', () => {
        const program = parse(`
const a = {};
beforeEach(() => {
    T.f({ p: [i({ a })] }).f();
});
`, {
            loc: true,
            range: true,
            raw: true,
            tokens: true,
            comment: true,
            eslintVisitorKeys: true,
            eslintScopeManager: true
        });

        applyParent(program);
        const a = first(traversePartsDeep(program), node => node.type === AST_NODE_TYPES.VariableDeclarator && isNameIdentifier(node.id) && node.id.name === 'a') as TSESTree.VariableDeclarator;

        expect(isUsed(a, program.body[1])).toBe(true);
    });
});