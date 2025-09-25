# AlphaTab 暗色主题适配调查记录

## 现象描述

在 AlphaTab 组件中，观察到以下视觉差异：

- **原生加载暗色**：乐谱元素显得更亮、更白，缺乏足够的对比度。
- **先切到明色再切到暗色**：乐谱元素显得更加灰绿、暗淡，视觉上更协调。

## 原因分析

### 主题变量定义

- 亮色模式：`--text-secondary = #4a6b6a`（深青绿）
- 暗色模式：`--text-secondary = #c7d4d2`（浅灰绿），`--text-tertiary = #95a7a4`（更暗灰绿）

### 着色流程问题

1. **初始加载时**：
   - React 组件 `isDarkMode` 初始值为 `false`。
   - `scoreLoaded` 事件触发时，使用 `false` 调用 `applyScoreColors`，进入 `resetColors` 路径。
   - 乐谱使用 alphaTab 默认的亮白样式。

2. **异步主题检测**：
   - `useEffect` 从 `localStorage` 或 `data-theme` 读取暗色设置，将 `isDarkMode` 更新为 `true`。
   - DOM 切换到暗色，但如果重绘未及时，视觉上仍显示亮白样式。

3. **手动切换时**：
   - 触发 `applyScoreColors(true)`，所有元素统一染成 `#c7d4d2`，呈现灰绿效果。

### 对比度不足

- 之前所有元素统一使用 `#c7d4d2`，导致缺乏层次感。
- 暗色模式下需要区分不同元素的颜色以提高可读性。

## 调整方案

### 1. 提升暗色配色对比度

- 恢复使用 `primaryTone`（`--text-secondary`）和 `secondaryTone`（`--text-tertiary`）。
- Score 级别元素（标题、和弦图等）使用较亮的 `primaryTone`。
- 其他元素（艺术家、版权等）使用较暗的 `secondaryTone`。
- Track 级别：TrackName 等使用 `primaryTone`，StringTuning 使用 `secondaryTone`。

### 2. 统一首屏与切换逻辑

- 在 `AlphaTabApp.tsx` 中，将 `isDarkMode` 初始化为同步读取主题状态：

  ```tsx
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    if (typeof document === "undefined") return false;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return document.documentElement.getAttribute("data-theme") === "dark";
  });
  ```

- 确保 `scoreLoaded` 首次就拿到正确的暗色标志，避免异步延迟导致的视觉不一致。

### 3. 代码变更

- `AlphaTabPlayer.tsx`：恢复 `secondaryTone` 定义和使用。
- `AlphaTabApp.tsx`：修改 `isDarkMode` 初始化逻辑。

## 验证结果

- 构建通过，无类型错误。
- 首屏暗色与切换后保持一致。
- 乐谱元素具有更好的对比度和层次感。

## 后续建议

- 监控用户反馈，调整颜色值以优化可读性。
- 考虑添加主题过渡动画，减少切换时的突兀感。
- 如果需要更精细的控制，可以为每个元素级别定义专门的 CSS 变量。