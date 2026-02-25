import type { Decedent, Person } from '../types/models';

interface ShareState {
  decedent: Decedent;
  persons: Person[];
}

// Version prefix: "1" = deflate-raw compressed, no prefix = legacy uncompressed
const COMPRESSED_PREFIX = '1';

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

/**
 * Encode state to a compressed, URL-safe base64 string for hash sharing.
 * Uses JSON → UTF-8 → deflate-raw → base64url, prefixed with "1".
 */
export async function encodeState(decedent: Decedent, persons: Person[]): Promise<string> {
  const state: ShareState = { decedent, persons };
  const json = JSON.stringify(state);
  const raw = new TextEncoder().encode(json);
  const compressed = await compress(raw);
  return COMPRESSED_PREFIX + toBase64Url(compressed);
}

/**
 * Decode a URL hash string back to state.
 * Supports both compressed (prefix "1") and legacy uncompressed formats.
 */
export async function decodeState(hash: string): Promise<ShareState | null> {
  try {
    if (!hash) return null;

    let json: string;
    if (hash.startsWith(COMPRESSED_PREFIX)) {
      const compressed = fromBase64Url(hash.slice(COMPRESSED_PREFIX.length));
      const raw = await decompress(compressed);
      json = new TextDecoder().decode(raw);
    } else {
      // Legacy uncompressed format
      const bytes = fromBase64Url(hash);
      json = new TextDecoder().decode(bytes);
    }

    const parsed = JSON.parse(json) as ShareState;
    if (!parsed.decedent || !Array.isArray(parsed.persons)) return null;
    return parsed;
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
