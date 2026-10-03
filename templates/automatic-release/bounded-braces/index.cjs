'use strict';

const upstream = require('./vendor');
const MAX_DEPTH = 64;
const MAX_NODES = 65536;

// Check before the upstream parser or recursive AST walkers can consume input.
function guard(input) {
  if (typeof input === 'string') {
    if (input.length > MAX_NODES) throw new RangeError('Brace pattern exceeds the size limit');
    const levels = { '{': 0, '(': 0, '[': 0 };
    const openings = { '}': '{', ')': '(', ']': '[' };
    for (const character of input) {
      if (Object.hasOwn(levels, character)) levels[character]++;
      if (levels['{'] + levels['('] + levels['['] > MAX_DEPTH) {
        throw new RangeError('Brace pattern exceeds the nesting limit');
      }
      if (Object.hasOwn(openings, character)) {
        const opening = openings[character];
        levels[opening] = Math.max(0, levels[opening] - 1);
      }
    }
    return;
  }
  if (Array.isArray(input)) {
    if (input.length > MAX_NODES) throw new RangeError('Brace pattern list exceeds the size limit');
    for (const pattern of input) {
      if (typeof pattern !== 'string') throw new TypeError('Brace pattern lists require strings');
      guard(pattern);
    }
    return;
  }
  if (!input || typeof input !== 'object') throw new TypeError('Expected a brace pattern or AST');
  const active = new Set();
  const stack = [{ node: input, depth: 0, leave: false }];
  let count = 0;
  while (stack.length) {
    const { node, depth, leave } = stack.pop();
    if (leave) { active.delete(node); continue; }
    if (depth > MAX_DEPTH || ++count > MAX_NODES || active.has(node)) {
      throw new RangeError('Brace AST exceeds the size/nesting limit or contains a cycle');
    }
    if (!node || typeof node !== 'object') throw new TypeError('Invalid brace AST node');
    active.add(node);
    stack.push({ node, depth, leave: true });
    if (node.nodes !== undefined) {
      if (!Array.isArray(node.nodes)) throw new TypeError('Invalid brace AST children');
      for (const child of node.nodes) stack.push({ node: child, depth: depth + 1, leave: false });
    }
  }
}

const braces = (input, options) => { guard(input); return upstream(input, options); };
for (const method of ['parse', 'stringify', 'compile', 'expand', 'create']) {
  braces[method] = (input, options) => { guard(input); return upstream[method](input, options); };
}
module.exports = braces;
