/**
 * html2canvas cannot parse oklch() colours used by Tailwind CSS v4,
 * and has limited SVG rendering (ReactFlow edges are lost).
 *
 * Strategy:
 *  1. patchClone — fix modern colour functions in stylesheets and inline styles
 *  2. drawEdgesOnCanvas — draw edge paths via Canvas 2D API
 *  3. Composite: html2canvas result → edges → re-stamp node cards
 *     This gives correct z-order: background → edges → nodes
 */

// Lazy-initialized 1x1 canvas context for colour sampling.
let _ctx: CanvasRenderingContext2D | null = null;

function getCtx(): CanvasRenderingContext2D {
  if (!_ctx) {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    _ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  }
  return _ctx;
}

function hasUnsupportedColorFn(value: string): boolean {
  return /oklch\(|oklab\(|color-mix\(/i.test(value);
}

function colorFunctionToRgba(value: string): string {
  const ctx = getCtx();

  try {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = 'rgba(0, 0, 0, 0)';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = value;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, aByte] = ctx.getImageData(0, 0, 1, 1).data;

    if (aByte >= 255) return `rgb(${r}, ${g}, ${b})`;
    const alpha = Number((aByte / 255).toFixed(3));
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  } catch {
    return value;
  }
}

function replaceCssFunctionCalls(
  input: string,
  fnName: string,
  replacer: (fullCall: string) => string,
): string {
  const lower = input.toLowerCase();
  const target = `${fnName.toLowerCase()}(`;
  let i = 0;
  let out = '';

  while (i < input.length) {
    const start = lower.indexOf(target, i);
    if (start === -1) {
      out += input.slice(i);
      break;
    }

    out += input.slice(i, start);

    let depth = 0;
    let end = -1;
    for (let j = start; j < input.length; j++) {
      const ch = input[j];
      if (ch === '(') depth++;
      if (ch === ')') {
        depth--;
        if (depth === 0) {
          end = j;
          break;
        }
      }
    }

    if (end === -1) {
      out += input.slice(start);
      break;
    }

    const fullCall = input.slice(start, end + 1);
    out += replacer(fullCall);
    i = end + 1;
  }

  return out;
}

/** Convert unsupported colour functions to rgba()/rgb() for html2canvas. */
function resolveColorFns(value: string): string {
  if (!value || !hasUnsupportedColorFn(value)) return value;

  let out = value;
  out = replaceCssFunctionCalls(out, 'oklch', colorFunctionToRgba);
  out = replaceCssFunctionCalls(out, 'oklab', colorFunctionToRgba);
  out = replaceCssFunctionCalls(out, 'color-mix', colorFunctionToRgba);
  return out;
}

function patchClone(clonedDoc: Document, clone: HTMLElement) {
  // Hide ReactFlow UI chrome in the clone
  for (const sel of ['.react-flow__controls', '.react-flow__background', '.react-flow__minimap', '.react-flow__handle', '.no-print']) {
    clonedDoc.querySelectorAll<HTMLElement>(sel).forEach(el => {
      el.style.display = 'none';
    });
  }

  // --- Phase 1: Replace all stylesheets with html2canvas-safe colours ---
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

  // Inject patched CSS (oklch/oklab/color-mix → rgb/rgba)
  const patched = resolveColorFns(cssTexts.join('\n'));
  const styleEl = clonedDoc.createElement('style');
  styleEl.textContent = patched;
  clonedDoc.head.appendChild(styleEl);

  // --- Phase 2: Inline computed colours ---
  // Chrome's getComputedStyle can return oklch()/oklab() values for any colour
  // property. Instead of maintaining a fixed list, scan all computed
  // properties for unsupported colour functions and replace them.
  const origRoot = document.getElementById(clone.id);
  if (!origRoot) return;

  const origEls = origRoot.querySelectorAll('*');
  const cloneEls = clone.querySelectorAll('*');

  for (let i = 0; i < origEls.length && i < cloneEls.length; i++) {
    const origEl = origEls[i] as Element;
    const cloneEl = cloneEls[i] as HTMLElement | SVGElement;
    const computed = getComputedStyle(origEl);

    for (let j = 0; j < computed.length; j++) {
      const prop = computed[j];
      const value = computed.getPropertyValue(prop);
      if (value && hasUnsupportedColorFn(value)) {
        cloneEl.style.setProperty(prop, resolveColorFns(value));
      }
    }
  }
}

/**
 * Parse the viewport transform to get translate and scale values.
 * Handles both `matrix(a,b,c,d,e,f)` and inline translate/translate3d formats.
 */
function parseViewportTransform(viewport: HTMLElement): { tx: number; ty: number; scale: number } | null {
  const computed = getComputedStyle(viewport).transform;
  if (computed && computed !== 'none') {
    const matrixMatch = computed.match(/matrix\(([^)]+)\)/);
    if (matrixMatch) {
      const values = matrixMatch[1].split(',').map(v => parseFloat(v.trim()));
      if (values.length === 6) {
        return { tx: values[4], ty: values[5], scale: values[0] };
      }
    }
  }

  const inlineTransform = viewport.style.transform;
  const match3d = inlineTransform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px,\s*[-\d.]+px\)\s*scale\(([-\d.]+)\)/);
  if (match3d) {
    return { tx: parseFloat(match3d[1]), ty: parseFloat(match3d[2]), scale: parseFloat(match3d[3]) };
  }
  const match2d = inlineTransform.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)\s*scale\(([-\d.]+)\)/);
  if (match2d) {
    return { tx: parseFloat(match2d[1]), ty: parseFloat(match2d[2]), scale: parseFloat(match2d[3]) };
  }

  return null;
}

/**
 * Draw ReactFlow edge paths directly onto the canvas.
 */
function drawEdgesOnCanvas(canvas: HTMLCanvasElement, element: HTMLElement, canvasScale: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const viewport = element.querySelector('.react-flow__viewport') as HTMLElement;
  if (!viewport) return;

  const vt = parseViewportTransform(viewport);
  if (!vt) return;

  // Account for any offset between the element and the ReactFlow container
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

  for (const pathEl of Array.from(edgePaths)) {
    const d = pathEl.getAttribute('d');
    if (!d) continue;

    const computed = getComputedStyle(pathEl);
    let stroke = computed.getPropertyValue('stroke');
    stroke = resolveColorFns(stroke) || '#b1b1b7';
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
}

const CANVAS_SCALE = 2;

/**
 * Temporarily rewrite unsupported colour functions in the live document's
 * stylesheets (both inline <style> and external <link>) so that
 * html2canvas doesn't see oklch/oklab/color-mix syntax.
 *
 * For <link> stylesheets we read their cssRules, patch colours to rgb/rgba,
 * and inject a replacement <style> (disabling the original <link>).
 *
 * Returns an "unpatch" function that restores everything.
 */
function patchLiveStylesheets(): () => void {
  type Undo = () => void;
  const undos: Undo[] = [];

  // 1. Inline <style> elements — rewrite textContent directly
  document.querySelectorAll<HTMLStyleElement>('style').forEach((styleEl) => {
    const text = styleEl.textContent ?? '';
    if (hasUnsupportedColorFn(text)) {
      const original = text;
      styleEl.textContent = resolveColorFns(text);
      undos.push(() => { styleEl.textContent = original; });
    }
  });

  // 2. External <link rel="stylesheet"> — read rules, inject patched <style>,
  //    disable the <link> temporarily
  document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]').forEach((linkEl) => {
    // Find the matching CSSStyleSheet for this <link>
    let sheet: CSSStyleSheet | null = null;
    for (const s of Array.from(document.styleSheets)) {
      if (s.ownerNode === linkEl) { sheet = s; break; }
    }
    if (!sheet) return;

    let cssText = '';
    try {
      for (const rule of Array.from(sheet.cssRules)) {
        cssText += rule.cssText + '\n';
      }
    } catch {
      return; // CORS — cannot read rules
    }

    if (!hasUnsupportedColorFn(cssText)) return;
    const patched = resolveColorFns(cssText);

    // Disable original <link> and inject replacement <style>
    linkEl.disabled = true;
    const replacement = document.createElement('style');
    replacement.textContent = patched;
    replacement.dataset.oklchPatch = '1';
    document.head.appendChild(replacement);

    undos.push(() => {
      linkEl.disabled = false;
      replacement.remove();
    });
  });

  return () => {
    for (const undo of undos) undo();
  };
}

async function captureElement(element: HTMLElement) {
  const { default: html2canvas } = await import('html2canvas');

  // Patch live stylesheets BEFORE html2canvas clones the DOM.
  // This eliminates unsupported colour syntax at the CSS source.
  const unpatchStylesheets = patchLiveStylesheets();

  let baseCanvas: HTMLCanvasElement;
  try {
    // html2canvas renders background + nodes (but not SVG edges)
    baseCanvas = await html2canvas(element, {
      scale: CANVAS_SCALE,
      useCORS: true,
      logging: false,
      onclone: patchClone,
    });
  } finally {
    unpatchStylesheets();
  }

  // Composite with correct z-order: background → edges → nodes
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = baseCanvas.width;
  finalCanvas.height = baseCanvas.height;
  const ctx = finalCanvas.getContext('2d')!;

  // Step 1: Draw html2canvas result (background + nodes)
  ctx.drawImage(baseCanvas, 0, 0);

  // Step 2: Draw edges on top
  drawEdgesOnCanvas(finalCanvas, element, CANVAS_SCALE);

  // Step 3: Re-stamp node card regions from the original render on top
  // of the edges, so nodes cover edges — matching the browser z-order.
  const elemRect = element.getBoundingClientRect();
  const nodes = element.querySelectorAll('.react-flow__node');
  for (const node of Array.from(nodes)) {
    const r = (node as HTMLElement).getBoundingClientRect();
    const sx = (r.left - elemRect.left) * CANVAS_SCALE;
    const sy = (r.top - elemRect.top) * CANVAS_SCALE;
    const sw = r.width * CANVAS_SCALE;
    const sh = r.height * CANVAS_SCALE;
    // Copy the node rectangle from baseCanvas and paste on top of edges
    ctx.drawImage(baseCanvas, sx, sy, sw, sh, sx, sy, sw, sh);
  }

  return finalCanvas;
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

  const win = window.open('', '_blank');
  if (!win) {
    throw new Error('無法開啟列印視窗，請允許彈出視窗後再試');
  }
  const doc = win.document;

  const style = doc.createElement('style');
  style.textContent = '@media print { @page { margin: 10mm; } } body { margin: 0; display: flex; justify-content: center; } img { max-width: 100%; height: auto; }';
  doc.head.appendChild(style);
  doc.title = '繼承系統圖';

  const img = doc.createElement('img');
  img.src = dataUrl;
  img.onload = () => { win.print(); win.close(); };
  img.onerror = () => {
    win.document.body.textContent = '圖片載入失敗，請關閉此視窗後重試';
  };
  doc.body.appendChild(img);
}
