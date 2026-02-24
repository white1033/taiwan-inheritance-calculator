/**
 * Tailwind CSS v4 uses oklch() colors which html2canvas cannot parse.
 * This callback inlines computed (rgb) color values on all elements in
 * the cloned DOM so html2canvas never encounters oklch().
 */
function patchClonedColors(_doc: Document, clone: HTMLElement) {
  const COLOR_PROPS = [
    'color', 'background-color', 'border-color',
    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',
    'outline-color', 'text-decoration-color',
  ] as const;

  // Walk the real DOM to read computed styles (already resolved to rgb),
  // then apply them as inline styles on the matching cloned element.
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
