const ARTICLE_IMAGE_BASE = 'https://pub-14eaf4c4a9324927bf2879a272de972a.r2.dev';
const EDITOR_STORAGE_KEY = 'anu-article-editor-v2';
const TEXT_NODE_TYPES = ['paragraph', 'subheading'];
const IMAGE_LAYOUTS = ['title-img-f', 'title-img-m', 'img-s', 'img-m', 'img-l'];
const DUO_LAYOUTS = ['title-img-duo', 'img-s-duo', 'img-m-duo'];
const TEXT_BLOCK_TYPES = ['text', 'quote', 'credit'];
const MEDIA_BLOCK_TYPES = ['image', 'duo', 'slide', 'video'];
let activeRichLink = null;
let activeLinkEditor = null;
let draggedBlockId = '';
let draftAutosaveTimer = 0;
let nextBlockNumber = 4;

const state = {
  previewReady: false,
  viewportWidth: 1440,
  selectedBlockId: 'b1',
  articles: [],
  articleQuery: '',
  articleStatusFilter: 'all',
  meta: {
    englishTitle: 'What Makes a Good Bowl',
    koreanTitle: '손의 경험 | 좋은 보울을 만드는 요소',
    status: '등록 중',
    code: 'ARTI26-001',
    category: 'craft',
    type: 'guide',
    publishDate: '',
    cafe24ProductNo: '',
    cafe24ProductCode: '',
    productCategoryIds: '114|117',
    articlePageId: '',
    editorPageId: '',
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
  articleList: document.querySelector('.article-list'),
  articleSearch: document.getElementById('articleSearch'),
  articlePageId: document.getElementById('articlePageId'),
  articleType: document.getElementById('articleType'),
  blockList: document.getElementById('blockList'),
  cafe24ProductCode: document.getElementById('cafe24ProductCode'),
  cafe24ProductNo: document.getElementById('cafe24ProductNo'),
  closeExport: document.getElementById('closeExport'),
  copyHtml: document.getElementById('copyHtml'),
  copyJson: document.getElementById('copyJson'),
  deviceFrame: document.getElementById('deviceFrame'),
  editorPageId: document.getElementById('editorPageId'),
  generateArticleCode: document.getElementById('generateArticleCode'),
  gasEndpoint: document.getElementById('gasEndpoint'),
  gasState: document.getElementById('gasState'),
  gasToken: document.getElementById('gasToken'),
  importJson: document.getElementById('importJson'),
  importJsonInput: document.getElementById('importJsonInput'),
  loadArticles: document.getElementById('loadArticles'),
  closeMeta: document.getElementById('closeMeta'),
  metaDrawer: document.getElementById('metaDrawer'),
  minimizeComposer: document.getElementById('minimizeComposer'),
  previewFrame: document.getElementById('previewFrame'),
  productCategoryIds: document.getElementById('productCategoryIds'),
  publishClear: document.getElementById('publishClear'),
  publishDate: document.getElementById('publishDate'),
  publishDateLabel: document.getElementById('publishDateLabel'),
  publishNext: document.getElementById('publishNext'),
  publishPrev: document.getElementById('publishPrev'),
  publishToday: document.getElementById('publishToday'),
  saveDraft: document.getElementById('saveDraft'),
  saveState: document.getElementById('saveState'),
  toggleComposerFloat: document.getElementById('toggleComposerFloat'),
  toggleExport: document.getElementById('toggleExport'),
  toggleMeta: document.getElementById('toggleMeta'),
  toggleSidebar: document.getElementById('toggleSidebar'),
  utilityMenu: document.querySelector('.utility-menu'),
  statusFilters: document.querySelectorAll('[data-status-filter]'),
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
    if (layout === 'title-img-f') {
      const mobileSrc = block.mobileSrc || block.src;
      return `<div class="arti-block arti-block--full" data-reveal>
  <div class="title-img-f">
    <div class="title-img-f__picture">
      <img class="title-img-f__pc" src="${escapeAttr(normalizeImageUrl(block.src))}" alt="">
      <img class="title-img-f__mobile" src="${escapeAttr(normalizeImageUrl(mobileSrc))}" alt="">
    </div>${captionHtml(block.caption, 'arti-caption--inset')}
  </div>
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
    const layout = DUO_LAYOUTS.includes(block.layout) ? block.layout : 'img-m-duo';
    const itemClass = layout === 'title-img-duo' ? '' : `${layout}__item`;
    const items = normalizeDuoItems(block.items).filter(item => item && item.src).map(item => layout === 'title-img-duo'
      ? `    <img src="${escapeAttr(normalizeImageUrl(item.src))}" alt="">`
      : `    <div class="${escapeAttr(itemClass)}">
      <img src="${escapeAttr(normalizeImageUrl(item.src))}" alt="">${captionHtml(item.caption)}
    </div>`).join('\n');
    const blockClass = layout === 'title-img-duo' ? 'arti-block--full' : layout === 'img-s-duo' ? 'arti-block--duo-s' : 'arti-block--duo-m';

    return `<div class="arti-block ${blockClass}" data-reveal>
  <div class="${escapeAttr(layout)}">
${items}
  </div>${layout === 'title-img-duo' ? captionHtml(block.caption, 'arti-caption--inset') : ''}
</div>`;
  }

  if (block.type === 'quote') {
    return `<div class="arti-block arti-block--wide" data-reveal>
  <p class="emph-p">${lineBreaks(block.text)}</p>
</div>`;
  }

  if (block.type === 'slide') {
    const images = normalizeSlideImages(block.images).filter(Boolean).map((src, index) => `
        <div class="img-slide__item${index === 0 ? ' is-active' : ''}">
          <img src="${escapeAttr(normalizeImageUrl(src))}" alt="">
          ${block.caption ? `<p hidden class="arti-caption">${richHtmlToArticleInlineHtml(block.caption)}</p>` : ''}
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
  <div class="arti-video ${escapeAttr(block.videoType || '')}">
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
  refreshIcons();
  scrollSelectedBlockIntoView();
}

function blockEditorHtml(block, index) {
  const selected = block.id === state.selectedBlockId ? ' is-selected' : '';
  const label = blockLabel(block);
  const group = TEXT_BLOCK_TYPES.includes(block.type) ? '글' : MEDIA_BLOCK_TYPES.includes(block.type) ? '미디어' : '블록';

  return `<article class="block-card${selected}" data-id="${block.id}" data-type="${block.type}">
    <div class="block-card__head">
      <div class="block-card__meta">
        <button class="drag-handle" type="button" draggable="true" aria-label="블록 순서 이동" title="끌어서 순서 변경">${iconHtml('grip-vertical')}</button>
        <strong>${label}</strong>
        <em>${group}</em>
        <span>${String(index + 1).padStart(2, '0')}</span>
      </div>
      <div class="block-actions" aria-label="Block actions">
        <button type="button" data-block-action="moveUp" aria-label="위로 이동" title="위로">${iconHtml('arrow-up')}</button>
        <button type="button" data-block-action="moveDown" aria-label="아래로 이동" title="아래로">${iconHtml('arrow-down')}</button>
        <button type="button" data-block-action="duplicate" aria-label="복제" title="복제">${iconHtml('copy')}</button>
        <button type="button" data-block-action="delete" aria-label="삭제" title="삭제">${iconHtml('trash-2')}</button>
      </div>
    </div>
    <div class="block-card__body">
      ${blockFieldsHtml(block)}
    </div>
  </article>
  ${inlineAddHtml(index)}`;
}

function inlineAddHtml(index) {
  return `<details class="inline-add" data-insert-after="${index}">
    <summary>${iconHtml('plus')}아래에 블록 추가</summary>
    <div class="inline-add__menu">
      <div class="inline-add__group" aria-label="글 블록">
        <span>글</span>
        <button type="button" data-add-inline="text" title="텍스트">${iconHtml('type')}텍스트</button>
        <button type="button" data-add-inline="quote" title="인용">${iconHtml('quote')}인용</button>
        <button type="button" data-add-inline="credit" title="크레딧">${iconHtml('badge-info')}크레딧</button>
      </div>
      <div class="inline-add__group" aria-label="미디어 블록">
        <span>미디어</span>
        <button type="button" data-add-inline="image" title="이미지">${iconHtml('image')}이미지</button>
        <button type="button" data-add-inline="duo" title="이미지 듀오">${iconHtml('columns-2')}듀오</button>
        <button type="button" data-add-inline="slide" title="슬라이드">${iconHtml('gallery-horizontal')}슬라이드</button>
        <button type="button" data-add-inline="video" title="비디오">${iconHtml('video')}비디오</button>
      </div>
    </div>
  </details>`;
}

function blockLabel(block) {
  const labels = {
    text: '텍스트',
    quote: '인용',
    credit: '크레딧',
    image: block.layout || '이미지',
    duo: block.layout || '듀오',
    slide: '슬라이드',
    video: block.videoType === 'video-mp4' ? '비디오' : '유튜브',
  };
  return labels[block.type] || block.type.charAt(0).toUpperCase() + block.type.slice(1);
}

function uploadTileHtml({ src, target, label, attrs = '' }) {
  const imageUrl = normalizeImageUrl(src);
  return `<label class="image-thumb image-upload-tile">
    <img src="${escapeAttr(imageUrl)}" alt="" onerror="this.hidden=true">
    <span class="image-upload-tile__label">${iconHtml('upload-cloud')}${escapeHtml(label)}</span>
    <input class="sr-only" type="file" accept="image/*" data-upload-target="${escapeAttr(target)}"${attrs ? ` ${attrs}` : ''}>
  </label>`;
}

function captionEditorHtml(value, { key = 'captionRich', label = '캡션', attrs = '' } = {}) {
  return `<div class="caption-editor">
    <div class="caption-editor__head">
      <span>${escapeHtml(label)}</span>
      <div class="caption-toolbar" aria-label="캡션 서식">
        <button type="button" data-caption-rich-action="bold" title="굵게">B</button>
        <button type="button" data-caption-rich-action="underline" title="밑줄">U</button>
        <button type="button" data-caption-rich-action="externalLink">외부 링크</button>
        <button type="button" data-caption-rich-action="productLink">상품 링크</button>
        <button type="button" data-caption-rich-action="popupLink">팝업 링크</button>
      </div>
    </div>
    <div class="rich-caption-editor" contenteditable="true" data-key="${escapeAttr(key)}"${attrs ? ` ${attrs}` : ''} spellcheck="false">${sanitizeRichHtml(value) || '<br>'}</div>
  </div>`;
}

function blockFieldsHtml(block) {
  if (block.type === 'text') {
    const textBlock = normalizeTextBlock(block);
    return `<div class="rich-toolbar" aria-label="본문 서식">
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
    const showMobileImage = block.layout === 'title-img-f';
    return `<div class="media-editor">
      <div class="image-grid">
        ${uploadTileHtml({ src: block.src, target: 'image', label: 'PC 이미지 업로드' })}
        <div class="media-fields">
          <label class="field">
            <span>PC 이미지 경로</span>
            <input data-key="src" value="${escapeAttr(block.src)}">
          </label>
          <div class="field-row">
            <label class="field">
              <span>레이아웃</span>
              <select data-key="layout">
                ${IMAGE_LAYOUTS.map(value => optionHtml(value, block.layout)).join('')}
              </select>
            </label>
            <button class="ui-button ui-button--secondary field-button" type="button" data-block-action="autoImagePath">${iconHtml('route')}자동 경로</button>
          </div>
        </div>
      </div>
      ${showMobileImage ? `<div class="image-grid">
        ${uploadTileHtml({ src: block.mobileSrc || block.src, target: 'imageMobile', label: '모바일 이미지 업로드' })}
        <div class="media-fields">
          <label class="field">
            <span>모바일 이미지 경로</span>
            <input data-key="mobileSrc" value="${escapeAttr(block.mobileSrc)}" placeholder="비워두면 PC 이미지 사용">
          </label>
          <button class="ui-button ui-button--secondary field-button" type="button" data-block-action="autoMobileImagePath">${iconHtml('route')}모바일 자동 경로</button>
        </div>
      </div>` : ''}
      ${captionEditorHtml(block.caption, { label: '이미지 캡션' })}
    </div>`;
  }

  if (block.type === 'duo') {
    const items = normalizeDuoItems(block.items);
    block.items = items;
    return `<div class="duo-editor">
      <label class="field">
        <span>듀오 레이아웃</span>
        <select data-key="layout">
          ${DUO_LAYOUTS.map(value => optionHtml(value, block.layout || 'img-m-duo')).join('')}
        </select>
      </label>
      ${items.map((item, index) => {
        return `<div class="duo-editor__item" data-duo-index="${index}">
          ${uploadTileHtml({ src: item.src, target: 'duo', label: `이미지 ${index + 1} 업로드`, attrs: `data-duo-index="${index}"` })}
          <div class="duo-editor__fields">
            <label class="field">
              <span>이미지 ${index + 1} 경로</span>
              <input data-key="duoItem" data-duo-key="src" data-duo-index="${index}" value="${escapeAttr(item.src)}">
            </label>
            <button class="ui-button ui-button--secondary field-button" type="button" data-duo-action="autoPath" data-duo-index="${index}">${iconHtml('route')}자동 경로</button>
            ${captionEditorHtml(item.caption, { key: 'duoCaptionRich', label: `이미지 ${index + 1} 캡션`, attrs: `data-duo-index="${index}"` })}
          </div>
        </div>`;
      }).join('')}
      ${block.layout === 'title-img-duo' ? captionEditorHtml(block.caption, { label: '타이틀 듀오 전체 캡션' }) : ''}
    </div>`;
  }

  if (block.type === 'slide') {
    block.images = normalizeSlideImages(block.images);
    return `<div class="slide-editor">
      <div class="slide-editor__head">
        <span>슬라이드 이미지</span>
        <button type="button" data-slide-action="add">${iconHtml('plus')}이미지 추가</button>
      </div>
      ${block.images.map((src, index) => {
        return `<div class="slide-editor__item" data-slide-index="${index}">
          ${uploadTileHtml({ src, target: 'slide', label: `슬라이드 ${index + 1} 업로드`, attrs: `data-slide-index="${index}"` })}
          <div class="slide-editor__fields">
            <label class="field">
              <span>슬라이드 ${index + 1} 경로</span>
              <input data-key="slideImage" data-slide-index="${index}" value="${escapeAttr(src)}">
            </label>
            <div class="image-actions">
              <button type="button" data-slide-action="autoPath" data-slide-index="${index}">${iconHtml('route')}자동 경로</button>
              <button type="button" data-slide-action="remove" data-slide-index="${index}" aria-label="슬라이드 이미지 삭제">${iconHtml('trash-2')}삭제</button>
            </div>
          </div>
        </div>`;
      }).join('')}
      ${captionEditorHtml(block.caption, { label: '슬라이드 공통 캡션' })}
    </div>`;
  }

  if (block.type === 'video') {
    return `<label class="field">
      <span>영상 유형</span>
      <select data-key="videoType">
        ${optionHtml('video-yt', block.videoType || 'video-yt', '유튜브')}
        ${optionHtml('video-mp4', block.videoType || 'video-yt', 'MP4 파일')}
      </select>
    </label>
    <label class="field">
      <span>유튜브 또는 MP4 URL</span>
      <input data-key="url" value="${escapeAttr(block.url)}">
    </label>
    ${captionEditorHtml(block.caption, { label: '영상 캡션' })}`;
  }

  if (block.type === 'credit') {
    return `<label class="field">
      <span>크레딧. 한 줄에 하나씩, 이름: 내용 형식</span>
      <textarea data-key="rows">${escapeHtml((block.rows || []).join('\n'))}</textarea>
    </label>`;
  }

  return `<label class="field">
    <span>${block.type === 'quote' ? '인용문' : '텍스트'}</span>
    <textarea data-key="text">${escapeHtml(block.text)}</textarea>
  </label>`;
}

function bindEvents() {
  ['englishTitle', 'koreanTitle', 'articleStatus', 'articleCode', 'articleCategory', 'articleType', 'publishDate', 'cafe24ProductNo', 'cafe24ProductCode', 'productCategoryIds', 'articlePageId', 'editorPageId', 'articleDeck'].forEach(id => {
    els[id].addEventListener('input', syncMetaFromInputs);
    els[id].addEventListener('change', syncMetaFromInputs);
  });

  document.querySelectorAll('[data-add]').forEach(button => {
    button.addEventListener('click', () => addBlock(button.dataset.add));
  });

  document.querySelectorAll('[data-gas-action]').forEach(button => {
    button.addEventListener('click', () => runGasAction(button.dataset.gasAction));
  });

  els.blockList.addEventListener('click', event => {
    const inlineAddButton = event.target.closest('[data-add-inline]');
    if (inlineAddButton) {
      const inlineAdd = inlineAddButton.closest('[data-insert-after]');
      const afterIndex = Number(inlineAdd?.dataset.insertAfter);
      addBlock(inlineAddButton.dataset.addInline, Number.isFinite(afterIndex) ? afterIndex + 1 : state.blocks.length);
      return;
    }

    const captionButton = event.target.closest('[data-caption-rich-action]');
    if (captionButton) {
      const card = captionButton.closest('.block-card');
      if (!card) return;
      handleCaptionRichAction(card.dataset.id, captionButton.dataset.captionRichAction, captionButton);
      return;
    }

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

    const slideButton = event.target.closest('[data-slide-action]');
    if (slideButton) {
      const card = slideButton.closest('.block-card');
      if (!card) return;
      handleSlideAction(card.dataset.id, slideButton.dataset.slideAction, Number(slideButton.dataset.slideIndex));
      return;
    }

    const button = event.target.closest('[data-block-action]');
    if (!button) return;
    const card = button.closest('.block-card');
    if (!card) return;
    handleBlockAction(card.dataset.id, button.dataset.blockAction);
  });

  els.blockList.addEventListener('dragstart', event => {
    if (!event.target.closest('.drag-handle')) return;
    const card = event.target.closest('.block-card');
    if (!card) return;
    draggedBlockId = card.dataset.id;
    card.classList.add('is-dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', draggedBlockId);
  });

  els.blockList.addEventListener('dragend', () => {
    draggedBlockId = '';
    document.querySelectorAll('.block-card').forEach(card => card.classList.remove('is-dragging', 'is-drop-before', 'is-drop-after'));
  });

  els.blockList.addEventListener('dragover', event => {
    const card = event.target.closest('.block-card');
    if (!card || !draggedBlockId || card.dataset.id === draggedBlockId) return;
    event.preventDefault();
    markDropTarget(card, event.clientY);
  });

  els.blockList.addEventListener('drop', event => {
    const card = event.target.closest('.block-card');
    if (!card || !draggedBlockId || card.dataset.id === draggedBlockId) return;
    event.preventDefault();
    const rect = card.getBoundingClientRect();
    const insertAfter = event.clientY > rect.top + rect.height / 2;
    reorderBlock(draggedBlockId, card.dataset.id, insertAfter);
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
    } else if (key === 'captionRich') {
      block.caption = sanitizeRichHtml(event.target.innerHTML);
    } else if (key === 'duoCaptionRich') {
      const index = Number(event.target.dataset.duoIndex);
      block.items = normalizeDuoItems(block.items);
      if (block.items[index]) block.items[index].caption = sanitizeRichHtml(event.target.innerHTML);
    } else if (key === 'slideImage') {
      const index = Number(event.target.dataset.slideIndex);
      block.images = normalizeSlideImages(block.images);
      if (Number.isFinite(index) && block.images[index] !== undefined) {
        block.images[index] = event.target.value;
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
    if (uploadInput) {
      handleImageUpload(uploadInput);
      return;
    }
    if (event.target.dataset.key) {
      event.target.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });

  els.blockList.addEventListener('mouseover', event => {
    const link = event.target.closest('.rich-editor a[data-link-type], .rich-caption-editor a[data-link-type]');
    if (!link) return;
    showLinkPopover(link);
  });

  document.addEventListener('click', event => {
    const popover = document.querySelector('.link-popover');
    if (event.target.closest('.link-popover')) {
      const action = event.target.closest('[data-link-popover-action]')?.dataset.linkPopoverAction;
      const editorAction = event.target.closest('[data-link-editor-action]')?.dataset.linkEditorAction;
      if (action) handleLinkPopoverAction(action);
      if (editorAction === 'cancel') hideLinkPopover();
      return;
    }
    if (!event.target.closest('.rich-editor a[data-link-type], .rich-caption-editor a[data-link-type]')) hideLinkPopover();
  });

  document.addEventListener('submit', event => {
    if (!event.target.closest('[data-link-editor-form]')) return;
    event.preventDefault();
    applyLinkEditor();
  });

  document.addEventListener('change', event => {
    if (!event.target.closest('.link-popover')) return;
    if (event.target.matches('[data-link-field="type"]')) updateLinkEditorFields();
  });

  els.blockList.addEventListener('paste', event => {
    const editor = event.target.closest('.rich-editor, .rich-caption-editor');
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
  els.generateArticleCode.addEventListener('click', generateAndSetArticleCode);
  els.importJson.addEventListener('click', () => {
    closeUtilityMenu();
    els.importJsonInput.click();
  });
  els.importJsonInput.addEventListener('change', importJsonFile);
  els.articleSearch.addEventListener('input', event => {
    state.articleQuery = event.target.value;
    renderArticleList();
  });
  els.statusFilters.forEach(button => {
    button.addEventListener('click', () => {
      state.articleStatusFilter = button.dataset.statusFilter || 'all';
      els.statusFilters.forEach(item => item.classList.toggle('is-active', item === button));
      renderArticleList();
    });
  });
  els.loadArticles.addEventListener('click', loadArticlesFromNotion);
  els.toggleMeta.addEventListener('click', () => setMetaOpen(els.metaDrawer.classList.contains('is-collapsed')));
  els.closeMeta.addEventListener('click', () => setMetaOpen(false));
  els.minimizeComposer.addEventListener('click', () => document.body.classList.toggle('composer-minimized'));
  els.publishPrev.addEventListener('click', () => shiftPublishDate(-1));
  els.publishNext.addEventListener('click', () => shiftPublishDate(1));
  els.publishToday.addEventListener('click', () => setPublishDate(new Date()));
  els.publishClear.addEventListener('click', () => setPublishDate(null));
  els.saveDraft.addEventListener('click', saveDraft);
  els.toggleComposerFloat.addEventListener('click', () => document.body.classList.toggle('composer-floating'));
  els.closeExport.addEventListener('click', () => setExportOpen(false));
  els.toggleExport.addEventListener('click', () => setExportOpen(els.cafeExportPanel.classList.contains('is-collapsed')));
  els.toggleSidebar.addEventListener('click', () => document.body.classList.toggle('sidebar-collapsed'));

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !els.cafeExportPanel.classList.contains('is-collapsed')) {
      setExportOpen(false);
    }
    if (event.key === 'Escape' && !els.metaDrawer.classList.contains('is-collapsed')) {
      setMetaOpen(false);
    }
  });

  document.addEventListener('click', event => {
    if (!document.body.classList.contains('export-open')) return;
    if (event.target.closest('#cafeExportPanel') || event.target.closest('#toggleExport')) return;
    setExportOpen(false);
  });

  document.addEventListener('click', event => {
    if (els.metaDrawer.classList.contains('is-collapsed')) return;
    if (event.target.closest('#metaDrawer') || event.target.closest('#toggleMeta')) return;
    setMetaOpen(false);
  });

  els.articleList.addEventListener('click', event => {
    const row = event.target.closest('[data-article-index]');
    if (!row) return;
    selectArticle(Number(row.dataset.articleIndex));
  });

  bindFloatingComposerDrag();

  els.previewFrame.addEventListener('load', () => {
    state.previewReady = true;
    updatePreview();
    fitPreviewFrame();
  });

  window.addEventListener('resize', fitPreviewFrame);

  window.addEventListener('message', event => {
    if (event.data && event.data.type === 'ANU_ARTICLE_PREVIEW_READY') {
      state.previewReady = true;
      updatePreview();
    }
  });
}

function addBlock(type, insertIndex = state.blocks.length) {
  if (MEDIA_BLOCK_TYPES.includes(type)) ensureArticleCodeForAssets();
  const block = createBlock(type);
  state.blocks.splice(insertIndex, 0, block);
  state.selectedBlockId = block.id;
  renderBlockList();
  updatePreview();
  markSaved('Editing');
}

function setPublishDate(date) {
  els.publishDate.value = date ? formatDateInputValue(date) : '';
  syncMetaFromInputs();
}

function shiftPublishDate(deltaDays) {
  const currentDate = parseDateInputValue(els.publishDate.value) || new Date();
  currentDate.setDate(currentDate.getDate() + deltaDays);
  setPublishDate(currentDate);
}

function updatePublishDateLabel() {
  const date = parseDateInputValue(els.publishDate.value);
  if (!date) {
    els.publishDateLabel.textContent = '날짜 없음';
    return;
  }
  els.publishDateLabel.textContent = new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
  }).format(date);
}

function setExportOpen(open) {
  els.cafeExportPanel.classList.toggle('is-collapsed', !open);
  document.body.classList.toggle('export-open', open);
  els.toggleExport.setAttribute('aria-expanded', String(open));
  if (open) {
    const firstInput = els.cafeExportPanel.querySelector('.pipeline-panel input, .pipeline-panel button');
    if (firstInput) firstInput.focus({ preventScroll: true });
  } else {
    els.toggleExport.focus({ preventScroll: true });
  }
}

function setMetaOpen(open) {
  els.metaDrawer.classList.toggle('is-collapsed', !open);
  document.body.classList.toggle('meta-open', open);
  els.toggleMeta.setAttribute('aria-expanded', String(open));
  if (open) {
    const firstInput = els.metaDrawer.querySelector('select, input, textarea, button');
    if (firstInput) firstInput.focus({ preventScroll: true });
  } else {
    els.toggleMeta.focus({ preventScroll: true });
  }
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInputValue(value) {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function markDropTarget(card, pointerY) {
  document.querySelectorAll('.block-card').forEach(item => item.classList.remove('is-drop-before', 'is-drop-after'));
  const rect = card.getBoundingClientRect();
  const insertAfter = pointerY > rect.top + rect.height / 2;
  card.classList.toggle('is-drop-before', !insertAfter);
  card.classList.toggle('is-drop-after', insertAfter);
}

function reorderBlock(sourceId, targetId, insertAfter) {
  const sourceIndex = state.blocks.findIndex(item => item.id === sourceId);
  const targetIndex = state.blocks.findIndex(item => item.id === targetId);
  if (sourceIndex === -1 || targetIndex === -1) return;

  const [movedBlock] = state.blocks.splice(sourceIndex, 1);
  let nextIndex = state.blocks.findIndex(item => item.id === targetId);
  if (insertAfter) nextIndex += 1;
  state.blocks.splice(nextIndex, 0, movedBlock);
  state.selectedBlockId = sourceId;
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
    ensureArticleCodeForAssets();
    state.blocks[index].src = buildArticleAssetPath(imageSlotName(state.blocks[index]), state.blocks[index].src || 'image.jpg');
  } else if (action === 'autoMobileImagePath' && state.blocks[index].type === 'image') {
    ensureArticleCodeForAssets();
    state.blocks[index].mobileSrc = buildArticleAssetPath(`${imageSlotName(state.blocks[index])}-mobile`, state.blocks[index].mobileSrc || state.blocks[index].src || 'image.jpg');
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
    ensureArticleCodeForAssets();
    block.items[itemIndex].src = buildArticleAssetPath(`duo-${itemIndex + 1}`, block.items[itemIndex].src || 'image.jpg');
  }

  renderBlockList();
  updatePreview();
  markSaved('Editing');
}

function handleCaptionRichAction(blockId, action, button) {
  const editor = button.closest('.caption-editor')?.querySelector('.rich-caption-editor');
  const block = state.blocks.find(item => item.id === blockId);
  if (!editor || !block) return;

  editor.focus();
  if (action === 'bold') {
    document.execCommand('bold', false);
  } else if (action === 'underline') {
    document.execCommand('underline', false);
  } else if (action === 'externalLink') {
    showLinkEditor({ editor, type: 'external', range: captureEditorRange(editor) });
    return;
  } else if (action === 'productLink') {
    showLinkEditor({ editor, type: 'product', range: captureEditorRange(editor) });
    return;
  } else if (action === 'popupLink') {
    showLinkEditor({ editor, type: 'popup', range: captureEditorRange(editor) });
    return;
  }

  syncCaptionEditor(editor);
}

function handleSlideAction(blockId, action, imageIndex) {
  const block = state.blocks.find(item => item.id === blockId);
  if (!block || block.type !== 'slide') return;
  block.images = normalizeSlideImages(block.images);

  if (action === 'add') {
    ensureArticleCodeForAssets();
    block.images.push(buildArticleAssetPath(`slide-${block.images.length + 1}`, 'image.jpg'));
  } else if (action === 'remove') {
    if (block.images.length <= 1) {
      block.images = [''];
      markSaved('Keep one image');
      renderBlockList();
      updatePreview();
      return;
    }
    block.images.splice(imageIndex, 1);
  } else if (action === 'autoPath' && block.images[imageIndex] !== undefined) {
    ensureArticleCodeForAssets();
    block.images[imageIndex] = buildArticleAssetPath(`slide-${imageIndex + 1}`, block.images[imageIndex] || 'image.jpg');
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
  const slideIndex = Number(input.dataset.slideIndex);
  ensureArticleCodeForAssets();
  const slot = uploadTarget === 'duo'
    ? `duo-${duoIndex + 1}`
    : uploadTarget === 'slide'
      ? `slide-${slideIndex + 1}`
      : uploadTarget === 'imageMobile'
        ? `${imageSlotName(block)}-mobile`
        : imageSlotName(block);
  const assetPath = buildArticleAssetPath(slot, file.name);

  try {
    markSaved('Uploading');
    const result = await uploadImageToR2(file, assetPath);
    const savedPath = result.path || assetPath;

    if (uploadTarget === 'duo') {
      block.items = normalizeDuoItems(block.items);
      if (block.items[duoIndex]) block.items[duoIndex].src = savedPath;
    } else if (uploadTarget === 'slide') {
      block.images = normalizeSlideImages(block.images);
      if (block.images[slideIndex] !== undefined) block.images[slideIndex] = savedPath;
    } else if (uploadTarget === 'imageMobile') {
      block.mobileSrc = savedPath;
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
    showLinkEditor({ editor, type: 'external', range: captureEditorRange(editor) });
    return;
  } else if (action === 'productLink') {
    showLinkEditor({ editor, type: 'product', range: captureEditorRange(editor) });
    return;
  } else if (action === 'popupLink') {
    showLinkEditor({ editor, type: 'popup', range: captureEditorRange(editor) });
    return;
  }

  ensureRichNodeStructure(editor);
  block.children = serializeTextEditor(editor);
  updatePreview();
  markSaved('Editing');
}

function showLinkPopover(link) {
  activeRichLink = link;
  activeLinkEditor = null;
  const popover = getLinkPopover();
  popover.className = 'link-popover';
  popover.innerHTML = compactLinkPopoverHtml();
  const rect = link.getBoundingClientRect();
  const label = link.dataset.linkType === 'product' ? '상품 링크' : link.dataset.linkType === 'popup' ? '팝업 링크' : '외부 링크';
  popover.querySelector('[data-link-popover-label]').textContent = label;
  popover.style.left = `${Math.min(window.innerWidth - 220, Math.max(12, rect.left))}px`;
  popover.style.top = `${Math.max(12, rect.top - 42)}px`;
  popover.hidden = false;
}

function hideLinkPopover() {
  const popover = document.querySelector('.link-popover');
  if (popover) popover.hidden = true;
  activeRichLink = null;
  activeLinkEditor = null;
}

function getLinkPopover() {
  let popover = document.querySelector('.link-popover');
  if (popover) return popover;
  popover = document.createElement('div');
  popover.className = 'link-popover';
  popover.hidden = true;
  popover.innerHTML = compactLinkPopoverHtml();
  document.body.appendChild(popover);
  return popover;
}

function compactLinkPopoverHtml() {
  return `<span data-link-popover-label>링크</span>
    <button type="button" data-link-popover-action="edit">수정</button>
    <button type="button" data-link-popover-action="open">열기</button>
    <button type="button" data-link-popover-action="remove">해제</button>`;
}

function handleLinkPopoverAction(action) {
  if (!activeRichLink) return;
  const link = activeRichLink;
  const editor = link.closest('.rich-editor, .rich-caption-editor');
  if (action === 'edit') {
    showLinkEditor({
      editor,
      link,
      type: link.dataset.linkType || 'external',
    });
    return;
  } else if (action === 'open') {
    const href = link.getAttribute('href');
    if (href && href !== '#') window.open(href, '_blank', 'noopener');
  } else if (action === 'remove') {
    unwrapElement(link);
  }

  syncRichEditorElement(editor);
  hideLinkPopover();
}

function showLinkEditor({ editor, link = null, type = 'external', range = null }) {
  if (!editor && link) editor = link.closest('.rich-editor, .rich-caption-editor');
  if (!editor) return;

  const popover = getLinkPopover();
  const selectedText = range ? range.toString().trim() : '';
  const linkType = ['external', 'product', 'popup'].includes(type) ? type : 'external';
  const values = link
    ? linkValuesFromElement(link)
    : {
      type: linkType,
      text: selectedText,
      url: linkType === 'product' ? 'https://anu-seoul.com/product/' : 'https://',
      popupTitle: selectedText,
      popupContent: '',
    };

  activeRichLink = link;
  activeLinkEditor = {
    editor,
    link,
    range,
  };

  popover.className = 'link-popover link-popover--editor';
  popover.innerHTML = linkEditorHtml(values);
  positionLinkEditorPopover(popover, link, range, editor);
  popover.hidden = false;
  updateLinkEditorFields();

  const firstField = popover.querySelector('[data-link-field="url"], [data-link-field="popupTitle"]');
  if (firstField) firstField.focus({ preventScroll: true });
}

function linkValuesFromElement(link) {
  const type = link.dataset.linkType || 'external';
  return {
    type,
    text: link.textContent.trim(),
    url: type === 'product' ? link.dataset.productUrl || link.href || '' : link.getAttribute('href') || '',
    popupTitle: link.dataset.popupTitle || link.textContent.trim(),
    popupContent: link.dataset.popupContent || '',
  };
}

function linkEditorHtml(values) {
  return `<form class="link-editor-form" data-link-editor-form>
    <label>
      <span>링크 유형</span>
      <select data-link-field="type">
        <option value="external"${values.type === 'external' ? ' selected' : ''}>외부 링크</option>
        <option value="product"${values.type === 'product' ? ' selected' : ''}>상품 링크</option>
        <option value="popup"${values.type === 'popup' ? ' selected' : ''}>팝업 링크</option>
      </select>
    </label>
    <label>
      <span>표시 문구</span>
      <input data-link-field="text" value="${escapeAttr(values.text || '')}" placeholder="화면에 보일 문구">
    </label>
    <label data-link-field-wrap="url">
      <span>URL</span>
      <input data-link-field="url" value="${escapeAttr(values.url || '')}" placeholder="https://">
    </label>
    <label data-link-field-wrap="popup">
      <span>팝업 제목</span>
      <input data-link-field="popupTitle" value="${escapeAttr(values.popupTitle || '')}" placeholder="제목">
    </label>
    <label data-link-field-wrap="popup">
      <span>팝업 내용</span>
      <textarea data-link-field="popupContent" rows="3" placeholder="팝업에 들어갈 내용">${escapeHtml(values.popupContent || '')}</textarea>
    </label>
    <div class="link-editor-form__actions">
      <button type="button" data-link-editor-action="cancel">취소</button>
      <button type="submit">적용</button>
    </div>
  </form>`;
}

function positionLinkEditorPopover(popover, link, range, editor) {
  const rect = link?.getBoundingClientRect?.()
    || range?.getBoundingClientRect?.()
    || editor.getBoundingClientRect();
  const left = Math.min(window.innerWidth - 336, Math.max(12, rect.left || 12));
  const top = Math.min(window.innerHeight - 320, Math.max(12, (rect.bottom || rect.top || 12) + 8));
  popover.style.left = `${left}px`;
  popover.style.top = `${top}px`;
}

function updateLinkEditorFields() {
  const popover = document.querySelector('.link-popover--editor');
  if (!popover) return;
  const type = popover.querySelector('[data-link-field="type"]')?.value || 'external';
  popover.querySelectorAll('[data-link-field-wrap="url"]').forEach(item => {
    item.hidden = type === 'popup';
  });
  popover.querySelectorAll('[data-link-field-wrap="popup"]').forEach(item => {
    item.hidden = type !== 'popup';
  });
}

function applyLinkEditor() {
  const popover = document.querySelector('.link-popover--editor');
  if (!popover || !activeLinkEditor) return;

  const type = popover.querySelector('[data-link-field="type"]')?.value || 'external';
  const text = popover.querySelector('[data-link-field="text"]')?.value.trim() || '';
  const url = popover.querySelector('[data-link-field="url"]')?.value.trim() || '';
  const popupTitle = popover.querySelector('[data-link-field="popupTitle"]')?.value.trim() || '';
  const popupContent = popover.querySelector('[data-link-field="popupContent"]')?.value.trim() || '';
  const fallbackLabel = type === 'popup' ? popupTitle || 'Popup' : url || 'Link';
  const attributes = linkAttributesFromValues({ type, url, popupTitle, popupContent });
  if (!attributes) {
    markSaved('Invalid URL');
    return;
  }

  if (activeLinkEditor.link) {
    applyAttributesToLink(activeLinkEditor.link, attributes, text || fallbackLabel);
    syncRichEditorElement(activeLinkEditor.link.closest('.rich-editor, .rich-caption-editor'));
  } else {
    insertInlineLink(activeLinkEditor.editor, attributes, text || fallbackLabel, activeLinkEditor.range);
    syncRichEditorElement(activeLinkEditor.editor);
  }

  hideLinkPopover();
}

function linkAttributesFromValues({ type, url, popupTitle, popupContent }) {
  if (type === 'popup') {
    return {
      href: '#',
      'data-link-type': 'popup',
      'data-popup-title': popupTitle || 'Popup',
      'data-popup-content': popupContent || '',
    };
  }

  if (!url || !safeHref(url)) return null;
  if (type === 'product') {
    const productNo = parseProductNo(url);
    return {
      href: url,
      target: '_blank',
      rel: 'noopener',
      'data-link-type': 'product',
      'data-product-url': url,
      'data-product-no': productNo,
    };
  }

  return {
    href: url,
    target: '_blank',
    rel: 'noopener',
    'data-link-type': 'external',
  };
}

function applyAttributesToLink(link, attributes, label) {
  ['href', 'target', 'rel', 'data-link-type', 'data-product-code', 'data-product-no', 'data-product-url', 'data-popup-title', 'data-popup-content'].forEach(name => {
    link.removeAttribute(name);
  });
  Object.entries(attributes).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') link.setAttribute(key, String(value));
  });
  link.textContent = label;
}

function syncRichLinkBlock(link) {
  syncRichEditorElement(link.closest?.('.rich-editor, .rich-caption-editor'));
}

function syncRichEditorElement(editor) {
  if (!editor) return;
  if (editor.classList.contains('rich-caption-editor')) {
    syncCaptionEditor(editor);
    return;
  }
  syncRichEditorCard(editor.closest('.block-card'));
}

function syncCaptionEditor(editor) {
  const card = editor.closest('.block-card');
  const block = state.blocks.find(item => item.id === card?.dataset.id);
  if (!editor || !block) return;
  const key = editor.dataset.key;
  if (key === 'duoCaptionRich') {
    const index = Number(editor.dataset.duoIndex);
    block.items = normalizeDuoItems(block.items);
    if (block.items[index]) block.items[index].caption = sanitizeRichHtml(editor.innerHTML);
  } else {
    block.caption = sanitizeRichHtml(editor.innerHTML);
  }
  updatePreview();
  markSaved('Editing');
}

function syncRichEditorCard(card) {
  const editor = card?.querySelector('.rich-editor');
  const block = state.blocks.find(item => item.id === card?.dataset.id);
  if (!editor || !block) return;
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

function captureEditorRange(editor) {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return null;
  return range.cloneRange();
}

function insertInlineLink(editor, attributes, fallbackLabel, rangeOverride = null) {
  const selection = window.getSelection();
  if (!selection) return;

  if (rangeOverride) {
    selection.removeAllRanges();
    selection.addRange(rangeOverride);
  }

  if (selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!editor.contains(range.commonAncestorContainer)) return;

  const selectedText = range.toString().trim();
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
    const html = richHtmlToArticleInlineHtml(child.html);
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
    return {
      id,
      type,
      layout: 'img-m',
      src: buildArticleAssetPath('image-1', 'image.jpg'),
      mobileSrc: '',
      caption: '',
    };
  }

  if (type === 'duo') {
    return {
      id,
      type,
      layout: 'img-m-duo',
      items: [
        { src: buildArticleAssetPath('duo-1', 'image.jpg'), caption: '' },
        { src: buildArticleAssetPath('duo-2', 'image.jpg'), caption: '' },
      ],
      caption: '',
    };
  }

  if (type === 'slide') {
    return {
      id,
      type,
      images: [
        buildArticleAssetPath('slide-1', 'image.jpg'),
        buildArticleAssetPath('slide-2', 'image.jpg'),
      ],
      caption: '',
    };
  }

  if (type === 'video') {
    return {
      id,
      type,
      videoType: 'video-yt',
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
    type: els.articleType.value,
    publishDate: els.publishDate.value,
    cafe24ProductNo: els.cafe24ProductNo.value,
    cafe24ProductCode: els.cafe24ProductCode.value,
    productCategoryIds: els.productCategoryIds.value,
    articlePageId: els.articlePageId.value,
    editorPageId: els.editorPageId.value,
    deck: els.articleDeck.value,
  };
  updatePublishDateLabel();
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

function renderArticleList() {
  if (!state.articles.length) {
    els.articleList.innerHTML = '<p class="empty-state">불러오기를 눌러 노션 아티클을 가져오세요.</p>';
    return;
  }

  const filteredArticles = getFilteredArticles();
  if (!filteredArticles.length) {
    els.articleList.innerHTML = '<p class="empty-state">현재 필터에 맞는 아티클이 없습니다.</p>';
    return;
  }

  els.articleList.innerHTML = filteredArticles.map(({ article, index }) => {
    const selected = article.articlePageId && article.articlePageId === state.meta.articlePageId ? ' is-active' : '';
    return `<button class="article-row${selected}" type="button" data-article-index="${index}">
      <span>${escapeHtml(article.articleCode || 'NO-CODE')}</span>
      <strong>${escapeHtml(article.koreanTitle || article.englishTitle || 'Untitled')}</strong>
      <em>${escapeHtml(article.status || '')}</em>
    </button>`;
  }).join('');
}

function getFilteredArticles() {
  const query = state.articleQuery.trim().toLowerCase();
  const status = state.articleStatusFilter;
  return state.articles
    .map((article, index) => ({ article, index }))
    .filter(({ article }) => {
      const matchesStatus = status === 'all' || article.status === status;
      if (!matchesStatus) return false;
      if (!query) return true;
      return [
        article.articleCode,
        article.koreanTitle,
        article.englishTitle,
        article.status,
        article.category,
        article.type,
      ].some(value => String(value || '').toLowerCase().includes(query));
    });
}

function selectArticle(index) {
  const article = state.articles[index];
  if (!article) return;

  const payload = article.editorData && Array.isArray(article.editorData.blocks)
    ? article.editorData
    : {
      version: 3,
      meta: articleToEditorMeta(article),
      blocks: createStarterBlocks(article),
    };

  applyEditorPayload(payload);
  state.meta = Object.assign({}, state.meta, articleToEditorMeta(article));
  syncInputsFromMeta();
  renderArticleList();
  renderBlockList();
  updatePreview();
  markSaved('Loaded');
}

function articleToEditorMeta(article) {
  return {
    englishTitle: article.englishTitle || '',
    koreanTitle: article.koreanTitle || '',
    status: article.status || '등록 중',
    code: article.articleCode || '',
    category: article.category || 'craft',
    type: article.type || 'guide',
    publishDate: article.publishDate || '',
    cafe24ProductNo: article.cafe24ProductNo == null ? '' : String(article.cafe24ProductNo),
    cafe24ProductCode: article.cafe24ProductCode || '',
    productCategoryIds: article.productCategoryIds || '114|117',
    articlePageId: article.articlePageId || '',
    editorPageId: article.editorPageId || '',
    deck: article.deck || '',
  };
}

function createStarterBlocks(article) {
  const blocks = [];
  if (article.html) {
    blocks.push({ id: createBlockId(), type: 'text', children: [{ type: 'paragraph', html: 'Notion HTML 출력이 이미 있습니다. Copy HTML 또는 Save to Notion으로 덮어쓰기 전에 확인하세요.' }] });
  } else {
    blocks.push({ id: createBlockId(), type: 'text', children: [{ type: 'paragraph', html: '본문을 입력하세요.' }] });
  }
  return blocks;
}

function setViewport(width) {
  state.viewportWidth = Number(width);
  els.viewportRange.value = state.viewportWidth;
  els.viewportLabel.textContent = `${state.viewportWidth}px`;
  fitPreviewFrame();
}

function fitPreviewFrame() {
  const stage = els.deviceFrame.parentElement;
  if (!stage) return;
  const availableWidth = Math.max(320, stage.clientWidth - 48);
  const scale = Math.min(1, availableWidth / state.viewportWidth);
  const iframeHeight = Math.max(640, window.innerHeight - 210);
  els.deviceFrame.style.width = `${Math.round(state.viewportWidth * scale)}px`;
  els.deviceFrame.style.height = `${Math.round(iframeHeight * scale)}px`;
  els.previewFrame.style.width = `${state.viewportWidth}px`;
  els.previewFrame.style.height = `${iframeHeight}px`;
  els.previewFrame.style.transform = `scale(${scale})`;
  els.previewFrame.style.transformOrigin = 'top left';
}

function markSelected(blockId) {
  if (state.selectedBlockId === blockId) return;
  state.selectedBlockId = blockId;
  document.querySelectorAll('.block-card').forEach(card => {
    card.classList.toggle('is-selected', card.dataset.id === blockId);
  });
}

function scrollSelectedBlockIntoView() {
  window.requestAnimationFrame(() => {
    const card = Array.from(els.blockList.querySelectorAll('.block-card'))
      .find(item => item.dataset.id === state.selectedBlockId);
    if (!card) return;
    card.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}

function bindFloatingComposerDrag() {
  const composer = document.querySelector('.composer');
  const handle = document.querySelector('.composer__floatbar');
  if (!composer || !handle) return;

  let drag = null;
  handle.addEventListener('pointerdown', event => {
    if (!document.body.classList.contains('composer-floating')) return;
    if (event.target.closest('button')) return;
    const rect = composer.getBoundingClientRect();
    drag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top,
    };
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const nextLeft = Math.max(8, Math.min(window.innerWidth - 320, drag.left + event.clientX - drag.startX));
    const nextTop = Math.max(72, Math.min(window.innerHeight - 120, drag.top + event.clientY - drag.startY));
    composer.style.left = `${nextLeft}px`;
    composer.style.top = `${nextTop}px`;
  });

  handle.addEventListener('pointerup', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    handle.releasePointerCapture(event.pointerId);
  });
}

async function copyCurrentHtml() {
  const html = exportArticleHtml(state.blocks);
  const copied = await writeClipboard(html);
  markSaved(copied ? 'HTML copied' : 'Copy failed');
  closeUtilityMenu();
}

async function copyCurrentJson() {
  const copied = await writeClipboard(JSON.stringify(buildEditorPayload(), null, 2));
  markSaved(copied ? 'JSON copied' : 'Copy failed');
  closeUtilityMenu();
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
  persistDraft();
  markSaved('Saved local');
  closeUtilityMenu();
}

function closeUtilityMenu() {
  if (els.utilityMenu) els.utilityMenu.open = false;
}

function persistDraft() {
  const payload = buildEditorPayload();
  localStorage.setItem(EDITOR_STORAGE_KEY, JSON.stringify(payload));
}

function scheduleDraftAutosave() {
  window.clearTimeout(draftAutosaveTimer);
  draftAutosaveTimer = window.setTimeout(() => {
    persistDraft();
    if (els.saveState.textContent === '편집 중') {
      els.saveState.textContent = '자동 저장됨';
    }
  }, 900);
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
  els.articleCategory.value = state.meta.category || 'craft';
  els.articleType.value = state.meta.type || 'guide';
  els.publishDate.value = state.meta.publishDate || '';
  els.cafe24ProductNo.value = state.meta.cafe24ProductNo || '';
  els.cafe24ProductCode.value = state.meta.cafe24ProductCode || '';
  els.productCategoryIds.value = state.meta.productCategoryIds || '114|117';
  els.articlePageId.value = state.meta.articlePageId || '';
  els.editorPageId.value = state.meta.editorPageId || '';
  els.articleDeck.value = state.meta.deck || '';
  updatePublishDateLabel();
}

async function runGasAction(action) {
  try {
    markGasState('Running');
    const result = await callGasApi(action);
    if (result.csv) {
      downloadText(result.csv, result.filename || `${action}.csv`, result.mimeType || 'text/csv;charset=utf-8');
    }
    if (result.sheetUrl) window.open(result.sheetUrl, '_blank', 'noopener');
    markGasState(result.message || 'Done');
  } catch (error) {
    markGasState(error.message || 'Failed');
  }
}

async function callGasApi(action, extraPayload = {}) {
  const endpoint = getPipelineEndpoint();
  if (!endpoint) {
    markGasState('Add GAS URL');
    els.gasEndpoint.focus();
    throw new Error('Add GAS URL');
  }

  const payload = buildEditorPayload();
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(Object.assign({
      action,
      token: els.gasToken.value.trim(),
      editorPageId: els.editorPageId.value.trim(),
      articlePageId: els.articlePageId.value.trim(),
      editorData: payload,
      meta: state.meta,
      html: payload.html,
      articleCode: state.meta.code,
    }, extraPayload)),
  });
  const result = await response.json();
  if (!result.ok) throw new Error(result.error || 'GAS request failed');
  return result;
}

async function loadArticlesFromNotion() {
  try {
    markSaved('Loading');
    const result = await callGasApi('listArticles', { includeAll: true });
    state.articles = result.articles || [];
    renderArticleList();
    markGasState(result.message || `Loaded ${state.articles.length}`);
    markSaved('Loaded');
  } catch (error) {
    markGasState(error.message || 'Load failed');
    markSaved('Load failed');
  }
}

async function generateAndSetArticleCode() {
  try {
    const result = await callGasApi('generateArticleCode');
    els.articleCode.value = result.articleCode || generateLocalArticleCode();
  } catch (error) {
    els.articleCode.value = generateLocalArticleCode();
  }
  syncMetaFromInputs();
  markSaved('Code ready');
}

function generateLocalArticleCode() {
  const year = String(new Date().getFullYear()).slice(2);
  const prefix = `ARTI${year}-`;
  const max = state.articles.reduce((acc, article) => {
    const match = String(article.articleCode || '').match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
    return match ? Math.max(acc, Number(match[1])) : acc;
  }, 0);
  return `${prefix}${String(max + 1).padStart(3, '0')}`;
}

function ensureArticleCodeForAssets() {
  if (state.meta.code && state.meta.code.trim()) return;
  els.articleCode.value = generateLocalArticleCode();
  syncMetaFromInputs();
  markSaved('Code ready');
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
  els.gasState.textContent = statusLabel(label);
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
  els.saveState.textContent = statusLabel(label);
  if (label === 'Editing') scheduleDraftAutosave();
  window.clearTimeout(markSaved.timer);
  markSaved.timer = window.setTimeout(() => {
    els.saveState.textContent = '저장됨';
  }, 1400);
}

function statusLabel(label) {
  const labels = {
    'Add GAS URL': 'GAS URL 필요',
    'Autosaved': '자동 저장됨',
    'Code ready': '코드 준비됨',
    'Copy failed': '복사 실패',
    'Done': '완료',
    'Editing': '편집 중',
    'Failed': '실패',
    'HTML copied': 'HTML 복사됨',
    'Imported': '가져오기 완료',
    'Import failed': '가져오기 실패',
    'Invalid URL': 'URL 확인 필요',
    'JSON copied': 'JSON 복사됨',
    'Keep one block': '블록은 1개 이상 필요',
    'Keep one image': '이미지는 1개 이상 필요',
    'Loaded': '불러옴',
    'Load failed': '불러오기 실패',
    'Loading': '불러오는 중',
    'Ready': '준비됨',
    'Running': '실행 중',
    'Saved': '저장됨',
    'Saved local': '로컬 저장됨',
    'Uploaded': '업로드됨',
    'Uploading': '업로드 중',
    'Upload failed': '업로드 실패',
  };
  return labels[label] || label;
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

function normalizeSlideImages(images) {
  const normalized = Array.isArray(images)
    ? images.map(src => String(src || '').trim()).filter(Boolean)
    : linesFromText(images);
  return normalized.length ? normalized : [buildArticleAssetPath('slide-1', 'image.jpg')];
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
  const html = richHtmlToArticleInlineHtml(caption);
  return html ? `
    <p class="arti-caption${className ? ` ${escapeAttr(className)}` : ''}">${html}</p>` : '';
}

function sanitizeRichHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = String(value || '');
  cleanRichNode(template.content);
  return template.innerHTML.trim();
}

function richHtmlToArticleInlineHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = sanitizeRichHtml(value);
  template.content.querySelectorAll('a[data-link-type]').forEach(link => {
    const type = link.dataset.linkType;
    if (type === 'product') {
      link.className = 'arti-product-link';
      link.href = link.dataset.productUrl || link.getAttribute('href') || '#';
      link.target = '_blank';
      link.rel = 'noopener';
      return;
    }

    if (type === 'external') {
      link.className = 'arti-ext-link';
      link.target = '_blank';
      link.rel = 'noopener';
      return;
    }

    if (type === 'popup') {
      const trigger = document.createElement('span');
      trigger.className = 'arti-note-trigger';
      trigger.textContent = link.textContent;

      const popup = document.createElement('span');
      popup.className = 'arti-note-popup';

      const title = document.createElement('span');
      title.className = 'popup-title';
      title.textContent = link.dataset.popupTitle || link.textContent;

      popup.appendChild(title);
      popup.appendChild(document.createTextNode(link.dataset.popupContent || ''));
      trigger.appendChild(popup);
      link.replaceWith(trigger);
    }
  });
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

      ['target', 'rel', 'data-link-type', 'data-product-code', 'data-product-no', 'data-product-url', 'data-popup-title', 'data-popup-content'].forEach(name => {
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

function parseProductNo(value) {
  const text = String(value || '');
  return text.match(/\/product\/(?:[^/]+\/)?(\d+)(?:\/|\?|#|$)/)?.[1]
    || text.match(/[?&](?:product_no|productNo|no)=(\d+)/)?.[1]
    || text.match(/상품:(\d+)/)?.[1]
    || '';
}

function lineBreaks(value) {
  return escapeHtml(value).replace(/\n{2,}/g, '</p><p class="basic-p">').replace(/\n/g, '<br>');
}

function optionHtml(value, selectedValue, label = value) {
  const selected = value === selectedValue ? ' selected' : '';
  return `<option value="${escapeAttr(value)}"${selected}>${escapeHtml(label)}</option>`;
}

function iconHtml(name) {
  return `<i data-lucide="${escapeAttr(name)}" aria-hidden="true"></i>`;
}

function refreshIcons() {
  if (window.lucide && typeof window.lucide.createIcons === 'function') {
    window.lucide.createIcons();
  }
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

renderArticleList();
renderBlockList();
bindEvents();
loadDraft();
setViewport(1440);
updatePublishDateLabel();
refreshIcons();
