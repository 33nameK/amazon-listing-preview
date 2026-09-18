import { WINDOWS, WINDOW_ORDER, TOLERANCE, EXPORT_QUALITY, EXPORT_FILENAME, GAPS, EXPORT_MARGIN, SKU_FONT_SIZE, SKU_FONT_WEIGHT, SKU_GAP, EXPORT_BG, EXPORT_BG_DEFAULT } from './config.js';
import { groupImages } from './group.js';

// ---------- 状态 ----------
// 三个独立存储，取代原工具「单一 images 数组 + 按尺寸分桶」。
const stores = { showcase: [], pcAplus: [], appAplus: [] };
let selectedShowcaseId = null;
const carouselSelections = new Map(); // `${variant}:${groupKey}` -> 当前张序号

const elements = {
  download: document.querySelector('#download-button'),
  clearAll: document.querySelector('#clear-all'),
  thumbs: document.querySelector('#listing-thumbs'),
  hero: document.querySelector('#listing-hero'),
  aplus: document.querySelector('#aplus-groups'),
  mobile: document.querySelector('#mobile-preview'),
};

// ---------- 工具函数 ----------
function imageNode(item, className = '') {
  const img = document.createElement('img');
  img.src = item.url;
  img.alt = '';
  img.className = className;
  img.loading = 'lazy';
  return img;
}

// 自动分类由 classify() 负责（见 addFiles），不再按窗口单独校验尺寸。

function readImage(file, windowKey) {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({
      id: `${file.name}-${file.lastModified}`,
      file,
      name: file.name,
      url,
      width: img.naturalWidth,
      height: img.naturalHeight,
      windowKey,
    });
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}

// ---------- 加载：单窗口上传，按尺寸自动分类 ----------
function classify(item) {
  for (const key of WINDOW_ORDER) {
    const exp = WINDOWS[key].expected;
    if (Math.abs(item.width - exp.w) <= TOLERANCE && Math.abs(item.height - exp.h) <= TOLERANCE) {
      return key;
    }
  }
  return null; // 不匹配任何一类
}

function flashNotice(msg) {
  let el = document.querySelector('#toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    el.style.cssText = 'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);background:#1b1e25;color:#e8eaed;border:1px solid #2a2e37;padding:10px 16px;border-radius:10px;font-size:13px;z-index:999;box-shadow:0 6px 20px rgba(0,0,0,.4);opacity:0;transition:opacity .2s;pointer-events:none;';
    document.body.append(el);
  }
  el.textContent = msg;
  requestAnimationFrame(() => { el.style.opacity = '1'; });
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.opacity = '0'; }, 2800);
}

async function addFiles(fileList) {
  const incoming = [...fileList].filter((f) => f.type.startsWith('image/'));
  const loaded = (await Promise.all(incoming.map((f) => readImage(f, null)))).filter(Boolean);
  const existingIds = new Set([
    ...stores.showcase, ...stores.pcAplus, ...stores.appAplus,
  ].map((it) => it.id));
  const fresh = loaded.filter((it) => !existingIds.has(it.id)); // 去重，避免重复添加

  const unrecognized = [];
  fresh.forEach((it) => {
    const key = classify(it);
    if (key) {
      it.windowKey = key;
      stores[key].push(it);
    } else {
      unrecognized.push(it);
    }
  });

  if (unrecognized.length) {
    flashNotice(`已忽略 ${unrecognized.length} 张：尺寸不匹配（需 1500×1500 / 1464×600 / 1200×900）`);
  }
  render();
}

// ---------- 渲染：单窗口缩略图（带分类角标） ----------
const CAT_VAR = { showcase: 'orange', pcAplus: 'purple', appAplus: 'blue' };
const CAT_NAME = { showcase: '橱窗 Showcase', pcAplus: 'A+ PC', appAplus: 'A+ APP' };

function renderAll() {
  const thumbsEl = document.querySelector('#thumbs-all');
  const countEl = document.querySelector('#count-all');
  const entries = [
    ...stores.showcase.map((it) => ({ it, key: 'showcase' })),
    ...stores.pcAplus.map((it) => ({ it, key: 'pcAplus' })),
    ...stores.appAplus.map((it) => ({ it, key: 'appAplus' })),
  ];
  countEl.textContent = `${entries.length} IMAGES · 橱窗${stores.showcase.length} / PC${stores.pcAplus.length} / APP${stores.appAplus.length}`;
  thumbsEl.replaceChildren();
  entries.forEach(({ it, key }) => {
    const cell = document.createElement('div');
    cell.className = 'window-thumb';
    cell.append(imageNode(it));
    const badge = document.createElement('span');
    badge.className = `cat-badge dot-${CAT_VAR[key]}`;
    badge.title = CAT_NAME[key];
    cell.append(badge);
    thumbsEl.append(cell);
  });
}

// ---------- 渲染：无缝模块 / 轮播组（PC / App 通用） ----------
// 每张图（或轮播组）就是一个 module，模块之间零缝隙竖排拼接。
// 轮播变体（A+3.1/A+3.2）在同一位置用左右箭头 + 底部圆点浮层切换。
function renderCarousel(group, variant) {
  const isMobile = variant === 'mobile';
  const selKey = `${variant}:${group.key}`;
  let current = carouselSelections.get(selKey) ?? 0;
  current = Math.min(current, Math.max(0, group.slides.length - 1));
  carouselSelections.set(selKey, current);

  const block = document.createElement('section');
  block.className = isMobile ? 'mobile-carousel-group' : 'aplus-group';

  const windowEl = document.createElement('div');
  windowEl.className = isMobile ? 'mobile-carousel-window' : 'carousel-window';
  windowEl.append(imageNode(group.slides[current], isMobile ? 'mobile-carousel-image' : 'aplus-image'));

  if (group.slides.length > 1) {
    const previous = document.createElement('button');
    previous.type = 'button';
    previous.className = 'carousel-arrow previous';
    previous.setAttribute('aria-label', '上一张');
    previous.textContent = '‹';
    previous.addEventListener('click', () => {
      carouselSelections.set(selKey, (current - 1 + group.slides.length) % group.slides.length);
      render();
    });

    const next = document.createElement('button');
    next.type = 'button';
    next.className = 'carousel-arrow next';
    next.setAttribute('aria-label', '下一张');
    next.textContent = '›';
    next.addEventListener('click', () => {
      carouselSelections.set(selKey, (current + 1) % group.slides.length);
      render();
    });

    windowEl.append(previous, next);

    // 圆点浮层叠在图片底部，不占竖向空间，保证拼接无缝
    const dots = document.createElement('div');
    dots.className = isMobile ? 'mobile-carousel-dots carousel-dots' : 'carousel-dots';
    group.slides.forEach((slide, index) => {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = `carousel-dot ${index === current ? 'is-active' : ''}`;
      dot.setAttribute('aria-label', `第 ${index + 1} 张`);
      dot.title = slide.name;
      dot.addEventListener('click', () => { carouselSelections.set(selKey, index); render(); });
      dots.append(dot);
    });
    windowEl.append(dots);
  }
  block.append(windowEl);
  return block;
}

function setFrame(frame, item, emptyText) {
  frame.replaceChildren();
  if (item) frame.append(imageNode(item, 'hero-image'));
  else frame.innerHTML = `<div class="empty-frame">${emptyText}</div>`;
}

// ---------- 渲染：预览 ----------
function renderPreview() {
  // 橱窗
  const showcase = stores.showcase;
  const selected = showcase.find((it) => it.id === selectedShowcaseId) ?? showcase[0];
  selectedShowcaseId = selected?.id ?? null;

  elements.thumbs.replaceChildren();
  showcase.forEach((it) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `thumb ${it.id === selectedShowcaseId ? 'is-selected' : ''}`;
    btn.title = it.name;
    btn.append(imageNode(it));
    btn.addEventListener('click', () => { selectedShowcaseId = it.id; render(); });
    elements.thumbs.append(btn);
  });
  setFrame(elements.hero, selected, '等待橱窗图');

  // A+ PC
  const pcGroups = groupImages(stores.pcAplus);
  if (!pcGroups.length) {
    elements.aplus.innerHTML = '<div class="aplus-empty">等待 A+ PC 图片</div>';
  } else {
    elements.aplus.replaceChildren(...pcGroups.map((g) => renderCarousel(g, 'desktop')));
  }

  // A+ APP
  const appGroups = groupImages(stores.appAplus);
  if (!appGroups.length) {
    elements.mobile.innerHTML = '<div class="mobile-empty">等待 A+ APP 图片</div>';
  } else {
    elements.mobile.replaceChildren(...appGroups.map((g) => renderCarousel(g, 'mobile')));
  }
}

function render() {
  renderAll();
  renderPreview();
}

// ---------- 清空 ----------
function clearWindow(key) {
  const keys = key === 'all' ? WINDOW_ORDER : [key];
  keys.forEach((k) => {
    stores[k].forEach((it) => URL.revokeObjectURL(it.url));
    stores[k] = [];
  });
  if (keys.includes('showcase')) selectedShowcaseId = null;
  render();
}

function clearAll() {
  WINDOW_ORDER.forEach((key) => {
    stores[key].forEach((it) => URL.revokeObjectURL(it.url));
    stores[key] = [];
  });
  selectedShowcaseId = null;
  carouselSelections.clear();
  document.querySelector('#file-all').value = '';
  document.querySelector('#folder-all').value = '';
  render();
}

// ---------- 导出单张拼合 JPG ----------
function loadExportImage(item) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = item.url;
  });
}

async function downloadPreview() {
  elements.download.disabled = true;
  elements.download.classList.add('is-loading');
  try {
    const showcase = stores.showcase;
    const pcGroups = groupImages(stores.pcAplus);
    const appGroups = groupImages(stores.appAplus);
    if (!showcase.length && !pcGroups.length && !appGroups.length) return;

    // 读取左侧 SKU 输入框
    const skuInput = document.querySelector('#sku-input');
    const skuValue = skuInput ? skuInput.value.trim() : '';
    const skuLabel = skuValue ? `SKU：${skuValue}` : '';

    const allItems = [
      ...showcase,
      ...pcGroups.flatMap((g) => g.slides),
      ...appGroups.flatMap((g) => g.slides),
    ];
    const loaded = new Map(await Promise.all(allItems.map(async (it) => [it.id, await loadExportImage(it)])));

    const { showcase: gS, aplus: gA, app: gApp, section: gSec } = GAPS;
    const margin = EXPORT_MARGIN;
    const showW = 1500;

    // 单组布局：多张变体（轮播图）左右并排，单张按原尺寸。整组高取最高张。
    const groupW = (g) => (g.slides.length === 1
      ? g.slides[0].width
      : g.slides.reduce((s, it) => s + it.width, 0) + gA * (g.slides.length - 1));
    const groupH = (g) => Math.max(...g.slides.map((it) => it.height));

    // 先算各段高度，避免事后改动 canvas.height 清空画布
    const showcaseHeight = showcase.reduce((t, it) => t + it.height, 0) + gS * Math.max(0, showcase.length - 1);

    const pcColumnHeight = pcGroups.length
      ? pcGroups.reduce((t, g) => t + groupH(g), 0) + gA * (pcGroups.length - 1)
      : 0;
    const appColumnHeight = appGroups.length
      ? appGroups.reduce((t, g) => t + groupH(g), 0) + gApp * (appGroups.length - 1)
      : 0;
    // 右列 = A+PC 段 + 段间距 + A+APP 段（橱窗图在左列，互不影响）
    const rightColumnHeight = pcColumnHeight + (appGroups.length ? gSec : 0) + appColumnHeight;

    const pcWidth = pcGroups.length ? Math.max(...pcGroups.map(groupW)) : 0;
    const appWidth = appGroups.length ? Math.max(...appGroups.map(groupW)) : 0;
    const rightColumnWidth = Math.max(pcWidth, appWidth);

    // 顶部 SKU 区：有内容才占高度
    const skuBlockHeight = skuLabel ? Math.round(SKU_FONT_SIZE * 1.3) : 0;
    const skuGap = skuLabel ? SKU_GAP : 0;

    // 内容区（橱窗+A+）整体向内缩 margin
    const contentLeft = margin;
    const contentTop = margin + skuBlockHeight + skuGap;
    const aplusX = contentLeft + showW + gS; // 右列起始 x

    const contentWidth = aplusX + rightColumnWidth - contentLeft;
    const contentHeight = Math.max(showcaseHeight, rightColumnHeight);

    // 画布 = 内容 + 四周 margin
    const canvasWidth = contentLeft + contentWidth + margin;
    const canvasHeight = contentTop + contentHeight + margin;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    // 读取导出底色选择（灰白色 / 纯黑色），SKU 文字随之黑白反相
    let bgKey = EXPORT_BG_DEFAULT;
    document.querySelectorAll('input[name="export-bg"]').forEach((r) => { if (r.checked) bgKey = r.value; });
    const bgSetting = EXPORT_BG[bgKey] || EXPORT_BG[EXPORT_BG_DEFAULT];

    ctx.fillStyle = bgSetting.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 顶部 SKU 文字：粗体、指定字号、左对齐贴左边距；颜色随底色自动反转
    if (skuLabel) {
      ctx.fillStyle = bgSetting.sku;
      ctx.font = `${SKU_FONT_WEIGHT} ${SKU_FONT_SIZE}px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif`;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(skuLabel, contentLeft, margin);
    }

    // 橱窗列（左）
    let y = contentTop;
    showcase.forEach((it) => {
      ctx.drawImage(loaded.get(it.id), contentLeft, y, it.width, it.height);
      y += it.height + gS;
    });

    // A+ PC（右列上部分，按编号竖排；同一编号的多张变体左右并排）
    let ay = contentTop;
    pcGroups.forEach((g) => {
      if (g.slides.length === 1) {
        const it = g.slides[0];
        ctx.drawImage(loaded.get(it.id), aplusX, ay, it.width, it.height);
      } else {
        let gx = aplusX;
        g.slides.forEach((it) => {
          ctx.drawImage(loaded.get(it.id), gx, ay, it.width, it.height);
          gx += it.width + gA;
        });
      }
      ay += groupH(g) + gA;
    });

    // A+ APP（右列下部分，紧接 PC 之后；同一编号多张变体左右并排）
    let by = contentTop + pcColumnHeight + (appGroups.length ? gSec : 0);
    appGroups.forEach((g) => {
      if (g.slides.length === 1) {
        const it = g.slides[0];
        ctx.drawImage(loaded.get(it.id), aplusX, by, it.width, it.height);
      } else {
        let gx = aplusX;
        g.slides.forEach((it) => {
          ctx.drawImage(loaded.get(it.id), gx, by, it.width, it.height);
          gx += it.width + gA;
        });
      }
      by += groupH(g) + gApp;
    });

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', EXPORT_QUALITY));
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = EXPORT_FILENAME;
    link.click();
    URL.revokeObjectURL(url);
  } finally {
    elements.download.disabled = false;
    elements.download.classList.remove('is-loading');
  }
}

// ---------- 事件绑定：单窗口上传 ----------
(function bindUpload() {
  const drop = document.querySelector('[data-drop="all"]');
  const fileInput = document.querySelector('#file-all');
  const folderInput = document.querySelector('#folder-all');

  fileInput.addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });
  folderInput.addEventListener('change', (e) => { addFiles(e.target.files); e.target.value = ''; });

  drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('is-dragging'); });
  drop.addEventListener('dragleave', () => drop.classList.remove('is-dragging'));
  drop.addEventListener('drop', (e) => {
    e.preventDefault();
    drop.classList.remove('is-dragging');
    addFiles(e.dataTransfer.files);
  });
  drop.addEventListener('click', (e) => {
    if (e.target === drop || e.target.classList.contains('window-hint')) fileInput.click();
  });
})();

document.querySelectorAll('[data-clear]').forEach((btn) => {
  btn.addEventListener('click', () => clearWindow(btn.dataset.clear));
});
elements.clearAll.addEventListener('click', clearAll);
elements.download.addEventListener('click', downloadPreview);

render();
