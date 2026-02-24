/**
 * html2canvas cannot parse oklch() colours used by Tailwind CSS v4.
 * Modern browsers may also return oklch() from getComputedStyle().
 *
 * Fix strategy (inside onclone):
 *
 *  Phase 1 — Patch stylesheets:
 *    Read all CSS rules from the ORIGINAL document.styleSheets, replace
 *    oklch() with 'transparent', inject as <style> into the clone, and
 *    remove original <style>/<link> elements.
 *
 *  Phase 2 — Inline colours as rgb/hex:
 *    Read computed styles from the original DOM and convert any oklch()
 *    values to hex via Canvas 2D fillStyle before setting them as
 *    inline styles on the cloned elements. Handles both HTML colour
 *    properties and SVG stroke/fill.
 */

// Shared canvas context for oklch → hex conversion
const _cvs = document.createElement('canvas');
const _ctx = _cvs.getContext('2d')!;

/** Replace every oklch(...) in a CSS value string with its hex equivalent. */
function resolveOklch(value: string): string {
  if (!value || !value.includes('oklch')) return value;
  return value.replace(/oklch\([^)]*\)/gi, (match) => {
    _ctx.fillStyle = '#000000';
    _ctx.fillStyle = match;
    return _ctx.fillStyle;
  });
}

const HTML_COLOR_PROPS = [
  'color', 'background-color', 'border-color',
  'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
  'outline-color', 'text-decoration-color', 'box-shadow',
] as const;

const SVG_COLOR_PROPS = ['stroke', 'fill', 'stop-color', 'flood-color'] as const;

function patchClone(clonedDoc: Document, clone: HTMLElement) {
  // Hide ReactFlow UI chrome in the clone
  for (const sel of ['.react-flow__controls', '.react-flow__background', '.react-flow__minimap']) {
    clonedDoc.querySelectorAll<HTMLElement>(sel).forEach(el => {
      el.style.display = 'none';
    });
  }

  // --- Phase 1: Replace all stylesheets with oklch-free versions ---
  const cssTexts: string[] = [];
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      let text = '';
      for (const rule of Array.from(sheet.cssRules)) {
        text += rule.cssText + '\n';
      }
      cssTexts.push(text);
    } catch {
      // CORS — skip external stylesheets we cannot access
    }
  }

  // Remove originals from the clone
  clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove());

  // Inject patched CSS (oklch → transparent as a safe placeholder)
  const patched = cssTexts.join('\n').replace(/oklch\([^)]*\)/gi, 'transparent');
  const styleEl = clonedDoc.createElement('style');
  styleEl.textContent = patched;
  clonedDoc.head.appendChild(styleEl);

  // --- Phase 2: Inline computed colours (oklch → hex via canvas) ---
  const origRoot = document.getElementById(clone.id);
  if (!origRoot) return;

  const origEls = origRoot.querySelectorAll('*');
  const cloneEls = clone.querySelectorAll('*');

  for (let i = 0; i < origEls.length && i < cloneEls.length; i++) {
    const origEl = origEls[i] as Element;
    const cloneEl = cloneEls[i] as HTMLElement | SVGElement;
    const computed = getComputedStyle(origEl);

    // HTML colour properties
    for (const prop of HTML_COLOR_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        cloneEl.style.setProperty(prop, resolveOklch(value));
      }
    }

    // SVG colour properties (stroke, fill, etc.)
    if (origEl instanceof SVGElement) {
      for (const prop of SVG_COLOR_PROPS) {
        const value = computed.getPropertyValue(prop);
        if (value && value !== 'none') {
          cloneEl.style.setProperty(prop, resolveOklch(value));
        }
      }
    }
  }

  // --- Phase 3: Ensure ReactFlow edge paths have visible strokes ---
  // ReactFlow edges may lose their stroke colour after Phase 1 replaces
  // oklch with transparent. Walk edge paths in the clone and set stroke
  // from the original DOM's computed values.
  const origEdgePaths = document.querySelectorAll('.react-flow__edge-path');
  const cloneEdgePaths = clonedDoc.querySelectorAll('.react-flow__edge-path');
  for (let i = 0; i < origEdgePaths.length && i < cloneEdgePaths.length; i++) {
    const computed = getComputedStyle(origEdgePaths[i]);
    const stroke = computed.getPropertyValue('stroke');
    const clonePath = cloneEdgePaths[i] as SVGElement;
    if (stroke) {
      clonePath.style.setProperty('stroke', resolveOklch(stroke));
    }
    // Preserve stroke-width and stroke-dasharray
    const sw = computed.getPropertyValue('stroke-width');
    if (sw) clonePath.style.setProperty('stroke-width', sw);
    const sd = computed.getPropertyValue('stroke-dasharray');
    if (sd && sd !== 'none') clonePath.style.setProperty('stroke-dasharray', sd);
  }
}

async function captureElement(element: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas');
  return html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    onclone: patchClone,
  });
}

export async function exportToPdf(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  const { default: jsPDF } = await import('jspdf');

  const canvas = await captureElement(element);
  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF({
    orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [canvas.width, canvas.height],
  });

  pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
  pdf.save(filename);
}

export async function exportToPng(elementId: string, filename: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  const canvas = await captureElement(element);
  const link = document.createElement('a');
  link.download = filename;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

export function printPage() {
  window.print();
}
