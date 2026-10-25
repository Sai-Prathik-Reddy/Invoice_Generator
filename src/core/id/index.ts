import { ulid } from 'ulid';

export type IdPrefix =
  | 'cmp'
  | 'cli'
  | 'itm'
  | 'tpl'
  | 'tpv'
  | 'doc'
  | 'ast'
  | 'blk'
  | 'row'
  | 'col'
  | 'pay';

export type ID<P extends IdPrefix = IdPrefix> = `${P}_${string}`;

export function newId<P extends IdPrefix>(prefix: P): ID<P> {
  return `${prefix}_${ulid()}` as ID<P>;
}
