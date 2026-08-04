/**
 * ANU Cafe24 article registration pipeline for Google Apps Script.
 *
 * Flow:
 * 1. Pull article metadata from Notion Article DB.
 * 2. Pull Korean title and converted HTML from linked Article Editor DB.
 * 3. Build a review sheet.
 * 4. Generate Cafe24 product registration rows using the fixed 102-column CSV format.
 *
 * Required Script Properties:
 * - NOTION_TOKEN
 */

const CONFIG = {
  notionVersion: '2026-03-11',
  articleDataSourceId: '3728b5ef-745d-8007-9851-000b0fffb289',
  editorDataSourceId: '3738b5ef-745d-8088-976a-000b11f7d3a1',
  articleR2BaseUrl: 'https://pub-14eaf4c4a9324927bf2879a272de972a.r2.dev',
  defaultCategoryIds: '114|117',
  defaultDisplayState: 'Y',
  defaultSellingState: 'N',
  syncExcludedStatusNames: ['시작 전', '작성 중'],
  registrationStatusName: '등록 중',
  updateStatusName: '업데이트',
  converterVersion: 'gas-article-converter-0.1.0',
  webEditorVersion: 'web-editor-v2',
  editorDataPropertyName: '에디터 데이터',
  sourceSheetName: 'Articles',
  registrationSheetName: 'Cafe24_Article_Registration',
  updateSheetName: 'Cafe24_Article_Update',
};

const ARTICLE_SHEET_HEADERS = [
  'Notion Page ID',
  'Notion URL',
  '상태',
  '제목(영문)',
  '상품명',
  '아티클코드',
  '요약(Deck)',
  '카테고리',
  '타입',
  '일자',
  '발행일',
  'HTML 출력',
  '카페24 상품번호',
  '카페24 상품코드',
  '상품분류 번호',
  'SEO Title',
  'SEO Description',
  'SEO Keywords',
  'SEO Alt',
  '대표 이미지 URL',
  '검수 상태',
];

const CAFE24_HEADERS = [
  '상품코드',
  '자체 상품코드',
  '진열상태',
  '판매상태',
  '상품분류 번호',
  '상품분류 신상품영역',
  '상품분류 추천상품영역',
  '상품명',
  '영문 상품명',
  '상품명(관리용)',
  '공급사 상품명',
  '모델명',
  '상품 요약설명',
  '상품 간략설명',
  '상품 상세설명',
  '모바일 상품 상세설명 설정',
  '모바일 상품 상세설명',
  '검색어설정',
  '과세구분',
  '소비자가',
  '공급가',
  '상품가',
  '판매가',
  '판매가 대체문구 사용',
  '판매가 대체문구',
  '주문수량 제한 기준',
  '최소 주문수량(이상)',
  '최대 주문수량(이하)',
  '적립금',
  '적립금 구분',
  '공통이벤트 정보',
  '성인인증',
  '옵션사용',
  '품목 구성방식',
  '옵션 표시방식',
  '옵션세트명',
  '옵션입력',
  '옵션 스타일',
  '버튼이미지 설정',
  '색상 설정',
  '필수여부',
  '품절표시 문구',
  '추가입력옵션',
  '추가입력옵션 명칭',
  '추가입력옵션 선택/필수여부',
  '입력글자수(자)',
  '이미지등록(상세)',
  '이미지등록(목록)',
  '이미지등록(작은목록)',
  '이미지등록(축소)',
  '이미지등록(추가)',
  '제조사',
  '공급사',
  '브랜드',
  '트렌드',
  '자체분류 코드',
  '제조일자',
  '출시일자',
  '유효기간 사용여부',
  '유효기간',
  '원산지',
  '상품부피(cm)',
  '상품결제안내',
  '상품배송안내',
  '교환/반품안내',
  '서비스문의/안내',
  '배송정보',
  '배송방법',
  '국내/해외배송',
  '배송지역',
  '배송비 선결제 설정',
  '배송기간',
  '배송비 구분',
  '배송비입력',
  '스토어픽업 설정',
  '상품 전체중량(kg)',
  'HS코드',
  '상품 구분(해외통관)',
  '상품소재',
  '영문 상품소재(해외통관)',
  '옷감(해외통관)',
  '검색엔진최적화(SEO) 검색엔진 노출 설정',
  '검색엔진최적화(SEO) Title',
  '검색엔진최적화(SEO) Author',
  '검색엔진최적화(SEO) Description',
  '검색엔진최적화(SEO) Keywords',
  '검색엔진최적화(SEO) 상품 이미지 Alt 텍스트',
  '개별결제수단설정',
  '상품배송유형 코드',
  '메모',
  '추가항목01_[b2b 머티리얼] ',
  '추가항목02_[ b2b 머티리얼] 구성',
  '추가항목03_[ b2b 머티리얼] 흡수율',
  '추가항목04_[ b2b 머티리얼] 제작방식',
  '추가항목05_[ b2b 머티리얼] 활용가능 제품군',
  '추가항목06_[b2b 머티리얼] 평판 제작 가능 최대 사이즈',
  '추가항목07_(b2b 머티리얼) 분류-컬러',
  '추가항목08_(b2b 머티리얼) 분류-텍스쳐',
  '추가항목09_(b2b 머티리얼) 분류-흡수력',
  '추가항목10_아티클-일자',
  '추가항목11_아티클-카테고리1',
  '추가항목12_아티클-카테고리2',
];

const CAFE24_UPDATE_HEADERS = ['상품번호'].concat(CAFE24_HEADERS);

function doPost(e) {
  try {
    const payload = parseApiPayload_(e);
    requireWebAppToken_(payload.token);
    const result = handleApiAction_(payload);
    return jsonResponse_(Object.assign({ ok: true }, result));
  } catch (error) {
    return jsonResponse_({
      ok: false,
      error: error && error.message ? error.message : String(error),
    });
  }
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('ANU Articles')
    .addItem('Run all', 'runAllArticlePipeline')
    .addSeparator()
    .addItem('1. Setup sheets', 'setupArticleSheets')
    .addItem('2. Convert linked editor HTML', 'convertTargetArticleEditors')
    .addItem('3. Sync active articles from Notion', 'syncArticlesFromNotion')
    .addItem('4. Build Cafe24 registration sheet', 'buildCafe24ArticleRegistrationSheet')
    .addItem('5. Build Cafe24 update sheet', 'buildCafe24ArticleUpdateSheet')
    .addToUi();
}

function runAllArticlePipeline() {
  setupArticleSheets();
  convertTargetArticleEditors();
  syncArticlesFromNotion();
  buildCafe24ArticleRegistrationSheet();
  buildCafe24ArticleUpdateSheet();
  notify_('Run all complete');
}

function setupArticleSheets() {
  writeHeaderRow_(getOrCreateSheet_(CONFIG.sourceSheetName), ARTICLE_SHEET_HEADERS);
  writeHeaderRow_(getOrCreateSheet_(CONFIG.registrationSheetName), CAFE24_HEADERS);
  writeHeaderRow_(getOrCreateSheet_(CONFIG.updateSheetName), CAFE24_UPDATE_HEADERS);
}

function convertTargetArticleEditors() {
  const pages = queryAllDataSourcePages_(CONFIG.articleDataSourceId, {
    filter: buildSyncStatusFilter_(),
    sorts: [{ property: '발행일', direction: 'descending' }],
  });
  const editorCache = {};
  let converted = 0;
  let skipped = 0;
  let failed = 0;

  pages.forEach((page) => {
    const props = page.properties || {};
    const editorId = firstRelationId_(props['편집기']);
    if (!editorId) {
      skipped += 1;
      return;
    }

    const articleCode = plainText_(props['아티클코드']);
    const editor = getEditorPage_(editorId, editorCache);
    if (!shouldConvertEditor_(editor)) {
      skipped += 1;
      return;
    }

    try {
      const blocks = retrieveAllBlockChildren_(editorId);
      const report = [];
      const html = convertBlocksToArticleHtml_(blocks, { articleCode, report });
      updateEditorHtmlOutput(editorId, html, report.join('\n'));
      converted += 1;
    } catch (error) {
      failed += 1;
      updateEditorConvertError_(editorId, error);
    }
  });

  notify_(`HTML convert: ${converted} converted, ${skipped} skipped, ${failed} failed`);
}

function syncArticlesFromNotion() {
  const pages = queryAllDataSourcePages_(CONFIG.articleDataSourceId, {
    filter: buildSyncStatusFilter_(),
    sorts: [{ property: '발행일', direction: 'descending' }],
  });
  const editorCache = {};

  const rows = pages.map((page) => {
    const props = page.properties || {};
    const editorId = firstRelationId_(props['편집기']);
    const editor = editorId ? getEditorPage_(editorId, editorCache) : null;
    const articleCode = plainText_(props['아티클코드']);
    const imageUrl = articleCode ? getArticleImageUrl_(articleCode) : '';
    const html = editor ? plainText_(editor.properties['HTML 출력']) : '';
    const productName = editor ? titleText_(editor.properties['이름']) : '';

    return [
      page.id,
      page.url || '',
      statusName_(props['상태']),
      titleText_(props['제목(영문)']),
      productName,
      articleCode,
      plainText_(props['요약(Deck)']),
      selectName_(props['카테고리']),
      selectName_(props['타입']),
      plainText_(props['일자']),
      dateStart_(props['발행일']),
      html,
      numberValue_(props['카페24 상품번호']),
      plainText_(props['카페24 상품코드']),
      plainText_(props['상품분류 번호']),
      plainText_(props['SEO Title']),
      plainText_(props['SEO Description']),
      plainText_(props['SEO Keywords']),
      plainText_(props['SEO Alt']),
      imageUrl,
      validateArticleRow_({ articleCode, productName, html }),
    ];
  });

  const sheet = getOrCreateSheet_(CONFIG.sourceSheetName);
  sheet.clearContents();
  sheet.getRange(1, 1, 1, ARTICLE_SHEET_HEADERS.length).setValues([ARTICLE_SHEET_HEADERS]);
  if (rows.length) {
    sheet.getRange(2, 1, rows.length, ARTICLE_SHEET_HEADERS.length).setValues(rows);
  }
  sheet.autoResizeColumns(1, ARTICLE_SHEET_HEADERS.length);
  notify_(`Synced ${rows.length} article(s), excluding: ${CONFIG.syncExcludedStatusNames.join(', ')}`);
}

function buildCafe24ArticleRegistrationSheet() {
  const articles = readArticleObjects_();
  const rows = articles
    .filter(isRegistrationArticle_)
    .map((article) => buildCafe24Row_(article, { mode: 'registration' }));

  const exportSheet = getOrCreateSheet_(CONFIG.registrationSheetName);
  exportSheet.clearContents();
  exportSheet.getRange(1, 1, 1, CAFE24_HEADERS.length).setValues([CAFE24_HEADERS]);
  if (rows.length) {
    exportSheet.getRange(2, 1, rows.length, CAFE24_HEADERS.length).setValues(rows);
  }
  exportSheet.autoResizeColumns(1, Math.min(CAFE24_HEADERS.length, 20));
  notify_(`Registration export: ${rows.length} row(s) from ${articles.length} synced article(s)`);
}

function buildCafe24ArticleUpdateSheet() {
  const articles = readArticleObjects_();
  const rows = articles
    .filter(isUpdateArticle_)
    .map((article) => [article['카페24 상품번호'] || ''].concat(buildCafe24Row_(article, { mode: 'update' })));

  const exportSheet = getOrCreateSheet_(CONFIG.updateSheetName);
  exportSheet.clearContents();
  exportSheet.getRange(1, 1, 1, CAFE24_UPDATE_HEADERS.length).setValues([CAFE24_UPDATE_HEADERS]);
  if (rows.length) {
    exportSheet.getRange(2, 1, rows.length, CAFE24_UPDATE_HEADERS.length).setValues(rows);
  }
  exportSheet.autoResizeColumns(1, Math.min(CAFE24_UPDATE_HEADERS.length, 20));
  notify_(`Update export: ${rows.length} row(s) from ${articles.length} synced article(s)`);
}

function buildCafe24ArticleCsvSheet() {
  buildCafe24ArticleRegistrationSheet();
}

function handleApiAction_(payload) {
  const action = payload.action || 'runAll';
  switch (action) {
    case 'runAll':
      runAllArticlePipeline();
      return {
        message: 'Run all complete',
        sheetUrl: SpreadsheetApp.getActive().getUrl(),
      };

    case 'buildRegistration':
      buildCafe24ArticleRegistrationSheet();
      return {
        message: 'Registration sheet built',
        sheetUrl: SpreadsheetApp.getActive().getUrl(),
      };

    case 'buildUpdate':
      buildCafe24ArticleUpdateSheet();
      return {
        message: 'Update sheet built',
        sheetUrl: SpreadsheetApp.getActive().getUrl(),
      };

    case 'exportRegistrationCsv':
      buildCafe24ArticleRegistrationSheet();
      return buildCsvApiResponse_(CONFIG.registrationSheetName, 'cafe24_article_registration.csv');

    case 'exportUpdateCsv':
      buildCafe24ArticleUpdateSheet();
      return buildCsvApiResponse_(CONFIG.updateSheetName, 'cafe24_article_update.csv');

    case 'saveEditorData':
      return saveEditorDataFromApi_(payload);

    case 'listArticles':
      return listArticlesForApi_(payload);

    case 'generateArticleCode':
      return {
        message: 'Article code ready',
        articleCode: generateNextArticleCode_(),
      };

    default:
      throw new Error(`Unsupported API action: ${action}`);
  }
}

function saveEditorDataFromApi_(payload) {
  const editorPageId = String(payload.editorPageId || '').trim();
  if (!editorPageId) {
    throw new Error('Missing editorPageId');
  }

  const editorData = payload.editorData || {};
  const html = String(payload.html || editorData.html || '');
  if (!html) {
    throw new Error('Missing html');
  }

  const editorPage = getEditorPage_(editorPageId, {});
  const properties = pickExistingProperties_(editorPage, {
    '이름': titleProperty_(payload.meta && payload.meta.koreanTitle),
    'HTML 출력': richTextProperty_(html),
    [CONFIG.editorDataPropertyName]: richTextProperty_(JSON.stringify(editorData, null, 2)),
    '피드백': richTextProperty_('Saved from ANU Article Studio'),
    '변환 상태': selectProperty_('웹에디터 저장'),
    '변환기 버전': richTextProperty_(CONFIG.webEditorVersion),
    '변환 시각': dateProperty_(new Date()),
  });

  if (Object.keys(properties).length) {
    updateNotionPage_(editorPageId, properties);
  }

  const articlePageId = String(payload.articlePageId || '').trim();
  if (articlePageId) {
    updateArticleMetaFromApi_(articlePageId, payload.meta || {});
  }

  return {
    message: 'Editor data saved to Notion',
  };
}

function listArticlesForApi_(payload) {
  const query = {
    sorts: [{ property: '발행일', direction: 'descending' }],
  };
  if (!payload.includeAll) {
    query.filter = buildSyncStatusFilter_();
  }

  const pages = queryAllDataSourcePages_(CONFIG.articleDataSourceId, query);
  const editorCache = {};
  const articles = pages.map((page) => articlePageToApiObject_(page, editorCache));
  return {
    message: `Loaded ${articles.length} article(s) from Notion`,
    articles,
  };
}

function articlePageToApiObject_(page, editorCache) {
  const props = page.properties || {};
  const editorId = firstRelationId_(props['편집기']);
  const editor = editorId ? getEditorPage_(editorId, editorCache) : null;
  const editorProps = editor && editor.properties ? editor.properties : {};

  return {
    articlePageId: page.id,
    notionUrl: page.url || '',
    status: statusName_(props['상태']),
    englishTitle: titleText_(props['제목(영문)']),
    koreanTitle: editor ? titleText_(editorProps['이름']) : '',
    articleCode: plainText_(props['아티클코드']),
    deck: plainText_(props['요약(Deck)']),
    category: selectName_(props['카테고리']),
    type: selectName_(props['타입']),
    publishDate: dateStart_(props['발행일']),
    cafe24ProductNo: numberValue_(props['카페24 상품번호']),
    cafe24ProductCode: plainText_(props['카페24 상품코드']),
    productCategoryIds: plainText_(props['상품분류 번호']),
    editorPageId: editorId,
    html: editor ? plainText_(editorProps['HTML 출력']) : '',
    editorData: parseEditorData_(editor),
  };
}

function parseEditorData_(editor) {
  if (!editor || !editor.properties || !editor.properties[CONFIG.editorDataPropertyName]) {
    return null;
  }

  const raw = plainText_(editor.properties[CONFIG.editorDataPropertyName]);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch (error) {
    return null;
  }
}

function updateArticleMetaFromApi_(articlePageId, meta) {
  const articlePage = getEditorPage_(articlePageId, {});
  const properties = pickExistingProperties_(articlePage, {
    '상태': statusProperty_(meta.status),
    '제목(영문)': titleProperty_(meta.englishTitle),
    '아티클코드': richTextProperty_(meta.code),
    '요약(Deck)': richTextProperty_(meta.deck),
    '카테고리': selectProperty_(meta.category),
    '타입': selectProperty_(meta.type),
    '발행일': dateOnlyProperty_(meta.publishDate),
    '카페24 상품번호': numberProperty_(meta.cafe24ProductNo),
    '카페24 상품코드': richTextProperty_(meta.cafe24ProductCode),
    '상품분류 번호': richTextProperty_(meta.productCategoryIds || CONFIG.defaultCategoryIds),
  });

  if (Object.keys(properties).length) {
    updateNotionPage_(articlePageId, properties);
  }
}

function generateNextArticleCode_() {
  const year = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yy');
  const prefix = `ARTI${year}-`;
  const pages = queryAllDataSourcePages_(CONFIG.articleDataSourceId, {});
  let maxNumber = 0;

  pages.forEach((page) => {
    const code = plainText_(page.properties && page.properties['아티클코드']);
    const match = String(code || '').trim().match(new RegExp(`^${prefix}(\\d+)$`, 'i'));
    if (match) maxNumber = Math.max(maxNumber, Number(match[1]));
  });

  return `${prefix}${String(maxNumber + 1).padStart(3, '0')}`;
}

function buildCsvApiResponse_(sheetName, filename) {
  return {
    message: `${sheetName} CSV ready`,
    filename,
    mimeType: 'text/csv;charset=utf-8',
    csv: buildCsvFromSheet_(sheetName),
    sheetUrl: SpreadsheetApp.getActive().getUrl(),
  };
}

function shouldConvertEditor_(editor) {
  const props = editor.properties || {};
  const status = selectName_(props['변환 상태']);
  const html = plainText_(props['HTML 출력']);
  return status === '변환 요청' || !html;
}

function updateEditorConvertError_(editorPageId, error) {
  updateNotionPage_(editorPageId, {
    '피드백': richTextProperty_(`HTML 변환 오류: ${error.message || error}`),
    '변환 상태': selectProperty_('오류'),
    '변환기 버전': richTextProperty_(CONFIG.converterVersion),
    '변환 시각': dateProperty_(new Date()),
  });
}

function readArticleObjects_() {
  const sourceSheet = getOrCreateSheet_(CONFIG.sourceSheetName);
  const values = sourceSheet.getDataRange().getValues();
  if (values.length < 2) {
    throw new Error('Articles sheet is empty. Run syncArticlesFromNotion first.');
  }

  const header = values[0];
  assertRequiredHeaders_(header, ['상태']);
  return values.slice(1)
    .filter((row) => row.some((value) => value !== ''))
    .map((row) => objectFromRow_(header, row));
}

function isRegistrationArticle_(article) {
  return String(article['상태'] || '').trim() === CONFIG.registrationStatusName;
}

function isUpdateArticle_(article) {
  return String(article['상태'] || '').trim() === CONFIG.updateStatusName;
}

function assertRequiredHeaders_(headers, requiredHeaders) {
  const missing = requiredHeaders.filter((header) => headers.indexOf(header) === -1);
  if (missing.length) {
    throw new Error(`Articles sheet is missing required column(s): ${missing.join(', ')}. Run setupArticleSheets and syncArticlesFromNotion again.`);
  }
}

function updateEditorHtmlOutput(editorPageId, html, report) {
  const feedback = report ? String(report) : '';
  return updateNotionPage_(editorPageId, {
    'HTML 출력': richTextProperty_(html),
    '피드백': richTextProperty_(feedback),
    '변환 상태': selectProperty_('변환완료'),
    '변환기 버전': richTextProperty_(CONFIG.converterVersion),
    '변환 시각': dateProperty_(new Date()),
  });
}

function retrieveAllBlockChildren_(blockId) {
  const results = [];
  let cursor = null;
  do {
    const query = cursor ? `?page_size=100&start_cursor=${encodeURIComponent(cursor)}` : '?page_size=100';
    const response = notionFetch_(`/v1/blocks/${blockId}/children${query}`, { method: 'get' });
    results.push.apply(results, response.results || []);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);
  return results;
}

function convertBlocksToArticleHtml_(blocks, context) {
  const html = [];
  let listState = null;

  blocks.forEach((block) => {
    const converted = convertBlockToHtml_(block, context);
    const listType = getListType_(block);

    if (listType) {
      if (listState !== listType) {
        if (listState) html.push(`</${listState}>`);
        html.push(`<${listType}>`);
        listState = listType;
      }
      html.push(converted);
      return;
    }

    if (listState) {
      html.push(`</${listState}>`);
      listState = null;
    }
    if (converted) html.push(converted);
  });

  if (listState) html.push(`</${listState}>`);
  return html.filter(Boolean).join('\n');
}

function convertBlockToHtml_(block, context) {
  switch (block.type) {
    case 'paragraph':
      return wrapTextBlock_('p', block.paragraph.rich_text);
    case 'heading_1':
      return wrapTextBlock_('h2', block.heading_1.rich_text);
    case 'heading_2':
      return wrapTextBlock_('h3', block.heading_2.rich_text);
    case 'heading_3':
      return wrapTextBlock_('h4', block.heading_3.rich_text);
    case 'quote':
      return wrapTextBlock_('blockquote', block.quote.rich_text);
    case 'bulleted_list_item':
      return wrapTextBlock_('li', block.bulleted_list_item.rich_text);
    case 'numbered_list_item':
      return wrapTextBlock_('li', block.numbered_list_item.rich_text);
    case 'divider':
      return '<hr class="article-divider">';
    case 'image':
      return convertNotionImageBlock_(block.image);
    case 'callout':
      return convertCalloutBlock_(block.callout, context);
    default:
      if (context && context.report) {
        context.report.push(`Skipped unsupported block type: ${block.type}`);
      }
      return '';
  }
}

function getListType_(block) {
  if (block.type === 'bulleted_list_item') return 'ul';
  if (block.type === 'numbered_list_item') return 'ol';
  return '';
}

function wrapTextBlock_(tagName, richText) {
  const content = richTextToHtml_(richText).trim();
  return content ? `<${tagName}>${content}</${tagName}>` : '';
}

function convertNotionImageBlock_(image) {
  const src = image.type === 'external' ? image.external.url : image.file.url;
  const caption = richTextToHtml_(image.caption || []);
  return buildImageFigure_(src, caption, 'article-image');
}

function convertCalloutBlock_(callout, context) {
  const text = richTextArrayToPlain_(callout.rich_text || []);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) return '';

  const type = normalizeCalloutType_(lines[0]);
  const bodyLines = lines.slice(1);

  if (type === 'credit') {
    return `<section class="article-credit">${bodyLines.map((line) => `<p>${escapeHtml_(line)}</p>`).join('')}</section>`;
  }

  if (type === 'slide') {
    return buildImageGroup_(bodyLines, context, 'article-slide', 'article-slide__item');
  }

  if (type.indexOf('duo') !== -1) {
    return buildImageGroup_(bodyLines, context, `article-image-grid article-image-grid--${escapeAttribute_(type)}`, 'article-image-grid__item');
  }

  if (type.indexOf('img') !== -1 || type.indexOf('title') !== -1) {
    const image = parseImageLine_(bodyLines[0] || '', context);
    const caption = findCaption_(bodyLines) || image.caption;
    return buildImageFigure_(image.url, caption, `article-image article-image--${escapeAttribute_(type)}`);
  }

  return `<aside class="article-note">${bodyLines.map((line) => `<p>${escapeHtml_(line)}</p>`).join('')}</aside>`;
}

function normalizeCalloutType_(line) {
  const tokens = String(line || '').split(/\s+/).filter(Boolean);
  return (tokens[tokens.length - 1] || '').toLowerCase();
}

function buildImageGroup_(lines, context, groupClass, itemClass) {
  const figures = lines
    .map((line) => parseImageLine_(line, context))
    .filter((image) => image.url)
    .map((image) => buildImageFigure_(image.url, image.caption, itemClass));
  return figures.length ? `<div class="${groupClass}">\n${figures.join('\n')}\n</div>` : '';
}

function parseImageLine_(line, context) {
  const parts = String(line || '').split('|').map((part) => part.trim());
  return {
    url: normalizeAssetUrl_(parts[0] || '', context),
    caption: parts.slice(1).join(' | '),
  };
}

function findCaption_(lines) {
  const captionLine = lines.find((line) => /^caption\s*:/i.test(line));
  return captionLine ? captionLine.replace(/^caption\s*:\s*/i, '') : '';
}

function normalizeAssetUrl_(value, context) {
  const url = String(value || '').trim();
  if (!url || /^caption\s*:/i.test(url) || /^mobile\s*:/i.test(url)) return '';
  if (/^https?:\/\//i.test(url)) return url;
  if (url.charAt(0) === '/') return `${CONFIG.articleR2BaseUrl}${url}`;
  if (context && context.articleCode) return `${CONFIG.articleR2BaseUrl}${getArticleAssetFolder_(context.articleCode)}${url}`;
  return `${CONFIG.articleR2BaseUrl}/${url}`;
}

function buildImageFigure_(src, caption, className) {
  if (!src) return '';
  const captionHtml = caption ? `<figcaption>${escapeHtml_(caption)}</figcaption>` : '';
  return `<figure class="${className}"><img src="${escapeAttribute_(src)}" alt="">${captionHtml}</figure>`;
}

function richTextToHtml_(richText) {
  return (richText || []).map((item) => {
    let text = escapeHtml_(item.plain_text || '');
    text = text.replace(/\n/g, '<br>');
    if (item.href) text = `<a href="${escapeAttribute_(item.href)}" target="_blank" rel="noopener">${text}</a>`;
    if (item.annotations) {
      if (item.annotations.code) text = `<code>${text}</code>`;
      if (item.annotations.bold) text = `<strong>${text}</strong>`;
      if (item.annotations.italic) text = `<em>${text}</em>`;
      if (item.annotations.strikethrough) text = `<s>${text}</s>`;
      if (item.annotations.underline) text = `<u>${text}</u>`;
    }
    return text;
  }).join('');
}

function escapeHtml_(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeAttribute_(value) {
  return escapeHtml_(value).replace(/`/g, '&#96;');
}

function buildCafe24Row_(article, options) {
  const mode = options && options.mode ? options.mode : 'registration';
  const code = String(article['아티클코드'] || '').trim();
  const coverUrl = getArticleImageUrl_(code);
  const row = {};

  CAFE24_HEADERS.forEach((key) => {
    row[key] = '';
  });

  row['상품코드'] = mode === 'update' ? article['카페24 상품코드'] || '' : '';
  row['자체 상품코드'] = code;
  row['진열상태'] = CONFIG.defaultDisplayState;
  row['판매상태'] = CONFIG.defaultSellingState;
  row['상품분류 번호'] = article['상품분류 번호'] || CONFIG.defaultCategoryIds;
  row['상품분류 신상품영역'] = categoryFlagValue_(row['상품분류 번호'], 'N');
  row['상품분류 추천상품영역'] = categoryFlagValue_(row['상품분류 번호'], 'N');
  row['상품명'] = article['상품명'];
  row['영문 상품명'] = article['제목(영문)'];
  row['상품명(관리용)'] = `[Article] ${article['상품명'] || article['제목(영문)']}`;
  row['상품 간략설명'] = article['요약(Deck)'];
  row['상품 상세설명'] = article['HTML 출력'];
  row['모바일 상품 상세설명 설정'] = 'A';
  row['검색어설정'] = article['SEO Keywords'];
  row['과세구분'] = 'A|10';
  row['소비자가'] = '0';
  row['공급가'] = '0';
  row['상품가'] = '0';
  row['판매가'] = buildDisplayPrice_(article['발행일']);
  row['판매가 대체문구 사용'] = 'N';
  row['주문수량 제한 기준'] = 'O';
  row['최소 주문수량(이상)'] = '1';
  row['적립금'] = '2.00';
  row['적립금 구분'] = 'P';
  row['공통이벤트 정보'] = 'Y';
  row['성인인증'] = 'N';
  row['옵션사용'] = 'N';
  row['추가입력옵션'] = 'F';
  row['이미지등록(상세)'] = coverUrl;
  row['이미지등록(목록)'] = coverUrl;
  row['이미지등록(작은목록)'] = coverUrl;
  row['이미지등록(축소)'] = coverUrl;
  row['제조사'] = 'M0000000';
  row['공급사'] = 'S0000000';
  row['브랜드'] = 'B0000000';
  row['트렌드'] = 'T0000000';
  row['자체분류 코드'] = 'C000000A';
  row['출시일자'] = article['발행일'];
  row['유효기간 사용여부'] = 'F';
  row['원산지'] = '1798';
  row['배송정보'] = 'F';
  row['배송방법'] = '01';
  row['국내/해외배송'] = 'A';
  row['배송비 선결제 설정'] = 'C';
  row['배송비 구분'] = 'T';
  row['스토어픽업 설정'] = 'N';
  row['검색엔진최적화(SEO) 검색엔진 노출 설정'] = 'Y';
  row['검색엔진최적화(SEO) Title'] = article['SEO Title'] || article['상품명'] || article['제목(영문)'];
  row['검색엔진최적화(SEO) Author'] = 'anu | 아누 온라인 스토어';
  row['검색엔진최적화(SEO) Description'] = article['SEO Description'] || article['요약(Deck)'];
  row['검색엔진최적화(SEO) Keywords'] = article['SEO Keywords'];
  row['검색엔진최적화(SEO) 상품 이미지 Alt 텍스트'] = article['SEO Alt'] || article['상품명'] || article['제목(영문)'];
  row['메모'] = [`Notion: ${article['Notion URL']}`, `ArticleCode: ${code}`].join('\n');
  row['추가항목10_아티클-일자'] = article['일자'];
  row['추가항목11_아티클-카테고리1'] = titleCase_(article['카테고리']);
  row['추가항목12_아티클-카테고리2'] = titleCase_(article['타입']);

  return CAFE24_HEADERS.map((key) => row[key]);
}

function queryAllDataSourcePages_(dataSourceId, payload) {
  const results = [];
  let cursor = null;
  do {
    const body = Object.assign({ page_size: 100 }, payload || {});
    if (cursor) body.start_cursor = cursor;
    const response = notionFetch_(`/v1/data_sources/${dataSourceId}/query`, {
      method: 'post',
      payload: JSON.stringify(body),
    });
    results.push.apply(results, response.results || []);
    cursor = response.has_more ? response.next_cursor : null;
  } while (cursor);
  return results;
}

function buildSyncStatusFilter_() {
  const filters = [];
  for (let index = 0; index < CONFIG.syncExcludedStatusNames.length; index += 1) {
    filters.push({
      property: '상태',
      status: { does_not_equal: CONFIG.syncExcludedStatusNames[index] },
    });
  }

  return filters.length === 1 ? filters[0] : { and: filters };
}

function getEditorPage_(pageId, cache) {
  if (!cache[pageId]) {
    cache[pageId] = notionFetch_(`/v1/pages/${pageId}`, { method: 'get' });
  }
  return cache[pageId];
}

function updateNotionPage_(pageId, properties) {
  return notionFetch_(`/v1/pages/${pageId}`, {
    method: 'patch',
    payload: JSON.stringify({ properties }),
  });
}

function notionFetch_(path, options) {
  const token = PropertiesService.getScriptProperties().getProperty('NOTION_TOKEN');
  if (!token) throw new Error('Missing Script Property: NOTION_TOKEN');

  const params = Object.assign({}, options || {}, {
    contentType: 'application/json',
    muteHttpExceptions: true,
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': CONFIG.notionVersion,
    },
  });

  const response = UrlFetchApp.fetch(`https://api.notion.com${path}`, params);
  const text = response.getContentText();
  const data = text ? JSON.parse(text) : {};
  if (response.getResponseCode() >= 300) {
    throw new Error(`Notion API ${response.getResponseCode()}: ${text}`);
  }
  return data;
}

function getOrCreateSheet_(name) {
  const spreadsheet = SpreadsheetApp.getActive();
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function writeHeaderRow_(sheet, headers) {
  sheet.clearContents();
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.setFrozenRows(1);
}

function objectFromRow_(headers, row) {
  return headers.reduce((acc, key, index) => {
    acc[key] = row[index];
    return acc;
  }, {});
}

function normalizeArticleCode_(code) {
  return String(code || '').trim().toLowerCase();
}

function getArticleYearFolder_(articleCode) {
  const normalized = normalizeArticleCode_(articleCode);
  const match = normalized.match(/^arti(?:cle)?-?(\d{4}|\d{2})/);
  if (!match) {
    throw new Error(`Invalid article code. Expected ARTI26-001 or ARTI2026-001: ${articleCode}`);
  }

  const year = match[1].length === 2 ? `20${match[1]}` : match[1];
  return year;
}

function getArticleAssetFolder_(articleCode) {
  return `/${getArticleYearFolder_(articleCode)}/${normalizeArticleCode_(articleCode)}/`;
}

function getArticleCoverPath_(articleCode) {
  return `${getArticleAssetFolder_(articleCode)}cover.jpg`;
}

function getArticleImageUrl_(articleCode) {
  return articleCode ? `${CONFIG.articleR2BaseUrl}${getArticleCoverPath_(articleCode)}` : '';
}

function validateArticleRow_(article) {
  const missing = [];
  if (!article.articleCode) missing.push('아티클코드');
  if (!article.productName) missing.push('상품명');
  if (!article.html) missing.push('HTML 출력');
  return missing.length ? `확인 필요: ${missing.join(', ')}` : 'OK';
}

function buildDisplayPrice_(dateValue) {
  const date = dateValue ? new Date(dateValue) : new Date();
  const year = String(date.getFullYear()).slice(2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}${month}.00`;
}

function categoryFlagValue_(categoryIds, value) {
  const count = String(categoryIds || '').split('|').filter(Boolean).length || 1;
  return Array(count).fill(value).join('|');
}

function titleCase_(value) {
  const text = String(value || '').trim();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

function firstRelationId_(property) {
  const relations = property && property.relation ? property.relation : [];
  return relations.length ? relations[0].id : '';
}

function titleText_(property) {
  return richTextArrayToPlain_(property && property.title);
}

function plainText_(property) {
  if (!property) return '';
  if (property.rich_text) return richTextArrayToPlain_(property.rich_text);
  if (property.formula) return property.formula.string || String(property.formula.number || '');
  if (property.rollup && property.rollup.array) {
    return property.rollup.array.map(plainText_).filter(Boolean).join('\n');
  }
  return '';
}

function selectName_(property) {
  return property && property.select ? property.select.name : '';
}

function statusName_(property) {
  return property && property.status ? property.status.name : '';
}

function dateStart_(property) {
  return property && property.date ? property.date.start : '';
}

function numberValue_(property) {
  return property && property.number ? property.number : '';
}

function richTextArrayToPlain_(items) {
  return (items || []).map((item) => item.plain_text || '').join('');
}

function richTextProperty_(value) {
  const text = String(value || '');
  if (!text) return { rich_text: [] };

  const chunks = [];
  for (let index = 0; index < text.length; index += 1900) {
    chunks.push({ text: { content: text.slice(index, index + 1900) } });
  }
  return { rich_text: chunks };
}

function titleProperty_(value) {
  const text = String(value || '');
  if (!text) return { title: [] };

  const chunks = [];
  for (let index = 0; index < text.length; index += 1900) {
    chunks.push({ text: { content: text.slice(index, index + 1900) } });
  }
  return { title: chunks };
}

function selectProperty_(name) {
  return name ? { select: { name } } : { select: null };
}

function statusProperty_(name) {
  return name ? { status: { name } } : { status: null };
}

function numberProperty_(value) {
  const text = String(value || '').trim();
  if (!text) return { number: null };
  const number = Number(text);
  return Number.isFinite(number) ? { number } : { number: null };
}

function dateProperty_(date) {
  return { date: { start: Utilities.formatDate(date, 'Asia/Seoul', "yyyy-MM-dd'T'HH:mm:ssXXX") } };
}

function dateOnlyProperty_(value) {
  const text = String(value || '').trim();
  if (!text) return { date: null };
  const match = text.match(/^\d{4}-\d{2}-\d{2}/);
  return match ? { date: { start: match[0] } } : { date: null };
}

function pickExistingProperties_(page, properties) {
  const existing = page && page.properties ? page.properties : {};
  return Object.keys(properties).reduce((acc, key) => {
    if (Object.prototype.hasOwnProperty.call(existing, key) && properties[key]) {
      acc[key] = properties[key];
    }
    return acc;
  }, {});
}

function parseApiPayload_(event) {
  const contents = event && event.postData && event.postData.contents ? event.postData.contents : '{}';
  try {
    return JSON.parse(contents);
  } catch (error) {
    throw new Error('Invalid JSON request body');
  }
}

function requireWebAppToken_(token) {
  const expected = PropertiesService.getScriptProperties().getProperty('WEB_APP_TOKEN');
  if (!expected) return;
  if (String(token || '') !== expected) {
    throw new Error('Invalid WEB_APP_TOKEN');
  }
}

function buildCsvFromSheet_(sheetName) {
  const sheet = getOrCreateSheet_(sheetName);
  const values = sheet.getDataRange().getDisplayValues();
  return '\ufeff' + values.map(csvRow_).join('\r\n');
}

function csvRow_(row) {
  return row.map(csvCell_).join(',');
}

function csvCell_(value) {
  const text = String(value == null ? '' : value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function jsonResponse_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function notify_(message) {
  Logger.log(message);
  try {
    SpreadsheetApp.getActive().toast(message, 'ANU Articles', 5);
  } catch (error) {
    Logger.log(`Toast skipped: ${error.message || error}`);
  }
}
