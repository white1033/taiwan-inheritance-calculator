/**
 * html2canvas cannot parse oklch() colours used by Tailwind CSS v4,
 * and has limited SVG rendering (ReactFlow edges are lost).
 *
 * Strategy:
 *  1. patchClone — fix oklch() in stylesheets and inline styles
 *  2. drawEdgesOnCanvas — after html2canvas renders, manually draw
 *     ReactFlow edge paths onto the canvas via Canvas 2D API
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

    for (const prop of HTML_COLOR_PROPS) {
      const value = computed.getPropertyValue(prop);
      if (value) {
        cloneEl.style.setProperty(prop, resolveOklch(value));
      }
    }
  }
}

/**
 * Draw ReactFlow edge paths directly onto the canvas.
 * html2canvas has poor SVG support and consistently fails to render
 * ReactFlow's SVG edge paths. We bypass this by reading the path data
 * and computed styles from the original DOM, then drawing them using
 * the Canvas 2D API with the correct viewport transform.
 */
function drawEdgesOnCanvas(canvas: HTMLCanvasElement, element: HTMLElement, scale: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // Get the ReactFlow viewport transform
  const viewport = element.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewport) return;

  const transform = viewport.style.transform;
  const match = transform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
  if (!match) return;

  const tx = parseFloat(match[1]);
  const ty = parseFloat(match[2]);
  const vScale = parseFloat(match[3]);

  // Get all edge paths from the original DOM
  const edgePaths = element.querySelectorAll('.react-flow__edge-path');

  for (const pathEl of Array.from(edgePaths)) {
    const d = pathEl.getAttribute('d');
    if (!d) continue;

    const computed = getComputedStyle(pathEl);
    let stroke = computed.getPropertyValue('stroke');
    stroke = resolveOklch(stroke) || '#b1b1b7';
    // Fallback: if stroke resolved to empty or transparent, use default grey
    if (!stroke || stroke === 'transparent' || stroke === 'rgba(0, 0, 0, 0)') {
      stroke = '#b1b1b7';
    }
    const strokeWidth = parseFloat(computed.getPropertyValue('stroke-width')) || 1;
    const dashArray = computed.getPropertyValue('stroke-dasharray');

    ctx.save();

    // Apply: canvas scale × viewport transform
    ctx.setTransform(
      scale * vScale, 0,
      0, scale * vScale,
      scale * tx, scale * ty,
    );

    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (dashArray && dashArray !== 'none') {
      const dashes = dashArray.split(/[\s,]+/).map(Number).filter(n => !isNaN(n));
      if (dashes.length > 0) ctx.setLineDash(dashes);
    }

    const path2d = new Path2D(d);
    ctx.stroke(path2d);

    ctx.restore();
  }
}

const CANVAS_SCALE = 2;

async function captureElement(element: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas');
  const canvas = await html2canvas(element, {
    scale: CANVAS_SCALE,
    useCORS: true,
    logging: false,
    onclone: patchClone,
  });

  // html2canvas can't render ReactFlow SVG edges — draw them manually
  drawEdgesOnCanvas(canvas, element, CANVAS_SCALE);

  return canvas;
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

export async function printPage(elementId: string) {
  const element = document.getElementById(elementId);
  if (!element) throw new Error(`Element #${elementId} not found`);

  const canvas = await captureElement(element);
  const dataUrl = canvas.toDataURL('image/png');

  const win = window.open('', '_blank')!;
  const doc = win.document;

  const style = doc.createElement('style');
  style.textContent = '@media print { @page { margin: 10mm; } } body { margin: 0; display: flex; justify-content: center; } img { max-width: 100%; height: auto; }';
  doc.head.appendChild(style);
  doc.title = '繼承系統圖';

  const img = doc.createElement('img');
  img.src = dataUrl;
  img.onload = () => { win.print(); win.close(); };
  doc.body.appendChild(img);
}
