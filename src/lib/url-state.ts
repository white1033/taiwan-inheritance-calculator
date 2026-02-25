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

interface CompactPerson {
  i: string;   // id
  n: string;   // name
  r: number;   // relation index
  s: number;   // status index
  b?: string;  // birthDate
  x?: string;  // deathDate
  m?: string;  // marriageDate
  v?: string;  // divorceDate
  p?: string;  // parentId
}

interface CompactState {
  d: { i: string; n: string; x?: string; e?: number };  // decedent
  p: CompactPerson[];                                     // persons
}

function toCompact(state: ShareState): CompactState {
  return {
    d: {
      i: state.decedent.id,
      n: state.decedent.name,
      ...(state.decedent.deathDate && { x: state.decedent.deathDate }),
      ...(state.decedent.estateAmount && { e: state.decedent.estateAmount }),
    },
    p: state.persons.map(p => {
      const c: CompactPerson = {
        i: p.id,
        n: p.name,
        r: RELATIONS.indexOf(p.relation),
        s: STATUSES.indexOf(p.status),
      };
      if (p.birthDate) c.b = p.birthDate;
      if (p.deathDate) c.x = p.deathDate;
      if (p.marriageDate) c.m = p.marriageDate;
      if (p.divorceDate) c.v = p.divorceDate;
      if (p.parentId) c.p = p.parentId;
      return c;
    }),
  };
}

function fromCompact(compact: CompactState): ShareState {
  return {
    decedent: {
      id: compact.d.i,
      name: compact.d.n,
      ...(compact.d.x && { deathDate: compact.d.x }),
      ...(compact.d.e && { estateAmount: compact.d.e }),
    },
    persons: compact.p.map(c => {
      const p: Person = {
        id: c.i,
        name: c.n,
        relation: RELATIONS[c.r],
        status: STATUSES[c.s],
      };
      if (c.b) p.birthDate = c.b;
      if (c.x) p.deathDate = c.x;
      if (c.m) p.marriageDate = c.m;
      if (c.v) p.divorceDate = c.v;
      if (c.p) p.parentId = c.p;
      return p;
    }),
  };
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
      const state = fromCompact(parsed as CompactState);
      if (!state.decedent || !Array.isArray(state.persons)) return null;
      return state;
    }

    const state = parsed as ShareState;
    if (!state.decedent || !Array.isArray(state.persons)) return null;
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
