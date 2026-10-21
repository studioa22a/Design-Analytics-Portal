/**
 * Guards against drift between src/domain/stateMachine.ts and the
 * application_transitions rows in the migration. If this fails, the
 * transition table was changed in one place and not the other.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { transitionsAsSqlRows } from '@/domain/stateMachine';

const MIGRATIONS_DIR = join(__dirname, '..', '..', 'supabase', 'migrations');

function migrationContaining(marker: string): string {
  const files = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort();
  const hits = files.filter((f) => readFileSync(join(MIGRATIONS_DIR, f), 'utf8').includes(marker));
  if (hits.length !== 1) {
    throw new Error(`expected exactly one migration containing "${marker}", found ${hits.length}`);
  }
  return readFileSync(join(MIGRATIONS_DIR, hits[0]), 'utf8');
}

describe('transition table is mirrored in SQL', () => {
  it('every TypeScript transition row appears verbatim in the insert', () => {
    const sql = migrationContaining('insert into application_transitions');
    const normalise = (s: string) => s.replace(/\s+/g, ' ').trim();
    const sqlNorm = normalise(sql);
    for (const row of transitionsAsSqlRows()) {
      expect(sqlNorm, `missing SQL row: ${row}`).toContain(normalise(row));
    }
  });

  it('the SQL insert has the same number of rows as TypeScript', () => {
    const sql = migrationContaining('insert into application_transitions');
    const block = sql.split('insert into application_transitions')[1].split(';')[0];
    const sqlRowCount = (block.match(/\(\s*'[a-z_]+'\s*,\s*'[a-z_]+'\s*,\s*ARRAY\[/g) ?? []).length;
    expect(sqlRowCount).toBe(transitionsAsSqlRows().length);
  });
});
