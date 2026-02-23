# 繼承系統表計算工具

依據台灣民法繼承編，計算法定應繼分與特留分的互動式工具。

**[線上使用](https://white1033.github.io/taiwan-inheritance-calculator/)**

## 功能

- 互動式家族樹編輯器（基於 ReactFlow）
- 四順位繼承計算（民法第 1138 條）：直系血親卑親屬 → 父母 → 兄弟姊妹 → 祖父母
- 配偶應繼分依各順位自動調整（民法第 1144 條）
- 代位繼承（民法第 1140 條）與再轉繼承
- 特留分計算（民法第 1223 條）
- 精確分數運算，避免浮點數誤差
- 匯出功能：列印、Excel、PDF、PNG

## 本地開發

```bash
npm install
npm run dev
```

瀏覽器開啟 `http://localhost:5173` 即可使用。

## 指令

| 指令 | 說明 |
|------|------|
| `npm run dev` | 啟動開發伺服器 |
| `npm run build` | TypeScript 檢查 + 正式建置 |
| `npm run lint` | ESLint 檢查 |
| `npm run test:run` | 執行測試 |

## 免責聲明

本工具僅供參考，計算結果不構成法律意見。實際繼承事務請諮詢專業律師或地政士。

## 授權

[MIT](LICENSE)
