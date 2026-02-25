import type { Decedent, Person, Relation, InheritanceStatus } from '../types/models';

interface ShareState {
  decedent: Decedent;
  persons: Person[];
}

// --- Compact serialization mappings ---

const RELATIONS: Relation[] = [
  '配偶', '子女', '子女之配偶', '父', '母',
  '兄弟姊妹', '祖父', '祖母', '外祖父', '外祖母',
];

const STATUSES: InheritanceStatus[] = [
  '一般繼承', '死亡', '死亡絕嗣', '拋棄繼承', '代位繼承', '再轉繼承',
];

// Compact person: [name, relation, status, birthDate?, deathDate?, marriageDate?, divorceDate?, parentIndex?]
// parentIndex is the index into the persons array (-1 or omitted = no parent)
// Dates stored as "YYYYMMDD" (no dashes)
type CompactPerson = [string, number, number, ...Array<string | number>];

interface CompactState {
  d: [string, string?, number?];  // [name, deathDate?, estateAmount?]
  p: CompactPerson[];
}

function packDate(d: string): string {
  return d.replace(/-/g, '');
}

function unpackDate(d: string): string {
  // "20240515" → "2024-05-15"
  return d.slice(0, 4) + '-' + d.slice(4, 6) + '-' + d.slice(6, 8);
}

function toCompact(state: ShareState): CompactState {
  // Build id→index map for parentId references
  const idToIdx = new Map<string, number>();
  state.persons.forEach((p, i) => idToIdx.set(p.id, i));

  const d: CompactState['d'] = [state.decedent.name];
  if (state.decedent.deathDate) d[1] = packDate(state.decedent.deathDate);
  if (state.decedent.estateAmount) d[2] = state.decedent.estateAmount;

  return {
    d,
    p: state.persons.map(p => {
      const c: CompactPerson = [
        p.name,
        RELATIONS.indexOf(p.relation),
        STATUSES.indexOf(p.status),
      ];
      // Optional fields packed in order: birthDate, deathDate, marriageDate, divorceDate, parentIndex
      // Use "" for missing intermediate fields to preserve positional encoding
      const b = p.birthDate ? packDate(p.birthDate) : '';
      const x = p.deathDate ? packDate(p.deathDate) : '';
      const m = p.marriageDate ? packDate(p.marriageDate) : '';
      const v = p.divorceDate ? packDate(p.divorceDate) : '';
      const pi = p.parentId != null ? idToIdx.get(p.parentId) ?? -1 : -1;

      // Trim trailing empty/default values
      const tail: Array<string | number> = [b, x, m, v, pi];
      while (tail.length > 0 && (tail[tail.length - 1] === '' || tail[tail.length - 1] === -1)) {
        tail.pop();
      }
      c.push(...tail);
      return c;
    }),
  };
}

function fromCompact(compact: CompactState): ShareState {
  // First pass: create persons with temporary sequential IDs
  const ids = compact.p.map(() => `p_${crypto.randomUUID()}`);
  const decedentId = `d_${crypto.randomUUID()}`;

  const dd = compact.d;
  const decedent: Decedent = {
    id: decedentId,
    name: dd[0],
    ...(dd[1] && { deathDate: unpackDate(dd[1]) }),
    ...(dd[2] != null && { estateAmount: dd[2] }),
  };

  const persons: Person[] = compact.p.map((c, i) => {
    const p: Person = {
      id: ids[i],
      name: c[0] as string,
      relation: RELATIONS[c[1] as number],
      status: STATUSES[c[2] as number],
    };
    const b = c[3] as string | undefined;
    const x = c[4] as string | undefined;
    const m = c[5] as string | undefined;
    const v = c[6] as string | undefined;
    const pi = c[7] as number | undefined;
    if (b) p.birthDate = unpackDate(b);
    if (x) p.deathDate = unpackDate(x);
    if (m) p.marriageDate = unpackDate(m);
    if (v) p.divorceDate = unpackDate(v);
    if (pi != null && pi >= 0 && pi < ids.length) p.parentId = ids[pi];
    return p;
  });

  return { decedent, persons };
}

// --- Base64url helpers ---

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

// --- Compression helpers ---

async function compress(data: Uint8Array): Promise<Uint8Array> {
  const cs = new CompressionStream('deflate-raw');
  const writer = cs.writable.getWriter();
  writer.write(data as unknown as BufferSource);
  writer.close();
  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

async function decompress(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const writer = ds.writable.getWriter();
  writer.write(data as unknown as BufferSource);
  writer.close();
  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const totalLen = chunks.reduce((sum, c) => sum + c.length, 0);
  const result = new Uint8Array(totalLen);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  return result;
}

// --- Version prefixes ---
// "2" = compact keys + deflate-raw (current)
// "1" = full JSON + deflate-raw (v1)
// no prefix = legacy uncompressed full JSON

function isValidCompact(obj: unknown): obj is CompactState {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (!Array.isArray(o.d) || !Array.isArray(o.p)) return false;
  if (typeof o.d[0] !== 'string') return false;
  return o.p.every((item: unknown) => Array.isArray(item) && item.length >= 3);
}

function isValidShareState(obj: unknown): obj is ShareState {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  if (!o.decedent || typeof o.decedent !== 'object') return false;
  if (!Array.isArray(o.persons)) return false;
  return true;
}

const V2_PREFIX = '2';
const V1_PREFIX = '1';

/**
 * Encode state to a compact, compressed, URL-safe base64 string.
 * Uses compact keys → JSON → deflate-raw → base64url, prefixed with "2".
 */
export async function encodeState(decedent: Decedent, persons: Person[]): Promise<string> {
  const compact = toCompact({ decedent, persons });
  const json = JSON.stringify(compact);
  const raw = new TextEncoder().encode(json);
  const compressed = await compress(raw);
  return V2_PREFIX + toBase64Url(compressed);
}

/**
 * Decode a URL hash string back to state.
 * Supports v2 (compact+compressed), v1 (full JSON compressed), and legacy uncompressed.
 */
export async function decodeState(hash: string): Promise<ShareState | null> {
  try {
    if (!hash) return null;

    let json: string;
    let isCompact = false;

    if (hash.startsWith(V2_PREFIX)) {
      const compressed = fromBase64Url(hash.slice(V2_PREFIX.length));
      const raw = await decompress(compressed);
      json = new TextDecoder().decode(raw);
      isCompact = true;
    } else if (hash.startsWith(V1_PREFIX)) {
      const compressed = fromBase64Url(hash.slice(V1_PREFIX.length));
      const raw = await decompress(compressed);
      json = new TextDecoder().decode(raw);
    } else {
      // Legacy uncompressed
      const bytes = fromBase64Url(hash);
      json = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(json);

    if (isCompact) {
      if (!isValidCompact(parsed)) return null;
      const state = fromCompact(parsed as CompactState);
      if (!state.decedent || !Array.isArray(state.persons)) return null;
      return state;
    }

    if (!isValidShareState(parsed)) return null;
    const state = parsed as ShareState;
    return state;
  } catch {
    return null;
  }
}

/**
 * Build a shareable URL with the current state encoded in the hash.
 */
export async function buildShareUrl(decedent: Decedent, persons: Person[]): Promise<string> {
  const encoded = await encodeState(decedent, persons);
  const url = new URL(window.location.href);
  url.hash = encoded;
  return url.toString();
}

/**
 * Read state from the current URL hash if present.
 */
export async function readHashState(): Promise<ShareState | null> {
  const hash = window.location.hash.slice(1);
  if (!hash) return null;
  return decodeState(hash);
}
