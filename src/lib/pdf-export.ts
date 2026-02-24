import { toCanvas } from 'html-to-image';

const EXCLUDE_CLASSES = [
  'react-flow__controls',
  'react-flow__background',
  'react-flow__minimap',
];

function shouldInclude(node: Node): boolean {
  if (node instanceof HTMLElement) {
    for (const cls of EXCLUDE_CLASSES) {
      if (node.classList.contains(cls)) return false;
    }
  }
  return true;
}

async function captureElement(element: HTMLElement) {
  return toCanvas(element, {
    pixelRatio: 2,
    cacheBust: true,
    filter: shouldInclude,
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
