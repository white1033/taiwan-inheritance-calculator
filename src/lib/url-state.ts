import type { Decedent, Person } from '../types/models';

interface ShareState {
  decedent: Decedent;
  persons: Person[];
}

/**
 * Encode state to a URL-safe base64 string for hash sharing.
 * Uses JSON → UTF-8 bytes → base64url encoding.
 */
export function encodeState(decedent: Decedent, persons: Person[]): string {
  const state: ShareState = { decedent, persons };
  const json = JSON.stringify(state);
  const bytes = new TextEncoder().encode(json);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  // base64url: replace + with -, / with _, remove trailing =
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decode a URL hash string back to state.
 * Returns null if the hash is invalid.
 */
export function decodeState(hash: string): ShareState | null {
  try {
    if (!hash) return null;
    // Restore base64 from base64url
    let base64 = hash.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    while (base64.length % 4 !== 0) {
      base64 += '=';
    }
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
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
export function buildShareUrl(decedent: Decedent, persons: Person[]): string {
  const encoded = encodeState(decedent, persons);
  const url = new URL(window.location.href);
  url.hash = encoded;
  return url.toString();
}

/**
 * Read state from the current URL hash if present.
 */
export function readHashState(): ShareState | null {
  const hash = window.location.hash.slice(1); // remove leading #
  if (!hash) return null;
  return decodeState(hash);
}
