interface PickerWritable {
  write: (data: Blob) => Promise<void>;
  close: () => Promise<void>;
}

interface PickerHandle {
  createWritable: () => Promise<PickerWritable>;
}

interface SavePickerWindow extends Window {
  showSaveFilePicker?: (options?: unknown) => Promise<PickerHandle>;
}

function fileExtension(filename: string): string {
  const i = filename.lastIndexOf('.');
  return i >= 0 ? filename.slice(i) : '';
}

function pickerAccept(blob: Blob, filename: string): Record<string, string[]> {
  const ext = fileExtension(filename);
  const mime = blob.type || 'application/octet-stream';
  if (ext) return { [mime]: [ext] };
  return { [mime]: ['.bin'] };
}

async function saveWithFilePicker(blob: Blob, filename: string): Promise<'saved' | 'cancelled' | 'unsupported' | 'failed'> {
  const w = window as SavePickerWindow;
  if (!window.isSecureContext || typeof w.showSaveFilePicker !== 'function') {
    return 'unsupported';
  }

  try {
    const handle = await w.showSaveFilePicker({
      suggestedName: filename,
      types: [
        {
          description: 'Download file',
          accept: pickerAccept(blob, filename),
        },
      ],
      excludeAcceptAllOption: false,
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return 'saved';
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return 'cancelled';
    }
    return 'failed';
  }
}

function fallbackAnchorDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
    link.remove();
  }, 3000);
}

/**
 * Cross-browser download helper:
 * 1) Chrome/Edge: try File System Access save dialog for stable filename/path
 * 2) Fallback: Blob URL + temporary anchor click
 */
export async function downloadBlob(blob: Blob, filename: string) {
  const pickerResult = await saveWithFilePicker(blob, filename);
  if (pickerResult === 'saved' || pickerResult === 'cancelled') return;
  fallbackAnchorDownload(blob, filename);
}
