# 孫子女誤繼承 Bug 修正設計

日期：2026-02-27

## 問題描述

當被繼承人的子女（如葉大華）是活著的（status: `一般繼承`），其子女（如葉小明）被設定為 `relation: '子女'`、`status: '一般繼承'`、`parentId` 指向葉大華時，計算引擎會錯誤地將葉小明視為被繼承人的直系子女，給予其應繼分。

根據台灣民法：
- **第 1138 條**：直系血親卑親屬為第一順位繼承人
- **第 1140 條**：代位繼承僅在繼承人於被繼承人之前死亡時適用
- 再轉繼承：繼承人於被繼承人之後死亡時適用

孫子女只能透過代位繼承或再轉繼承取得遺產，不能在父/母仍活著時直接繼承祖父母的遺產。

## 影響範圍

1. **Preset 資料**：`presets.ts` 中的「子女配偶離婚＋再婚」preset（preset_16）包含此 bug
2. **分享連結**：`url-state.ts` 的 `decodeState` 只做格式驗證，不做業務邏輯驗證，不合法資料可通過分享連結引入
3. **LocalStorage**：同理，已存儲的不合法資料也會被載入

## 修正方案：三層防禦

### 1. 計算引擎 (`src/lib/inheritance.ts`)

**修改位置**：`determineActiveOrder` 和 `slotHolders` 篩選邏輯

**修改內容**：新增條件排除有 `parentId` 但 status 非 `代位繼承`/`再轉繼承` 的人

```
if (p.parentId && p.status !== '代位繼承' && p.status !== '再轉繼承') return false;
```

此條件在兩處篩選中都需添加，確保孫子女（有 parentId 但 status 為一般繼承的子女）不會被計入 slot。

### 2. 驗證層 (`src/lib/validation.ts`)

**新增規則**：第一順位繼承人（子女）若有 `parentId`，其 status 必須是 `代位繼承` 或 `再轉繼承`

錯誤訊息：「一般繼承的子女不可有上層繼承人，如需代位或再轉繼承請調整狀態」

### 3. UI 層 (`src/components/PersonNode.tsx`)

**修改「+子女」按鈕顯示條件**

現有條件：
```
data.status !== '死亡絕嗣'
```

改為：
```
data.status === '死亡' || data.status === '再轉繼承'
```

只有死亡或再轉繼承的子女才能新增子女（代位/再轉繼承人）。

### 4. Preset 資料修正 (`src/lib/presets.ts`)

**修正 preset_16**：移除葉小明（`preset_16_5`），或將其改為被繼承人的直系子女（移除 `parentId`）。

因為此 preset 的目的是展示「子女配偶離婚＋再婚」情境，葉小明作為葉大華的孩子在法律上不繼承。最合理的修正是**移除葉小明**，因為他在這個繼承情境中無關。

### 5. 分享連結

目前 `decodeState` 不做業務邏輯驗證，這是 by design 的（格式正確即載入，由 `validate()` 在渲染時報錯）。修正 validation.ts 後，透過分享連結載入的不合法資料會在 UI 中顯示驗證錯誤，引導使用者修正。不需要額外修改 `url-state.ts`。

## TDD 測試計畫

### inheritance.test.ts 新增

```
describe('Grandchild with living parent should not inherit')
  - 配偶 + 2子女(活) + 1孫(一般繼承+parentId) → 孫應繼分 = 0，配偶與子女各 1/3
```

### validation.test.ts 新增

```
describe('一般繼承子女有 parentId')
  - 子女(一般繼承) + parentId 指向活著的子女 → 驗證報錯
```

### presets.test.ts

現有的 preset 測試（所有 preset 計算不拋錯 + shares 總和 = 1）在修正後仍需通過。
