import { createUniqueId } from './idUtils';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const first = createUniqueId('ai');
const second = createUniqueId('ai');
assert(first.startsWith('ai_'), 'generated ID keeps its feature prefix');
assert(first !== second, 'generated IDs are distinct');
