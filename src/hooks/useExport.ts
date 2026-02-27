import { useState } from 'react';
import { useInheritance } from './useInheritance';
import { exportToExcel } from '../lib/excel';
import { exportToPng, printPage } from '../lib/pdf-export';
import { useToast } from './useToast';
import { buildShareUrl } from '../lib/url-state';

export type ExportAction = 'print' | 'excel' | 'png' | null;

export function useExport() {
  const { state } = useInheritance();
  const { toast } = useToast();
  const hasErrors = state.validationErrors.length > 0;
  const [loadingAction, setLoadingAction] = useState<ExportAction>(null);

  async function guardedExport(action: ExportAction, fn: () => Promise<void>) {
    if (hasErrors) {
      toast('請先修正所有驗證錯誤後再匯出', 'error');
      return;
    }
    setLoadingAction(action);
    try {
      await fn();
    } finally {
      setLoadingAction(null);
    }
  }

  const handlePrint = () => guardedExport('print', () => printPage('family-tree'));

  const handleExcel = () =>
    guardedExport('excel', async () => {
      try {
        await exportToExcel(state.decedent, state.persons);
      } catch (err) {
        toast(
          'Excel 匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'),
          'error',
        );
      }
    });

  const handlePng = () =>
    guardedExport('png', async () => {
      try {
        await exportToPng('family-tree', '繼承系統圖.png');
      } catch (err) {
        toast(
          '圖片匯出失敗：' + (err instanceof Error ? err.message : '未知錯誤'),
          'error',
        );
      }
    });

  const handleShareLink = async () => {
    try {
      const url = await buildShareUrl(state.decedent, state.persons);
      await navigator.clipboard.writeText(url);
      toast('已複製分享連結到剪貼簿', 'success');
    } catch {
      toast('複製失敗，請手動複製', 'error');
    }
  };

  return { handlePrint, handleExcel, handlePng, handleShareLink, loadingAction, hasErrors };
}
