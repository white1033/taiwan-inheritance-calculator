/**
 * Tailwind CSS v4 uses oklch() colors which html2canvas cannot parse.
 *
 * Fix strategy (two phases inside html2canvas's onclone callback):
 *
 *  Phase 1 — Patch stylesheets:
 *    Read all CSS rules from the ORIGINAL document's styleSheets (which
 *    includes <link> stylesheets that are fully loaded), replace every
 *    oklch() call with 'transparent', and inject the patched CSS as a
 *    single <style> element into the cloned document. Remove the original
 *    <style> and <link rel="stylesheet"> elements from the clone so
 *    html2canvas never encounters oklch().
 *
 *  Phase 2 — Inline computed colors:
 *    Walk the original DOM tree to read getComputedStyle() values (which
 *    the browser has already resolved to rgb), and set them as inline
 *    styles on the matching cloned elements. This overrides the
 *    'transparent' placeholders with correct colours.
 */
function patchClone(_clonedDoc: Document, clone: HTMLElement) {
  // Hide ReactFlow UI chrome in the clone
  for (const sel of ['.react-flow__controls', '.react-flow__background', '.react-flow__minimap']) {
    _clonedDoc.querySelectorAll<HTMLElement>(sel).forEach(el => {
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
  _clonedDoc.querySelectorAll('style, link[rel="stylesheet"]').forEach(el => el.remove());

  // Inject patched CSS
  const patched = cssTexts.join('\n').replace(/oklch\([^)]*\)/gi, 'transparent');
  const styleEl = _clonedDoc.createElement('style');
  styleEl.textContent = patched;
  _clonedDoc.head.appendChild(styleEl);

  // --- Phase 2: Inline computed rgb colours ---
  const COLOR_PROPS = [
    'color', 'background-color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'outline-color', 'text-decoration-color', 'box-shadow',
  ] as const;

  const origRoot = document.getElementById(clone.id);
  if (!origRoot) return;

  const origEls = [origRoot, ...origRoot.querySelectorAll<HTMLElement>('*')];
  const cloneEls = [clone, ...clone.querySelectorAll<HTMLElement>('*')];

  for (let i = 0; i < origEls.length && i < cloneEls.length; i++) {
    const computed = getComputedStyle(origEls[i]);
    for (const prop of COLOR_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        cloneEls[i].style.setProperty(prop, value);
      }
    }
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
