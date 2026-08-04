const ARTICLE_IMAGE_BASE = 'https://pub-14eaf4c4a9324927bf2879a272de972a.r2.dev';
const EDITOR_STORAGE_KEY = 'anu-article-editor-v2';
const TEXT_NODE_TYPES = ['paragraph', 'subheading'];
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
      children: [
        {
          type: 'paragraph',
          html: '손에 닿는 감각은 보울을 고르는 가장 직관적인 기준입니다. <strong>좋은 보울</strong>은 음식이 담기는 순간뿐 아니라, 비어 있을 때의 무게와 곡선에서도 균형을 드러냅니다.',
        },
        {
          type: 'subheading',
          html: '소제목은 텍스트 블록 안에서 관리합니다.',
        },
        {
          type: 'paragraph',
          html: '본문 안에는 <a href="https://anu-seoul.com" data-link-type="external" target="_blank" rel="noopener">외부 링크</a>, 상품 링크, 팝업 링크를 함께 저장할 수 있습니다.',
        },
      ],
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
  toggleExport: document.getElementById('toggleExport'),
  viewportLabel: document.getElementById('viewportLabel'),
  viewportRange: document.getElementById('viewportRange'),
  cafeExportPanel: document.getElementById('cafeExportPanel'),
};

function exportArticleHtml(blocks) {
  return `<div class="arti-body">
${blocks.map(blockToHtml).filter(Boolean).join('\n\n')}
</div>`;
}

function blockToHtml(block) {
  if (block.type === 'text') {
    return `<div class="arti-block arti-block--narrow">
${textChildrenToArticleHtml(block)}
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
  if (block.type === 'text') {
    const textBlock = normalizeTextBlock(block);
    return `<div class="rich-toolbar" aria-label="Text formatting">
      <button type="button" data-rich-action="paragraph">문단</button>
      <button type="button" data-rich-action="subheading">소제목</button>
      <button type="button" data-rich-action="bold">B</button>
      <button type="button" data-rich-action="underline">U</button>
      <button type="button" data-rich-action="externalLink">외부링크</button>
      <button type="button" data-rich-action="productLink">상품링크</button>
      <button type="button" data-rich-action="popupLink">팝업링크</button>
    </div>
    <div class="rich-editor" contenteditable="true" data-key="children" spellcheck="false">
      ${textChildrenToEditorHtml(textBlock.children)}
    </div>`;
  }

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
        <div class="image-actions">
          <label class="upload-button">
            Upload
            <input class="sr-only" type="file" accept="image/*" data-upload-target="image">
          </label>
          <button type="button" data-block-action="autoImagePath">Auto path</button>
        </div>
      </div>
    </div>`;
  }

  if (block.type === 'duo') {
    const items = normalizeDuoItems(block.items);
    block.items = items;
    return `<div class="duo-editor">
      ${items.map((item, index) => {
        const imageUrl = normalizeImageUrl(item.src);
        return `<div class="duo-editor__item" data-duo-index="${index}">
          <div class="image-thumb"><img src="${escapeAttr(imageUrl)}" alt="" onerror="this.hidden=true"></div>
          <div class="duo-editor__fields">
            <label class="field">
              <span>Image ${index + 1} path or URL</span>
              <input data-key="duoItem" data-duo-key="src" data-duo-index="${index}" value="${escapeAttr(item.src)}">
            </label>
            <label class="field">
              <span>Image ${index + 1} caption</span>
              <input data-key="duoItem" data-duo-key="caption" data-duo-index="${index}" value="${escapeAttr(item.caption)}">
            </label>
            <div class="image-actions">
              <label class="upload-button">
                Upload
                <input class="sr-only" type="file" accept="image/*" data-upload-target="duo" data-duo-index="${index}">
              </label>
              <button type="button" data-duo-action="autoPath" data-duo-index="${index}">Auto path</button>
            </div>
          </div>
        </div>`;
      }).join('')}
    </div>`;
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
    <span>${block.type === 'quote' ? 'Quote' : 'Text'}</span>
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
    const richButton = event.target.closest('[data-rich-action]');
    if (richButton) {
      const card = richButton.closest('.block-card');
      if (!card) return;
      handleRichAction(card.dataset.id, richButton.dataset.richAction);
      return;
    }

    const duoButton = event.target.closest('[data-duo-action]');
    if (duoButton) {
      const card = duoButton.closest('.block-card');
      if (!card) return;
      handleDuoAction(card.dataset.id, duoButton.dataset.duoAction, Number(duoButton.dataset.duoIndex));
      return;
    }

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
    if (key === 'children') {
      block.children = serializeTextEditor(event.target);
    } else if (key === 'duoItem') {
      const index = Number(event.target.dataset.duoIndex);
      const duoKey = event.target.dataset.duoKey;
      if (!block.items) block.items = normalizeDuoItems([]);
      if (block.items[index] && ['src', 'caption'].includes(duoKey)) {
        block.items[index][duoKey] = event.target.value;
      }
    } else if (key === 'images' || key === 'rows') {
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

  els.blockList.addEventListener('change', event => {
    const uploadInput = event.target.closest('[data-upload-target]');
    if (!uploadInput) return;
    handleImageUpload(uploadInput);
  });

  els.blockList.addEventListener('paste', event => {
    const editor = event.target.closest('.rich-editor');
    if (!editor) return;
    event.preventDefault();
    const text = event.clipboardData?.getData('text/plain') || '';
    document.execCommand('insertText', false, text);
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
  els.toggleExport.addEventListener('click', () => {
    els.cafeExportPanel.classList.toggle('is-collapsed');
  });

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
  } else if (action === 'autoImagePath' && state.blocks[index].type === 'image') {
    state.blocks[index].src = buildArticleAssetPath(imageSlotName(state.blocks[index]), state.blocks[index].src || 'image.jpg');
  }

  renderBlockList();
  updatePreview();
  markSaved('Editing');
}

function handleDuoAction(blockId, action, itemIndex) {
  const block = state.blocks.find(item => item.id === blockId);
  if (!block || block.type !== 'duo') return;
  block.items = normalizeDuoItems(block.items);

  if (action === 'autoPath' && block.items[itemIndex]) {
    block.items[itemIndex].src = buildArticleAssetPath(`duo-${itemIndex + 1}`, block.items[itemIndex].src || 'image.jpg');
  }

  renderBlockList();
  updatePreview();
  markSaved('Editing');
}

async function handleImageUpload(input) {
  const file = input.files && input.files[0];
  const card = input.closest('.block-card');
  if (!file || !card) return;

  const block = state.blocks.find(item => item.id === card.dataset.id);
  if (!block) return;

  const uploadTarget = input.dataset.uploadTarget;
  const duoIndex = Number(input.dataset.duoIndex);
  const slot = uploadTarget === 'duo' ? `duo-${duoIndex + 1}` : imageSlotName(block);
  const assetPath = buildArticleAssetPath(slot, file.name);

  try {
    markSaved('Uploading');
    const result = await uploadImageToR2(file, assetPath);
    const savedPath = result.path || assetPath;

    if (uploadTarget === 'duo') {
      block.items = normalizeDuoItems(block.items);
      if (block.items[duoIndex]) block.items[duoIndex].src = savedPath;
    } else {
      block.src = savedPath;
    }

    renderBlockList();
    updatePreview();
    markSaved('Uploaded');
  } catch (error) {
    markSaved(error.message || 'Upload failed');
  } finally {
    input.value = '';
  }
}

async function uploadImageToR2(file, assetPath) {
  const endpoint = getUploadEndpoint();
  if (!endpoint) {
    throw new Error('Deploy to Cloudflare first');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('key', assetPath.replace(/^\/+/, ''));
  formData.append('token', els.gasToken.value.trim());

  const response = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || 'Upload failed');
  return result;
}

function getUploadEndpoint() {
  const isLocal = ['127.0.0.1', 'localhost', ''].includes(window.location.hostname);
  if (isLocal) return '';
  if (window.location.hostname.endsWith('.netlify.app')) return '';
  return '/api/r2-upload';
}

function buildArticleAssetPath(slot, filename) {
  const extension = filenameExtension(filename) || 'jpg';
  const year = articleYear(state.meta.code);
  const codeSlug = slugArticleCode(state.meta.code);
  const slotSlug = slugArticleCode(slot);
  return `/${year}/${codeSlug}/${slotSlug}.${extension}`;
}

function filenameExtension(filename) {
  const match = String(filename || '').toLowerCase().match(/\.([a-z0-9]+)(?:\?|#)?$/);
  if (!match) return '';
  if (match[1] === 'jpeg') return 'jpg';
  return match[1].replace(/[^a-z0-9]/g, '');
}

function articleYear(code) {
  const match = String(code || '').match(/ARTI(\d{2})/i);
  if (match) return `20${match[1]}`;
  return String(new Date().getFullYear());
}

function imageSlotName(block) {
  const imageBlocks = state.blocks.filter(item => item.type === 'image');
  const index = Math.max(0, imageBlocks.indexOf(block));
  return `image-${index + 1}`;
}

function handleRichAction(blockId, action) {
  const card = findBlockCard(blockId);
  const editor = card?.querySelector('.rich-editor');
  const block = state.blocks.find(item => item.id === blockId);
  if (!editor || !block) return;

  editor.focus();

  if (action === 'paragraph' || action === 'subheading') {
    setCurrentTextNodeType(editor, action);
  } else if (action === 'bold') {
    document.execCommand('bold', false);
  } else if (action === 'underline') {
    document.execCommand('underline', false);
  } else if (action === 'externalLink') {
    const href = window.prompt('외부 링크 URL을 입력하세요.', 'https://');
    if (href) {
      insertInlineLink(editor, {
        href,
        target: '_blank',
        rel: 'noopener',
        'data-link-type': 'external',
      }, href);
    }
  } else if (action === 'productLink') {
    const productCode = window.prompt('상품코드 또는 상품번호를 입력하세요.', '');
    if (productCode) {
      insertInlineLink(editor, {
        href: '#',
        'data-link-type': 'product',
        'data-product-code': productCode,
      }, productCode);
    }
  } else if (action === 'popupLink') {
    const title = window.prompt('팝업 제목을 입력하세요.', '');
    if (title) {
      const content = window.prompt('팝업 내용을 입력하세요.', '');
      insertInlineLink(editor, {
        href: '#',
        'data-link-type': 'popup',
        'data-popup-title': title,
        'data-popup-content': content || '',
      }, title);
    }
  }

  ensureRichNodeStructure(editor);
  block.children = serializeTextEditor(editor);
  updatePreview();
  markSaved('Editing');
}

function findBlockCard(blockId) {
  return Array.from(els.blockList.querySelectorAll('.block-card'))
    .find(card => card.dataset.id === blockId);
}

function setCurrentTextNodeType(editor, type) {
  const node = getCurrentRichNode(editor);
  if (!node || !TEXT_NODE_TYPES.includes(type)) return;
  node.dataset.nodeType = type;
}

function getCurrentRichNode(editor) {
  const selection = window.getSelection();
  const selectedNode = selection && selection.anchorNode;
  const element = selectedNode && selectedNode.nodeType === Node.ELEMENT_NODE
    ? selectedNode
    : selectedNode?.parentElement;
  return element?.closest?.('.rich-editor__node') || editor.querySelector('.rich-editor__node');
}

function insertInlineLink(editor, attributes, fallbackLabel) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  const selectedText = selection.toString().trim();
  const link = document.createElement('a');
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null) link.setAttribute(key, String(value));
  });
  link.textContent = selectedText || fallbackLabel || attributes.href || 'link';

  range.deleteContents();
  range.insertNode(link);
  range.setStartAfter(link);
  range.collapse(true);
  selection.removeAllRanges();
  selection.addRange(range);
}

function normalizeTextBlock(block) {
  if (Array.isArray(block.children) && block.children.length) {
    block.children = normalizeTextChildren(block.children);
    return block;
  }

  const legacyText = String(block.text || '').trim();
  block.children = legacyText
    ? legacyText.split(/\n{2,}/).map(part => ({
      type: 'paragraph',
      html: escapeHtml(part.trim()).replace(/\n/g, '<br>'),
    }))
    : [{ type: 'paragraph', html: '' }];
  delete block.text;
  return block;
}

function normalizeBlock(block) {
  const next = Object.assign({}, block, { id: block.id || createBlockId() });
  if (next.type === 'heading') {
    return {
      id: next.id,
      type: 'text',
      children: [{ type: 'subheading', html: escapeHtml(next.text || '새 소제목') }],
    };
  }
  if (next.type === 'text') return normalizeTextBlock(next);
  return next;
}

function normalizeTextChildren(children) {
  return (children || []).map(child => ({
    type: TEXT_NODE_TYPES.includes(child?.type) ? child.type : 'paragraph',
    html: sanitizeRichHtml(child?.html || ''),
  })).filter(child => child.html || child.type === 'paragraph');
}

function textChildrenToArticleHtml(block) {
  const children = normalizeTextBlock(block).children;
  return children.map(child => {
    const html = sanitizeRichHtml(child.html);
    if (!html) return '';
    if (child.type === 'subheading') {
      return `  <h2 class="mid-title">${html}</h2>`;
    }
    return `  <p class="basic-p">${html}</p>`;
  }).filter(Boolean).join('\n');
}

function textChildrenToEditorHtml(children) {
  const normalizedChildren = normalizeTextChildren(children);
  const safeChildren = normalizedChildren.length ? normalizedChildren : [{ type: 'paragraph', html: '<br>' }];
  return safeChildren.map(child => {
    const type = TEXT_NODE_TYPES.includes(child.type) ? child.type : 'paragraph';
    const html = child.html || '<br>';
    return `<div class="rich-editor__node" data-node-type="${escapeAttr(type)}">${html}</div>`;
  }).join('');
}

function serializeTextEditor(editor) {
  ensureRichNodeStructure(editor);
  const children = Array.from(editor.querySelectorAll('.rich-editor__node')).map(node => ({
    type: TEXT_NODE_TYPES.includes(node.dataset.nodeType) ? node.dataset.nodeType : 'paragraph',
    html: sanitizeRichHtml(node.innerHTML),
  })).filter(child => child.html);

  return children.length ? children : [{ type: 'paragraph', html: '' }];
}

function ensureRichNodeStructure(editor) {
  const childNodes = Array.from(editor.childNodes);
  const elementChildren = Array.from(editor.children);
  const isAlreadyStructured = elementChildren.length > 0
    && elementChildren.length === childNodes.filter(node => node.nodeType === Node.ELEMENT_NODE).length
    && elementChildren.every(child => child.classList?.contains('rich-editor__node'));
  if (isAlreadyStructured) return;

  const normalizedHtml = childNodes.map(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent.trim();
      return text ? `<div class="rich-editor__node" data-node-type="paragraph">${escapeHtml(text)}</div>` : '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const element = node;
    if (element.classList.contains('rich-editor__node')) {
      const type = TEXT_NODE_TYPES.includes(element.dataset.nodeType) ? element.dataset.nodeType : 'paragraph';
      return `<div class="rich-editor__node" data-node-type="${escapeAttr(type)}">${sanitizeRichHtml(element.innerHTML) || '<br>'}</div>`;
    }

    const html = sanitizeRichHtml(element.innerHTML || element.textContent || '');
    return html ? `<div class="rich-editor__node" data-node-type="paragraph">${html}</div>` : '';
  }).filter(Boolean).join('');

  editor.innerHTML = normalizedHtml || '<div class="rich-editor__node" data-node-type="paragraph"><br></div>';
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

  if (type === 'text') {
    return {
      id,
      type,
      children: [{ type: 'paragraph', html: '본문을 입력하세요.' }],
    };
  }

  if (type === 'heading') {
    return {
      id,
      type: 'text',
      children: [{ type: 'subheading', html: '새 소제목' }],
    };
  }

  return {
    id,
    type,
    text: type === 'quote' ? '강조하고 싶은 문장을 입력하세요.' : '본문을 입력하세요.',
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
    version: 3,
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
  state.blocks = payload.blocks.map(normalizeBlock);
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
  if (isLocal) return '';
  if (window.location.hostname.endsWith('.netlify.app')) return '/.netlify/functions/gas-proxy';
  return '/api/gas-proxy';
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

function normalizeDuoItems(items) {
  const normalized = (items || []).slice(0, 2).map(item => ({
    src: item?.src || '',
    caption: item?.caption || '',
  }));
  while (normalized.length < 2) {
    const index = normalized.length;
    normalized.push({
      src: buildArticleAssetPath(`duo-${index + 1}`, 'image.jpg'),
      caption: '',
    });
  }
  return normalized;
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

function sanitizeRichHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = String(value || '');
  cleanRichNode(template.content);
  return template.innerHTML.trim();
}

function cleanRichNode(parent) {
  Array.from(parent.childNodes).forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType !== Node.ELEMENT_NODE) {
      node.remove();
      return;
    }

    const element = node;
    const tag = element.tagName.toLowerCase();
    if (['script', 'style'].includes(tag)) {
      element.remove();
      return;
    }

    if (!['a', 'b', 'br', 'strong', 'u'].includes(tag)) {
      cleanRichNode(element);
      unwrapElement(element);
      return;
    }

    cleanRichNode(element);

    if (tag === 'a') {
      const allowedAttributes = new Map();
      const href = element.getAttribute('href') || '#';
      allowedAttributes.set('href', safeHref(href) ? href : '#');

      ['target', 'rel', 'data-link-type', 'data-product-code', 'data-product-no', 'data-popup-title', 'data-popup-content'].forEach(name => {
        const value = element.getAttribute(name);
        if (value) allowedAttributes.set(name, value);
      });

      Array.from(element.attributes).forEach(attribute => element.removeAttribute(attribute.name));
      allowedAttributes.forEach((attrValue, attrName) => element.setAttribute(attrName, attrValue));
      if (element.getAttribute('target') === '_blank' && !element.getAttribute('rel')) {
        element.setAttribute('rel', 'noopener');
      }
      return;
    }

    Array.from(element.attributes).forEach(attribute => element.removeAttribute(attribute.name));
  });
}

function unwrapElement(element) {
  while (element.firstChild) {
    element.parentNode.insertBefore(element.firstChild, element);
  }
  element.remove();
}

function safeHref(href) {
  const value = String(href || '').trim();
  if (value === '#') return true;
  try {
    const parsed = new URL(value, window.location.origin);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(parsed.protocol);
  } catch (error) {
    return false;
  }
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
