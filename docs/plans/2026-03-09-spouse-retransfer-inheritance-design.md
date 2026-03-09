# 再轉繼承人配偶支援設計

## 背景

使用者回報：當繼承人（如李璧秀）晚於被繼承人死亡（再轉繼承），其配偶（後配偶）應繼承其份額，後配偶再死亡時，後配偶的子女應進一步繼承。現行系統中 `子女之配偶` 為純視覺節點，完全不參與計算，無法表達此法律關係。

## 法律依據

依民法第 1138、1147、1148 條（當然繼承主義），再轉繼承人死亡後，其份額由「其配偶 + 依 1138 條順位的繼承人」共同繼承。配偶有合法繼承權，與代位繼承（僅限直系血親卑親屬）不同。

## 範圍

**已確認需求：**
- 所有 `再轉繼承` 狀態的繼承人（不限 `子女`，含 `兄弟姊妹` 等）的配偶，均應可作為真實繼承參與者
- 配偶 sub-heir 支援狀態：`一般繼承`（在世）、`再轉繼承`（也死亡，可再掛子女）、`拋棄繼承`
- 視覺上需能區分子女屬於哪任配偶（新增 `coParentId` 欄位）

## 資料模型變更（`src/types/models.ts`）

```typescript
export interface Person {
  // ... 現有欄位 ...
  coParentId?: string; // 選填：視覺用，指向配偶節點 id，表示共同生親關係
}
```

`coParentId` 僅供 layout 使用，**計算引擎完全忽略此欄位**。

## 驗證規則變更（`src/lib/validation.ts`）

### 移除現有限制

```typescript
// 移除（line 88–90）：
if (p.relation === '配偶' && p.parentId) {
  errors.push({ personId: p.id, field: 'parentId', message: '配偶不可作為代位或再轉繼承人' });
}
```

### 替換為精確限制

```typescript
if (p.relation === '配偶' && p.parentId) {
  const parent = personMap.get(p.parentId);
  // parent 必須是再轉繼承狀態
  if (!parent || parent.status !== '再轉繼承') {
    errors.push({ personId: p.id, field: 'parentId', message: '配偶 sub-heir 的上層必須是再轉繼承狀態' });
  }
  // 自身狀態限制
  if (!['一般繼承', '再轉繼承', '拋棄繼承'].includes(p.status)) {
    errors.push({ personId: p.id, field: 'status', message: '再轉繼承人的配偶狀態只允許一般繼承、再轉繼承或拋棄繼承' });
  }
}
```

### 配偶唯一性驗證調整

`currentSpouseCount` 計數需區分 root 配偶和 sub-heir 配偶，使用 `parentId ?? '__root__'` 作為 key（現行邏輯已如此，確認不需額外修改）。

## 計算引擎變更（`src/lib/inheritance.ts`）

### 問題分析

`distributeShare` 依 `p.status === status` 過濾 sub-heirs：
- 配偶 sub-heir 若 `status === '再轉繼承'`：已自動被撈到 ✓
- 配偶 sub-heir 若 `status === '一般繼承'`：被 status filter 漏掉 ✗

### 修改一：`distributeShare`

在分配 `再轉繼承` 份額時，額外加入 `一般繼承` 的配偶 sub-heir：

```typescript
// 新增：再轉繼承分配時，也納入在世配偶 sub-heir
const livingSpouseSubHeirs = status === '再轉繼承'
  ? persons.filter(
      p => p.relation === '配偶' &&
           p.parentId === parentId &&
           p.status === '一般繼承' &&
           !visited.has(p.id)
    )
  : [];

const allSubHeirs = [...directSubHeirs, ...livingSpouseSubHeirs, ...deadIntermediates];
```

現有的 `pushShareResult` / `pushZeroResult` 邏輯**不需修改**：
- 在世配偶無 sub-heirs，自然走 `pushShareResult` 路徑
- 死亡配偶（`再轉繼承`）已在 `directSubHeirs` 中，遞迴照常運作

### 修改二：`determineActiveOrder` 與 `slotHolders`（共 2 處）

判斷 `再轉繼承` root 是否有效（有 sub-heirs）時，需納入在世配偶：

```typescript
// 舊
persons.some(sub => sub.status === '再轉繼承' && sub.parentId === p.id)

// 新
persons.some(sub =>
  sub.parentId === p.id &&
  (sub.status === '再轉繼承' ||
   (sub.relation === '配偶' && sub.status === '一般繼承'))
)
```

## UI 元件變更

### PersonNode（`src/components/PersonNode.tsx`）

**`+子女` / `+配偶` 按鈕顯示條件擴展：**

```typescript
// 舊：只有 子女 relation 才顯示
(data.relation === '子女' && (data.status === '死亡' || ...))

// 新：任何 再轉繼承 狀態節點均顯示（含 兄弟姊妹 等）
data.status === '再轉繼承'
// 加上：配偶 sub-heir 若為 再轉繼承，也顯示 +子女 按鈕
data.relation === '配偶' && !!data.parentId && data.status === '再轉繼承'
```

**`+配偶` 按鈕改為新增 `配偶 + parentId`**（取代 `子女之配偶`）。

`hasCurrentSpouse` 判斷更新：偵測同層是否已有 `relation === '配偶' && parentId === this.id` 且非拋棄繼承的節點。

### PersonEditor（`src/components/PersonEditor.tsx`）

**`coParentId` 選填欄位：**
當編輯的 person 是某 `再轉繼承` 者的 sub-heir 子女時，顯示「生親配偶（選填）」下拉選單，列出同層的配偶 sub-heirs（同 parentId 且 relation === '配偶' 的節點）。

**配偶 sub-heir 可用狀態過濾：**
`computeAvailableStatuses` 需針對 `配偶 + parentId` 限制為 `一般繼承`、`再轉繼承`、`拋棄繼承`。

### tree-layout（`src/lib/tree-layout.ts`）

**配偶 sub-heir 定位：**
位於 parent 再轉繼承節點的左側，多位配偶垂直堆疊（與 decedent 多配偶的 layout 邏輯一致）。

**子女分組：**
有 `coParentId` 的子女，水平靠近對應配偶一側排列；無 `coParentId` 的子女置中。

**額外細虛線 edge：**
從配偶節點到其 `coParentId` 所指子女群組，畫一條細虛線（`strokeDasharray: '3,3'`、淡色），與繼承線視覺區分。

```
  [前配偶]─ ─ ─ ─[李璧秀]─ ─ ─[後配偶（再轉）]
       ╎               │               ╎
     [A][B]        [無coParent]       [C][D]
     細虛線                            細虛線
                                        │ 繼承線
                                      [C'][D']
```

## 測試案例（`src/lib/__tests__/inheritance.test.ts`）

新增 describe block `'配偶作為再轉繼承 sub-heir'`：

### Test 1：再轉繼承人有在世配偶
```
甲（再轉繼承） → 子女 A、子女 B、配偶乙（一般繼承）
```
預期：A = 1/3，B = 1/3，乙 = 1/3

### Test 2：再轉繼承人的配偶也死亡（核心場景）
```
甲（再轉繼承） → 子女 A、子女 B、配偶乙（再轉繼承）
乙（再轉繼承） → 子女 C、子女 D
```
預期：A = 1/3，B = 1/3，乙 = 0，C = 1/6，D = 1/6

### Test 3：配偶 sub-heir 拋棄繼承
```
甲（再轉繼承） → 子女 A、子女 B、配偶乙（拋棄繼承）
```
預期：乙 = 0，A = 1/2，B = 1/2

### Test 4：兄弟姊妹再轉繼承，僅有配偶（無子女）
```
兄弟姊妹丙（再轉繼承） → 配偶丁（一般繼承）
```
預期：丁 = 丙應得之全部份額

## 向下相容

- 現有 `子女之配偶` 節點繼續維持顯示，不參與計算（現行行為不變）
- URL 解碼舊有 `子女之配偶` 資料可正常載入
- `coParentId` 為 optional，舊資料無此欄位時 layout 退回預設排列

## 不在本次範圍內

- 配偶 sub-heir 的配偶（三層以上的橫向鏈）
- 前配偶的節點自動產生（使用者手動新增前配偶的視覺節點即可）
