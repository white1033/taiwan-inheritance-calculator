/**
 * Tailwind CSS v4 uses oklch() colors which html2canvas cannot parse.
 * Two-phase fix:
 *  1. Strip oklch() from all <style> elements in the cloned document so
 *     html2canvas's CSS parser never encounters them.
 *  2. Inline computed (rgb) color values from the real DOM onto the cloned
 *     elements so they still render with correct colors.
 */
function patchClonedColors(_doc: Document, clone: HTMLElement) {
  // Phase 1: Neutralise oklch() in cloned stylesheets.
  // Replace oklch(...) with 'transparent' – html2canvas will skip transparent
  // values and fall back to inline styles set in Phase 2.
  const styles = _doc.querySelectorAll('style');
  for (const style of styles) {
    if (style.textContent && style.textContent.includes('oklch')) {
      style.textContent = style.textContent.replace(
        /oklch\([^)]*\)/gi,
        'transparent',
      );
    }
  }

  // Phase 2: Inline computed rgb colors from the original DOM.
  const COLOR_PROPS = [
    'color', 'background-color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'outline-color', 'text-decoration-color', 'box-shadow',
  ] as const;

  const origRoot = document.getElementById(clone.id);
  if (!origRoot) return;

  const origElements = [origRoot, ...origRoot.querySelectorAll<HTMLElement>('*')];
  const cloneElements = [clone, ...clone.querySelectorAll<HTMLElement>('*')];

  for (let i = 0; i < origElements.length && i < cloneElements.length; i++) {
    const computed = getComputedStyle(origElements[i]);
    for (const prop of COLOR_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        cloneElements[i].style.setProperty(prop, value);
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
    onclone: patchClonedColors,
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
