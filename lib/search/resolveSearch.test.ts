import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveSearch } from './resolveSearch';
import { searchProfilesByName } from '@/lib/profiles/queries';
import { fetchPublishedClasses } from '@/lib/classes/queries';
import type { Teacher, DanceClass } from '@/lib/types';

vi.mock('@/lib/profiles/queries', () => ({
  searchProfilesByName: vi.fn(),
}));
vi.mock('@/lib/classes/queries', () => ({
  fetchPublishedClasses: vi.fn(),
}));

const mockedSearch = vi.mocked(searchProfilesByName);
const mockedClasses = vi.mocked(fetchPublishedClasses);

function profile(overrides: Partial<Teacher>): Teacher {
  return {
    id: 'id', slug: 'slug', name: 'Name', type: 'profesor', photo: '', photoPosition: '50% 50%',
    photoZoom: 1, bio: '', experience: 0, styles: [], whatsapp: '', showSpots: true, email: '',
    ...overrides,
  };
}

const danceStyles = [{ name: 'Salsa' }, { name: 'Bachata' }, { name: 'Flamenco' }, { name: 'Hip Hop' }];

beforeEach(() => {
  mockedSearch.mockReset();
  mockedClasses.mockReset();
  // Most tests don't care about class counts — default to "has results" so
  // they can assert on { type, styleName } without also stubbing this.
  mockedClasses.mockResolvedValue([{} as DanceClass]);
});

describe('resolveSearch — direct name/style matches', () => {
  it('resolves to a style when the query matches a real dance style name exactly', async () => {
    const result = await resolveSearch('salsa', danceStyles);
    expect(result).toEqual({ type: 'style', styleName: 'Salsa', hasResults: true });
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('is accent- and case-insensitive for style matches', async () => {
    const result = await resolveSearch('  FLAMÉNCO  ', danceStyles);
    expect(result).toEqual({ type: 'style', styleName: 'Flamenco', hasResults: true });
  });

  it('flags hasResults: false when the style currently has zero published classes', async () => {
    mockedClasses.mockResolvedValue([]);
    const result = await resolveSearch('flamenco', danceStyles);
    expect(result).toEqual({ type: 'style', styleName: 'Flamenco', hasResults: false });
  });

  it('a style always wins over a profile with the same name (does not even query profiles)', async () => {
    mockedSearch.mockResolvedValue([profile({ name: 'Salsa', slug: 'salsa-profesor' })]);
    const result = await resolveSearch('salsa', danceStyles);
    expect(result).toEqual({ type: 'style', styleName: 'Salsa', hasResults: true });
    expect(mockedSearch).not.toHaveBeenCalled();
  });

  it('resolves to a profile when exactly one profesor/academia matches the name exactly', async () => {
    mockedSearch.mockResolvedValue([profile({ name: 'Zeus Villanueva', slug: 'zeus-villanueva', type: 'profesor' })]);
    const result = await resolveSearch('Zeus Villanueva', danceStyles);
    expect(result).toEqual({ type: 'profile', role: 'profesor', slug: 'zeus-villanueva', name: 'Zeus Villanueva' });
  });

  it('is accent- and case-insensitive for profile matches', async () => {
    mockedSearch.mockResolvedValue([profile({ name: 'María Alejandra Villegas', slug: 'maria-alejandra-villegas' })]);
    const result = await resolveSearch('maria alejandra villegas', danceStyles);
    expect(result).toEqual({ type: 'profile', role: 'profesor', slug: 'maria-alejandra-villegas', name: 'María Alejandra Villegas' });
  });

  it('is ambiguous when two profiles share the exact same normalized name', async () => {
    mockedSearch.mockResolvedValue([
      profile({ id: 't1', name: 'Zeus', slug: 'zeus-1' }),
      profile({ id: 't2', name: 'Zeus', slug: 'zeus-2', type: 'academia' }),
    ]);
    const result = await resolveSearch('Zeus', danceStyles);
    expect(result).toEqual({ type: 'ambiguous' });
  });

  it('is ambiguous when only a partial/substring match exists (no exact name)', async () => {
    mockedSearch.mockResolvedValue([profile({ name: 'Zeus Villanueva', slug: 'zeus-villanueva' })]);
    const result = await resolveSearch('Zeus', danceStyles);
    expect(result).toEqual({ type: 'ambiguous' });
  });

  it('is ambiguous when nothing matches at all', async () => {
    mockedSearch.mockResolvedValue([]);
    const result = await resolveSearch('asdkjfhaskjdfh', danceStyles);
    expect(result).toEqual({ type: 'ambiguous' });
  });

  it('is ambiguous for a blank query, without calling searchProfilesByName', async () => {
    const result = await resolveSearch('   ', danceStyles);
    expect(result).toEqual({ type: 'ambiguous' });
    expect(mockedSearch).not.toHaveBeenCalled();
  });
});

describe('resolveSearch — natural-language phrasing (filler-word cleanup)', () => {
  it('resolves a style wrapped in a natural sentence ("clases de salsa")', async () => {
    // The raw phrase isn't a profile name either — the raw-level profile
    // check still runs (and correctly finds nothing) before cleanup kicks in.
    mockedSearch.mockResolvedValue([]);
    const result = await resolveSearch('clases de salsa', danceStyles);
    expect(result).toEqual({ type: 'style', styleName: 'Salsa', hasResults: true });
  });

  it('resolves a multi-word style wrapped in a sentence ("quiero clases de hip hop")', async () => {
    mockedSearch.mockResolvedValue([]);
    const result = await resolveSearch('quiero clases de hip hop', danceStyles);
    expect(result).toEqual({ type: 'style', styleName: 'Hip Hop', hasResults: true });
  });

  it('resolves a profile prefixed with a role word ("profesor Zeus Villanueva")', async () => {
    mockedSearch.mockResolvedValue([profile({ name: 'Zeus Villanueva', slug: 'zeus-villanueva' })]);
    const result = await resolveSearch('profesor Zeus Villanueva', danceStyles);
    expect(result).toEqual({ type: 'profile', role: 'profesor', slug: 'zeus-villanueva', name: 'Zeus Villanueva' });
    // The cleaned phrase is what gets searched, not the raw one — extractKeywords
    // normalizes casing/accents, so it comes out lowercase (ILIKE is case-insensitive
    // regardless, so this doesn't change what the real DB query matches).
    expect(mockedSearch).toHaveBeenCalledWith('zeus villanueva');
  });

  it('does not attempt cleanup when the raw query already resolved', async () => {
    const result = await resolveSearch('bachata', danceStyles);
    expect(result).toEqual({ type: 'style', styleName: 'Bachata', hasResults: true });
    expect(mockedClasses).toHaveBeenCalledTimes(1);
  });

  it('stays ambiguous when the phrase is entirely filler words', async () => {
    mockedSearch.mockResolvedValue([]);
    const result = await resolveSearch('quiero clases de baile', danceStyles);
    expect(result).toEqual({ type: 'ambiguous' });
  });

  it('stays ambiguous when cleanup still yields no confident match', async () => {
    mockedSearch.mockResolvedValue([]);
    const result = await resolveSearch('academia de salsa en miraflores', danceStyles);
    expect(result).toEqual({ type: 'ambiguous' });
  });
});
