const ARTICLE_IMAGE_BASE = 'https://pub-14eaf4c4a9324927bf2879a272de972a.r2.dev';
const EDITOR_STORAGE_KEY = 'anu-article-editor-v2';
let nextBlockNumber = 4;

const state = {
  previewReady: false,
  viewportWidth: 1440,
  selectedBlockId: 'b1',
  meta: {
    englishTitle: 'What Makes a Good Bowl',
    koreanTitle: '손의 경험 | 좋은 보울을 만드는 요소',
    status: '등록 중',
    code: 'ARTI26-001',
    category: 'Craft · Guide',
    deck: '손의 촉감, 무게감, 곡선이 좋은 보울을 완성하는 방식을 살펴봅니다.',
  },
  blocks: [
    {
      id: 'b1',
      type: 'text',
      text: '손에 닿는 감각은 보울을 고르는 가장 직관적인 기준입니다. 좋은 보울은 음식이 담기는 순간뿐 아니라, 비어 있을 때의 무게와 곡선에서도 균형을 드러냅니다.',
    },
    {
      id: 'b2',
      type: 'image',
      layout: 'img-m',
      src: '/2026/arti26-001/cover.jpg',
      caption: '사진 © ANU',
    },
    {
      id: 'b3',
      type: 'quote',
      text: '가장 좋은 도구는 손이 먼저 기억합니다.',
    },
  ],
};

const els = {
  englishTitle: document.getElementById('englishTitle'),
  koreanTitle: document.getElementById('koreanTitle'),
  articleStatus: document.getElementById('articleStatus'),
  articleCode: document.getElementById('articleCode'),
  articleCategory: document.getElementById('articleCategory'),
  articleDeck: document.getElementById('articleDeck'),
  blockList: document.getElementById('blockList'),
  copyHtml: document.getElementById('copyHtml'),
  copyJson: document.getElementById('copyJson'),
  deviceFrame: document.getElementById('deviceFrame'),
  editorPageId: document.getElementById('editorPageId'),
  gasEndpoint: document.getElementById('gasEndpoint'),
  gasState: document.getElementById('gasState'),
  gasToken: document.getElementById('gasToken'),
  importJson: document.getElementById('importJson'),
  importJsonInput: document.getElementById('importJsonInput'),
  previewFrame: document.getElementById('previewFrame'),
  saveDraft: document.getElementById('saveDraft'),
  saveState: document.getElementById('saveState'),
  viewportLabel: document.getElementById('viewportLabel'),
  viewportRange: document.getElementById('viewportRange'),
};

function exportArticleHtml(blocks) {
  return `<div class="arti-body">
${blocks.map(blockToHtml).filter(Boolean).join('\n\n')}
</div>`;
}

function blockToHtml(block) {
  if (block.type === 'text') {
    return `<div class="arti-block arti-block--narrow">
  <p class="basic-p">${lineBreaks(block.text)}</p>
</div>`;
  }

  if (block.type === 'heading') {
    return `<div class="arti-block arti-block--narrow">
  <h2 class="mid-title">${escapeHtml(block.text)}</h2>
</div>`;
  }

  if (block.type === 'image') {
    const layout = block.layout || 'img-m';
    if (layout === 'img-l') {
      return `<div class="arti-block arti-block--full" data-reveal>
  <div class="img-l">
    <img src="${escapeAttr(normalizeImageUrl(block.src))}" alt="">
  </div>${captionHtml(block.caption, 'arti-caption--inset')}
</div>`;
    }
    if (layout === 'title-img-m') {
      return `<div class="arti-block arti-block--full" data-reveal>
  <div class="title-img-m">
    <img src="${escapeAttr(normalizeImageUrl(block.src))}" alt="">${captionHtml(block.caption, 'arti-caption--inset')}
  </div>
</div>`;
    }

    return `<div class="arti-block ${layout === 'img-s' ? 'arti-block--narrow' : 'arti-block--wide'}" data-reveal>
  <div class="${escapeAttr(block.layout || 'img-m')}">
    <img src="${escapeAttr(normalizeImageUrl(block.src))}" alt="">${captionHtml(block.caption)}
  </div>
</div>`;
  }

  if (block.type === 'duo') {
    const items = (block.items || []).filter(item => item && item.src).map(item => `    <div class="img-m-duo__item">
      <img src="${escapeAttr(normalizeImageUrl(item.src))}" alt="">${captionHtml(item.caption)}
    </div>`).join('\n');

    return `<div class="arti-block arti-block--duo-m" data-reveal>
  <div class="img-m-duo">
${items}
  </div>
</div>`;
  }

  if (block.type === 'quote') {
    return `<div class="arti-block arti-block--wide" data-reveal>
  <p class="emph-p">${lineBreaks(block.text)}</p>
</div>`;
  }

  if (block.type === 'slide') {
    const images = (block.images || []).filter(Boolean).map((src, index) => `
        <div class="img-slide__item${index === 0 ? ' is-active' : ''}">
          <img src="${escapeAttr(normalizeImageUrl(src))}" alt="">
          ${block.caption ? `<p hidden class="arti-caption">${escapeHtml(block.caption)}</p>` : ''}
        </div>`).join('');

    return `<div class="arti-block arti-block--wide" data-reveal>
  <div class="img-slide" data-slide>
    <div class="img-slide__track-wrap">
      <div class="img-slide__track">${images}
      </div>
      <button class="img-slide__btn--prev" type="button" aria-label="이전 슬라이드"></button>
      <button class="img-slide__btn--next" type="button" aria-label="다음 슬라이드"></button>
    </div>
  </div>
</div>`;
  }

  if (block.type === 'video') {
    const media = videoEmbedHtml(block.url);
    if (!media) return '';
    return `<div class="arti-block arti-block--wide" data-reveal>
  <div class="arti-video">
    ${media}
  </div>${captionHtml(block.caption)}
</div>`;
  }

  if (block.type === 'credit') {
    const rows = (block.rows || []).filter(Boolean).map(row => {
      const [label, ...rest] = row.split(':');
      const content = rest.join(':').trim();
      if (!content) return `  <div class="arti-credit__row">${escapeHtml(row)}</div>`;
      return `  <div class="arti-credit__row"><span class="arti-credit__label">${escapeHtml(label.trim())}</span>${escapeHtml(content)}</div>`;
    }).join('\n');

    return `<div class="arti-block arti-block--narrow">
  <div class="arti-credit">
${rows}
  </div>
</div>`;
  }

  return '';
}

function renderBlockList() {
  els.blockList.innerHTML = state.blocks.map((block, index) => blockEditorHtml(block, index)).join('');
}

function blockEditorHtml(block, index) {
  const selected = block.id === state.selectedBlockId ? ' is-selected' : '';
  const label = block.type.charAt(0).toUpperCase() + block.type.slice(1);

  return `<article class="block-card${selected}" data-id="${block.id}" data-type="${block.type}">
    <div class="block-card__head">
      <div class="block-card__meta">
        <strong>${label}</strong>
        <span>${String(index + 1).padStart(2, '0')}</span>
      </div>
      <div class="block-actions" aria-label="Block actions">
        <button type="button" data-block-action="moveUp">Up</button>
        <button type="button" data-block-action="moveDown">Down</button>
        <button type="button" data-block-action="duplicate">Copy</button>
        <button type="button" data-block-action="delete">Delete</button>
      </div>
    </div>
    <div class="block-card__body">
      ${blockFieldsHtml(block)}
    </div>
  </article>`;
}

function blockFieldsHtml(block) {
  if (block.type === 'image') {
    const imageUrl = normalizeImageUrl(block.src);
    return `<div class="image-grid">
      <div class="image-thumb"><img src="${escapeAttr(imageUrl)}" alt="" onerror="this.hidden=true"></div>
      <div class="block-card__body">
        <label class="field">
          <span>R2 path or URL</span>
          <input data-key="src" value="${escapeAttr(block.src)}">
        </label>
        <label class="field">
          <span>Layout class</span>
          <select data-key="layout">
            ${optionHtml('img-m', block.layout)}
            ${optionHtml('img-l', block.layout)}
            ${optionHtml('img-s', block.layout)}
            ${optionHtml('title-img-m', block.layout)}
          </select>
        </label>
        <label class="field">
          <span>Caption</span>
          <input data-key="caption" value="${escapeAttr(block.caption)}">
        </label>
      </div>
    </div>`;
  }

  if (block.type === 'duo') {
    return `<label class="field">
      <span>Images, one per line. Use path | caption</span>
      <textarea data-key="items">${escapeHtml(itemsToLines(block.items))}</textarea>
    </label>`;
  }

  if (block.type === 'slide') {
    return `<label class="field">
      <span>Image paths, one per line</span>
      <textarea data-key="images">${escapeHtml((block.images || []).join('\n'))}</textarea>
    </label>
    <label class="field">
      <span>Caption</span>
      <input data-key="caption" value="${escapeAttr(block.caption)}">
    </label>`;
  }

  if (block.type === 'video') {
    return `<label class="field">
      <span>YouTube or MP4 URL</span>
      <input data-key="url" value="${escapeAttr(block.url)}">
    </label>
    <label class="field">
      <span>Caption</span>
      <input data-key="caption" value="${escapeAttr(block.caption)}">
    </label>`;
  }

  if (block.type === 'credit') {
    return `<label class="field">
      <span>Rows, one per line. Use label: name</span>
      <textarea data-key="rows">${escapeHtml((block.rows || []).join('\n'))}</textarea>
    </label>`;
  }

  return `<label class="field">
    <span>${block.type === 'heading' ? 'Heading' : block.type === 'quote' ? 'Quote' : 'Text'}</span>
    <textarea data-key="text">${escapeHtml(block.text)}</textarea>
  </label>`;
}

function bindEvents() {
  ['englishTitle', 'koreanTitle', 'articleStatus', 'articleCode', 'articleCategory', 'articleDeck'].forEach(id => {
    els[id].addEventListener('input', syncMetaFromInputs);
  });

  document.querySelectorAll('[data-add]').forEach(button => {
    button.addEventListener('click', () => addBlock(button.dataset.add));
  });

  document.querySelectorAll('[data-gas-action]').forEach(button => {
    button.addEventListener('click', () => runGasAction(button.dataset.gasAction));
  });

  els.blockList.addEventListener('click', event => {
    const button = event.target.closest('[data-block-action]');
    if (!button) return;
    const card = button.closest('.block-card');
    if (!card) return;
    handleBlockAction(card.dataset.id, button.dataset.blockAction);
  });

  els.blockList.addEventListener('input', event => {
    const card = event.target.closest('.block-card');
    if (!card || !event.target.dataset.key) return;
    const block = state.blocks.find(item => item.id === card.dataset.id);
    if (!block) return;

    const key = event.target.dataset.key;
    if (key === 'images' || key === 'rows') {
      block[key] = linesFromText(event.target.value);
    } else if (key === 'items') {
      block[key] = parseMediaItems(event.target.value);
    } else {
      block[key] = event.target.value;
    }

    markSelected(block.id);
    updatePreview();
    markSaved('Editing');
  });

  els.blockList.addEventListener('focusin', event => {
    const card = event.target.closest('.block-card');
    if (card) markSelected(card.dataset.id);
  });

  document.querySelectorAll('.segmented--preview button').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('.segmented--preview button').forEach(item => item.classList.remove('is-active'));
      button.classList.add('is-active');
      setViewport(button.dataset.width);
    });
  });

  els.viewportRange.addEventListener('input', event => {
    document.querySelectorAll('.segmented--preview button').forEach(item => item.classList.remove('is-active'));
    setViewport(event.target.value);
  });

  els.copyHtml.addEventListener('click', copyCurrentHtml);
  els.copyJson.addEventListener('click', copyCurrentJson);
  els.importJson.addEventListener('click', () => els.importJsonInput.click());
  els.importJsonInput.addEventListener('change', importJsonFile);
  els.saveDraft.addEventListener('click', saveDraft);

  els.previewFrame.addEventListener('load', () => {
    state.previewReady = true;
    updatePreview();
  });

  window.addEventListener('message', event => {
    if (event.data && event.data.type === 'ANU_ARTICLE_PREVIEW_READY') {
      state.previewReady = true;
      updatePreview();
    }
  });
}

function addBlock(type) {
  const block = createBlock(type);
  state.blocks.push(block);
  state.selectedBlockId = block.id;
  renderBlockList();
  updatePreview();
  markSaved('Editing');
}

function handleBlockAction(blockId, action) {
  const index = state.blocks.findIndex(item => item.id === blockId);
  if (index === -1) return;

  if (action === 'moveUp' && index > 0) {
    [state.blocks[index - 1], state.blocks[index]] = [state.blocks[index], state.blocks[index - 1]];
    state.selectedBlockId = blockId;
  } else if (action === 'moveDown' && index < state.blocks.length - 1) {
    [state.blocks[index + 1], state.blocks[index]] = [state.blocks[index], state.blocks[index + 1]];
    state.selectedBlockId = blockId;
  } else if (action === 'duplicate') {
    const copy = cloneBlock(state.blocks[index]);
    state.blocks.splice(index + 1, 0, copy);
    state.selectedBlockId = copy.id;
  } else if (action === 'delete') {
    if (state.blocks.length === 1) {
      markSaved('Keep one block');
      return;
    }
    state.blocks.splice(index, 1);
    state.selectedBlockId = state.blocks[Math.max(0, index - 1)].id;
  }

  renderBlockList();
  updatePreview();
  markSaved('Editing');
}

function cloneBlock(block) {
  return Object.assign(JSON.parse(JSON.stringify(block)), {
    id: createBlockId(),
  });
}

function createBlock(type) {
  const id = createBlockId();
  if (type === 'image') {
    const codeSlug = slugArticleCode(state.meta.code);
    return {
      id,
      type,
      layout: 'img-m',
      src: `/2026/${codeSlug}/image-01.jpg`,
      caption: '',
    };
  }

  if (type === 'duo') {
    const codeSlug = slugArticleCode(state.meta.code);
    return {
      id,
      type,
      items: [
        { src: `/2026/${codeSlug}/duo-01.jpg`, caption: '' },
        { src: `/2026/${codeSlug}/duo-02.jpg`, caption: '' },
      ],
    };
  }

  if (type === 'slide') {
    const codeSlug = slugArticleCode(state.meta.code);
    return {
      id,
      type,
      images: [`/2026/${codeSlug}/slide-01.jpg`, `/2026/${codeSlug}/slide-02.jpg`],
      caption: '',
    };
  }

  if (type === 'video') {
    return {
      id,
      type,
      url: '',
      caption: '',
    };
  }

  if (type === 'credit') {
    return {
      id,
      type,
      rows: ['글: ANU', '사진: ANU'],
    };
  }

  return {
    id,
    type,
    text: type === 'heading' ? '새 소제목' : type === 'quote' ? '강조하고 싶은 문장을 입력하세요.' : '본문을 입력하세요.',
  };
}

function syncMetaFromInputs() {
  state.meta = {
    englishTitle: els.englishTitle.value,
    koreanTitle: els.koreanTitle.value,
    status: els.articleStatus.value,
    code: els.articleCode.value,
    category: els.articleCategory.value,
    deck: els.articleDeck.value,
  };
  updatePreview();
  markSaved('Editing');
}

function updatePreview() {
  const payload = {
    meta: state.meta,
    html: exportArticleHtml(state.blocks),
  };

  if (!state.previewReady || !els.previewFrame.contentWindow) return;
  els.previewFrame.contentWindow.postMessage({
    type: 'ANU_ARTICLE_PREVIEW_UPDATE',
    payload,
  }, '*');
}

function setViewport(width) {
  state.viewportWidth = Number(width);
  els.viewportRange.value = state.viewportWidth;
  els.viewportLabel.textContent = `${state.viewportWidth}px`;
  els.deviceFrame.style.width = `${state.viewportWidth}px`;
}

function markSelected(blockId) {
  if (state.selectedBlockId === blockId) return;
  state.selectedBlockId = blockId;
  document.querySelectorAll('.block-card').forEach(card => {
    card.classList.toggle('is-selected', card.dataset.id === blockId);
  });
}

async function copyCurrentHtml() {
  const html = exportArticleHtml(state.blocks);
  const copied = await writeClipboard(html);
  markSaved(copied ? 'HTML copied' : 'Copy failed');
}

async function copyCurrentJson() {
  const copied = await writeClipboard(JSON.stringify(buildEditorPayload(), null, 2));
  markSaved(copied ? 'JSON copied' : 'Copy failed');
}

async function writeClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (error) {
    // Fall through to the selection-based fallback.
  }

  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.setAttribute('readonly', '');
  textarea.style.position = 'fixed';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  let copied = false;
  try {
    copied = document.execCommand('copy');
  } catch (error) {
    copied = false;
  }
  textarea.remove();
  return copied;
}

function saveDraft() {
  const payload = buildEditorPayload();
  localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(payload));
  markSaved('Saved local');
}

function loadDraft() {
  const raw = localStorage.getItem(EDITOR_STORAGE_KEY);
  if (!raw) return false;
  try {
    applyEditorPayload(JSON.parse(raw));
    return true;
  } catch (error) {
    localStorage.removeItem(EDITOR_STORAGE_KEY);
    return false;
  }
}

function importJsonFile(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      applyEditorPayload(JSON.parse(String(reader.result || '{}')));
      saveDraft();
      markSaved('Imported');
    } catch (error) {
      markSaved('Import failed');
    } finally {
      event.target.value = '';
    }
  };
  reader.readAsText(file);
}

function buildEditorPayload() {
  return {
    version: 2,
    updatedAt: new Date().toISOString(),
    meta: Object.assign({}, state.meta),
    blocks: JSON.parse(JSON.stringify(state.blocks)),
    html: exportArticleHtml(state.blocks),
  };
}

function applyEditorPayload(payload) {
  if (!payload || !payload.meta || !Array.isArray(payload.blocks)) {
    throw new Error('Invalid editor payload');
  }

  state.meta = Object.assign({}, state.meta, payload.meta);
  state.blocks = payload.blocks.map(block => Object.assign({}, block, { id: block.id || createBlockId() }));
  state.selectedBlockId = state.blocks[0] ? state.blocks[0].id : '';
  syncInputsFromMeta();
  renderBlockList();
  updatePreview();
}

function createBlockId() {
  nextBlockNumber += 1;
  return `b${Date.now().toString(36)}-${nextBlockNumber}`;
}

function syncInputsFromMeta() {
  els.englishTitle.value = state.meta.englishTitle || '';
  els.koreanTitle.value = state.meta.koreanTitle || '';
  els.articleStatus.value = state.meta.status || '등록 중';
  els.articleCode.value = state.meta.code || '';
  els.articleCategory.value = state.meta.category || '';
  els.articleDeck.value = state.meta.deck || '';
}

async function runGasAction(action) {
  const endpoint = getPipelineEndpoint();
  if (!endpoint) {
    markGasState('Add GAS URL');
    els.gasEndpoint.focus();
    return;
  }

  markGasState('Running');
  try {
    const payload = buildEditorPayload();
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({
        action,
        token: els.gasToken.value.trim(),
        editorPageId: els.editorPageId.value.trim(),
        editorData: payload,
        html: payload.html,
        articleCode: state.meta.code,
      }),
    });
    const result = await response.json();
    if (!result.ok) throw new Error(result.error || 'GAS request failed');

    if (result.csv) {
      downloadText(result.csv, result.filename || `${action}.csv`, result.mimeType || 'text/csv;charset=utf-8');
    }
    if (result.sheetUrl) window.open(result.sheetUrl, '_blank', 'noopener');
    markGasState(result.message || 'Done');
  } catch (error) {
    markGasState(error.message || 'Failed');
  }
}

function getPipelineEndpoint() {
  const explicitEndpoint = els.gasEndpoint.value.trim();
  if (explicitEndpoint) return explicitEndpoint;
  const isLocal = ['127.0.0.1', 'localhost', ''].includes(window.location.hostname);
  return isLocal ? '' : '/.netlify/functions/gas-proxy';
}

function markGasState(label) {
  els.gasState.textContent = label;
}

function downloadText(text, filename, mimeType) {
  const blob = new Blob([text], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function markSaved(label) {
  els.saveState.textContent = label;
  window.clearTimeout(markSaved.timer);
  markSaved.timer = window.setTimeout(() => {
    els.saveState.textContent = 'Saved';
  }, 1400);
}

function videoEmbedHtml(url) {
  const rawUrl = String(url || '').trim();
  if (!rawUrl) return '';
  const normalized = normalizeYoutubeUrl(url);
  if (normalized) {
    return `<iframe src="${escapeAttr(normalized)}" title="Article video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
  }
  if (!/\.(mp4|webm|mov)(\?|#|$)/i.test(rawUrl)) return '';
  return `<video src="${escapeAttr(normalizeImageUrl(rawUrl))}" controls playsinline></video>`;
}

function normalizeYoutubeUrl(url) {
  try {
    const parsed = new URL(String(url || '').trim());
    if (parsed.hostname.includes('youtu.be')) {
      const id = parsed.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
    if (parsed.hostname.includes('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      return id ? `https://www.youtube.com/embed/${id}` : '';
    }
  } catch (error) {
    return '';
  }
  return '';
}

function linesFromText(value) {
  return String(value || '').split('\n').map(line => line.trim()).filter(Boolean);
}

function parseMediaItems(value) {
  return linesFromText(value).map(line => {
    const [src, ...captionParts] = line.split('|');
    return {
      src: src.trim(),
      caption: captionParts.join('|').trim(),
    };
  });
}

function itemsToLines(items) {
  return (items || []).map(item => [item.src, item.caption].filter(Boolean).join(' | ')).join('\n');
}

function normalizeImageUrl(value) {
  const trimmed = String(value || '').trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith('/')) return `${ARTICLE_IMAGE_BASE}${trimmed}`;
  return trimmed;
}

function slugArticleCode(code) {
  return String(code || 'article')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'article';
}

function captionHtml(caption, className = '') {
  return caption ? `
    <p class="arti-caption${className ? ` ${escapeAttr(className)}` : ''}">${escapeHtml(caption)}</p>` : '';
}

function lineBreaks(value) {
  return escapeHtml(value).replace(/\n{2,}/g, '</p><p class="basic-p">').replace(/\n/g, '<br>');
}

function optionHtml(value, selectedValue) {
  const selected = value === selectedValue ? ' selected' : '';
  return `<option value="${escapeAttr(value)}"${selected}>${escapeHtml(value)}</option>`;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, '&#96;');
}

renderBlockList();
bindEvents();
loadDraft();
setViewport(1440);
