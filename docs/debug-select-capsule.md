# AlphaTab Select 胶囊配色调整（Debug Note）

日期：2025-09-25

## 背景

AlphaTab 工具栏中两个 select（Zoom 与 Layout）使用了圆角胶囊容器。之前容器与工具栏均采用半透明表面色，叠加后视觉偏暗（double alpha stacking）。

## 目标

- 使收起状态下的 select 胶囊底色与工具栏其它控件保持一致的明度层级。
- 允许对 select 胶囊的底色/文字进行独立、精准的主题控制，避免影响其它控件。

## 变更摘要

1. 在 `AlphaTabApp.tsx` 的内联样式映射中新增变量（亮/暗主题各自定义）：
   - `--at-select-surface`: 专用于 select 胶囊底色
   - `--at-select-text`: 专用于 select 胶囊文字

   默认取值：
   - Light: `--at-select-surface: var(--surface-strong)`, `--at-select-text: var(--control-text)`
   - Dark: `--at-select-surface: var(--surface)`, `--at-select-text: var(--control-text)`

2. 在 `AlphaTabPlayer.tsx` 中：
   - 胶囊容器背景从 `--at-control-surface` 切换为 `--at-select-surface`。
   - select 元素文字/背景 CSS 改为使用 `--at-select-text` 与 `--at-select-surface`。

## 涉及文件

- `src/components/react/AlphaTabApp.tsx`
- `src/components/react/AlphaTabPlayer.tsx`

## 可调参数（站点主题层）

若需微调整体视觉，可在 `src/styles/global.css` 中改动以下基础变量（会影响站点多处）：

- `--surface`, `--surface-strong`
- `--control-text`

如需“仅微调 AlphaTab select 胶囊”，请在 `AlphaTabApp.tsx` 内联样式处直接调整：

- `--at-select-surface`
- `--at-select-text`

建议暗色下若仍显厚重，可尝试：

- `--at-select-surface: color-mix(in srgb, var(--surface) 92%, transparent)`
- 或降低边框存在感（`--at-border-color` 的 mix 比例），但此变量会影响 AlphaTab 其它边框。

## 验收方式

- 浅/暗主题下观察 Zoom 与 Layout 胶囊；收起状态应不再受双层半透明叠加影响而“变暗”。
- 展开下拉面板仍遵循主题变量，文字对比度良好。

## 备注

- 本次为 AlphaTab 层新增的专用变量，不影响站点其它区域。若未来期望统一到站点全局，可在 `global.css` 提供同名变量并在 `AlphaTabApp.tsx` 中透传。
