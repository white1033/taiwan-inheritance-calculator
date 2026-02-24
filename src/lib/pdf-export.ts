/**
 * html2canvas cannot parse oklch() colours used by Tailwind CSS v4,
 * and has limited SVG rendering (ReactFlow edges are lost).
 *
 * Strategy:
 *  1. patchClone — fix oklch() in stylesheets and inline styles
 *  2. drawEdgesOnCanvas — after html2canvas renders, manually draw
 *     ReactFlow edge paths onto the canvas via Canvas 2D API
 *  3. Composite edges BEHIND nodes for correct z-order
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
 * Parse the viewport transform to get translate and scale values.
 * Handles both `translate(x, y) scale(z)` and `matrix(a,b,c,d,e,f)` formats.
 */
function parseViewportTransform(viewport: HTMLElement): { tx: number; ty: number; scale: number } | null {
  // First try the computed transform (returns matrix form)
  const computed = getComputedStyle(viewport).transform;
  if (computed && computed !== 'none') {
    // matrix(a, b, c, d, e, f) — for translate+scale: a=scaleX, d=scaleY, e=tx, f=ty
    const matrixMatch = computed.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
      if (values.length === 6) {
        return { tx: values[4], ty: values[5], scale: values[0] };
      }
    }
  }

  // Fallback: parse inline style (translate / translate3d)
  const inlineTransform = viewport.style.transform;
  // translate3d(Xpx, Ypx, 0px) scale(Z)
  const match3d = inlineTransform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px,\s*[-\d.]+px\)\s*scale\(([-\d.]+)\)/);
  if (match3d) {
    return { tx: parseFloat(match3d[1]), ty: parseFloat(match3d[2]), scale: parseFloat(match3d[3]) };
  }
  // translate(Xpx, Ypx) scale(Z)
  const match2d = inlineTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
  if (match2d) {
    return { tx: parseFloat(match2d[1]), ty: parseFloat(match2d[2]), scale: parseFloat(match2d[3]) };
  }

  return null;
}

/**
 * Draw ReactFlow edge paths directly onto the canvas.
 * html2canvas has poor SVG support and consistently fails to render
 * ReactFlow's SVG edge paths. We bypass this by reading the path data
 * and computed styles from the original DOM, then drawing them using
 * the Canvas 2D API with the correct viewport transform.
 */
function drawEdgesOnCanvas(canvas: HTMLCanvasElement, element: HTMLElement, canvasScale: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const viewport = element.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewport) return;

  const vt = parseViewportTransform(viewport);
  if (!vt) return;

  // Account for any offset between the element and the viewport container.
  const reactFlowEl = element.querySelector('.react-flow') as HTMLElement;
  const elemRect = element.getBoundingClientRect();
  let offsetX = 0;
  let offsetY = 0;
  if (reactFlowEl) {
    const rfRect = reactFlowEl.getBoundingClientRect();
    offsetX = rfRect.left - elemRect.left;
    offsetY = rfRect.top - elemRect.top;
  }

  const edgePaths = element.querySelectorAll('.react-flow__edge-path');
  if (edgePaths.length === 0) return;

  ctx.save();

  // Create a clipping region that excludes node card areas.
  // This simulates edges being rendered behind nodes (correct z-order)
  // by preventing edge strokes from drawing over node rectangles.
  const nodes = element.querySelectorAll('.react-flow__node');
  ctx.beginPath();
  ctx.rect(0, 0, canvas.width, canvas.height);
  for (const node of Array.from(nodes)) {
    const nodeRect = (node as HTMLElement).getBoundingClientRect();
    const x = (nodeRect.left - elemRect.left) * canvasScale;
    const y = (nodeRect.top - elemRect.top) * canvasScale;
    const w = nodeRect.width * canvasScale;
    const h = nodeRect.height * canvasScale;
    ctx.rect(x, y, w, h);
  }
  ctx.clip('evenodd');

  // Draw edges within the clipped region
  for (const pathEl of Array.from(edgePaths)) {
    const d = pathEl.getAttribute('d');
    if (!d) continue;

    const computed = getComputedStyle(pathEl);
    let stroke = computed.getPropertyValue('stroke');
    stroke = resolveOklch(stroke) || '#b1b1b7';
    if (!stroke || stroke === 'transparent' || stroke === 'rgba(0, 0, 0, 0)') {
      stroke = '#b1b1b7';
    }
    const strokeWidth = parseFloat(computed.getPropertyValue('stroke-width')) || 1;
    const dashArray = computed.getPropertyValue('stroke-dasharray');

    ctx.save();

    ctx.setTransform(
      canvasScale * vt.scale, 0,
      0, canvasScale * vt.scale,
      canvasScale * (offsetX + vt.tx), canvasScale * (offsetY + vt.ty),
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

  ctx.restore();
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

  // html2canvas can't render ReactFlow SVG edges — draw them on top
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
