// 配置区：尺寸 / 容差 / 导出参数。你日后要调只改这里，不用动逻辑。
// 窗口 key 必须与 app.js 里的 stores 键、index.html 的 data-window 一致。

export const WINDOWS = {
  showcase: {
    key: 'showcase',
    label: '橱窗 Showcase',
    expected: { w: 1500, h: 1500 },
    colorVar: 'orange',
  },
  pcAplus: {
    key: 'pcAplus',
    label: 'A+ PC',
    expected: { w: 1464, h: 600 },
    colorVar: 'purple',
  },
  appAplus: {
    key: 'appAplus',
    label: 'A+ APP',
    expected: { w: 1200, h: 900 },
    colorVar: 'blue',
  },
};

// 窗口排列顺序（上传区从上到下）
export const WINDOW_ORDER = ['showcase', 'pcAplus', 'appAplus'];

// 尺寸容差：拖入图的宽/高与 expected 偏差在此范围内给黄色提示，但依然放入窗口。
export const TOLERANCE = 40;

// 导出参数
export const EXPORT_QUALITY = 0.94;
export const EXPORT_FILENAME = 'amazon-listing-preview.jpg';

// 拼合间距（像素）。aplus / app 已设为 0 —— 按编号无缝拼接，无竖向缝隙。
export const GAPS = {
  showcase: 50, // 橱窗竖排间距
  aplus: 0, // A+PC 各模块/变体之间无缝
  app: 0, // A+APP 各模块/变体之间无缝
  section: 50, // PC 段与 App 段之间的留白
};

// 导出 JPG 四周留白（像素）
export const EXPORT_MARGIN = 100;

// 导出图顶部 SKU 文字样式
export const SKU_FONT_SIZE = 200; // 字号
export const SKU_FONT_WEIGHT = 700; // 粗体
export const SKU_GAP = 100; // SKU 与下方内容之间的间距

// 导出底色选项：灰白色 / 中灰色 / 纯黑色。SKU 文字随之自动黑白反相。
export const EXPORT_BG = {
  light: { bg: '#f2f2f2', sku: '#111111', label: '灰白色 #f2f2f2' }, // 浅底 → 黑字
  middle: { bg: '#777777', sku: '#ffffff', label: '中灰色 #777777' }, // 中灰底 → 白字
  dark: { bg: '#000000', sku: '#ffffff', label: '纯黑色 #000000' }, // 黑底 → 白字
};
export const EXPORT_BG_DEFAULT = 'light'; // 默认灰白色 + 黑字
