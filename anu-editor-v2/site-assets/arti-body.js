/**
 * arti-body.js
 * anu-seoul.com 아티클 본문 인터랙션
 *
 * 업로드: 카페24 파일매니저 > /article/arti-body.js
 * 로드:   read.html 하단 (기존 article-detail.js 아래)
 *         <script src="/article/arti-body.js?v=8"></script>
 *
 * 포함 기능:
 *   1. 이미지 슬라이드 (data-slide)
 *      - __track-wrap: 이미지 영역만 담음 (overflow hidden + position relative)
 *      - pill 인디케이터(.img-slide__dots): __track-wrap 안 absolute → 이미지 내부 하단 오버레이
 *      - 캡션(.img-slide__caption): __track-wrap 밖 별도 영역, JS가 슬라이드 전환 시 텍스트 업데이트
 *      - 좌/우 버튼: PC는 커서 custom arrow, 모바일은 터치 영역 + 스와이프 병행
 *   2. 주석 팝업 (.arti-note-trigger)
 *
 * HTML 구조 (converter.js 출력):
 *   <div class="img-slide" data-slide>
 *     <div class="img-slide__track-wrap">
 *       <div class="img-slide__track">
 *         <div class="img-slide__item is-active">
 *           <img src="..." alt="캡션 텍스트">
 *         </div>
 *         <div class="img-slide__item">
 *           <img src="..." alt="캡션 텍스트">
 *         </div>
 *       </div>
 *       <button class="img-slide__btn--prev" aria-label="이전 슬라이드"></button>
 *       <button class="img-slide__btn--next" aria-label="다음 슬라이드"></button>
 *       <!-- pill 인디케이터(.img-slide__dots)는 JS가 동적 생성 — track-wrap 안 absolute -->
 *     </div>
 *     <!-- 캡션(.img-slide__caption)은 JS가 동적 생성 — track-wrap 밖 -->
 *   </div>
 *
 *   캡션 원본은 각 __item > img의 alt 속성에서 읽어 옴.
 *   (converter.js: img alt="캡션 텍스트")
 */

(function () {
  'use strict';

  /* ──────────────────────────────────────────────
     0. 기존 PC/모바일 이미지 마크업 정규화

     과거 발행 본문의 img.__pc + img.__mobile 구조에서 현재 화면에
     필요 없는 노드를 삭제해 Safari에서도 한 장만 남도록 한다.
  ────────────────────────────────────────────── */

  function shouldUseMobileImage() {
    var viewportWidth = window.visualViewport && window.visualViewport.width ?
      window.visualViewport.width : window.innerWidth;
    var documentWidth = document.documentElement.clientWidth || viewportWidth;
    var screenWidth = window.screen && window.screen.width ?
      window.screen.width : viewportWidth;
    var isMobileLayout = window.matchMedia('(max-width: 63.999rem)').matches ||
      viewportWidth < 1024 ||
      documentWidth < 1024 ||
      screenWidth < 1024;
    var isTouchAppleDevice = (navigator.maxTouchPoints || 0) > 1 &&
      /Macintosh|iPad|iPhone|iPod/.test(navigator.userAgent);
    return isMobileLayout || isTouchAppleDevice;
  }

  function normalizeResponsiveImages(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var useMobileImage = shouldUseMobileImage();

    scope.querySelectorAll('img[class*="__pc"]').forEach(function (desktopImage) {
      var pairClass = Array.prototype.find.call(desktopImage.classList, function (className) {
        return className.slice(-4) === '__pc';
      });
      if (!pairClass || !desktopImage.parentElement) return;

      var baseClass = pairClass.slice(0, -4);
      var parent = desktopImage.parentElement;
      var mobileImage = parent.querySelector('img.' + baseClass + '__mobile');
      if (!mobileImage) return;

      var keepImage = useMobileImage ? mobileImage : desktopImage;
      var removeImage = useMobileImage ? desktopImage : mobileImage;
      removeImage.parentNode.removeChild(removeImage);
      keepImage.classList.remove(baseClass + (useMobileImage ? '__mobile' : '__pc'));
      keepImage.style.display = 'block';
      keepImage.decoding = 'async';
      parent.setAttribute('data-responsive-normalized', '');
    });
  }

  function initResponsiveImages() {
    normalizeResponsiveImages(document);

    /*
      Cafe24 모바일 상세 이미지 최적화와 iOS/Instagram WebView의 페이지
      복원 과정에서 본문 DOM이 나중에 다시 삽입될 수 있어 body 전체를 감시한다.
    */
    if (typeof MutationObserver === 'function' && document.body) {
      var observerQueued = false;
      var observer = new MutationObserver(function () {
        if (observerQueued) return;
        observerQueued = true;
        requestAnimationFrame(function () {
          observerQueued = false;
          normalizeResponsiveImages(document);
        });
      });
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    }

    window.addEventListener('pageshow', function () {
      normalizeResponsiveImages(document);
    });

    [100, 500, 1500].forEach(function (delay) {
      window.setTimeout(function () {
        normalizeResponsiveImages(document);
      }, delay);
    });
  }

  /* ──────────────────────────────────────────────
     1. 이미지 슬라이드
  ────────────────────────────────────────────── */

  function initSlides() {
    document.querySelectorAll('[data-slide]').forEach(function (slider) {
      var trackWrap = slider.querySelector('.img-slide__track-wrap');
      var track = slider.querySelector('.img-slide__track');
      var items = slider.querySelectorAll('.img-slide__item');
      var btnPrev = slider.querySelector('.img-slide__btn--prev');
      var btnNext = slider.querySelector('.img-slide__btn--next');
      var total = items.length;
      var current = 0;

      if (!track || total === 0) return;

      /* 캡션 수집: 링크/주석을 보존하기 위해 HTML과 표시 텍스트를 함께 저장 */
      var captions = Array.prototype.map.call(items, function (item) {
        var capEl = item.querySelector('.arti-caption');
        if (capEl) {
          return {
            html: capEl.innerHTML,
            text: capEl.textContent.trim()
          };
        }
        var img = item.querySelector('img');
        var text = img ? img.getAttribute('alt') || '' : '';
        return { html: '', text: text };
      });

      /* 캡션 표시 영역: track-wrap 밖에 동적 생성 */
      var captionEl = null;
      if (captions.some(function (caption) { return caption.text; })) {
        captionEl = document.createElement('p');
        captionEl.className = 'img-slide__caption arti-caption';
        slider.appendChild(captionEl);
      }

      /* pill 인디케이터: track-wrap 안에 동적 생성 (이미지 위 absolute) */
      var dotsWrap = document.createElement('div');
      dotsWrap.className = 'img-slide__dots';
      var dots = [];
      for (var d = 0; d < total; d++) {
        var dot = document.createElement('span');
        dot.className = 'img-slide__dot' + (d === 0 ? ' is-active' : '');
        dotsWrap.appendChild(dot);
        dots.push(dot);
      }
      if (trackWrap) trackWrap.appendChild(dotsWrap);

      /* 초기 상태 */
      items[0].classList.add('is-active');
      updateCaption(0);

      function updateCaption(idx) {
        if (!captionEl) return;
        var caption = captions[idx] || { html: '', text: '' };
        if (caption.html) {
          captionEl.innerHTML = caption.html;
          bindNoteTriggers(captionEl);
        } else {
          captionEl.textContent = caption.text;
        }
        captionEl.style.display = caption.text ? '' : 'none';
      }

      function goTo(idx) {
        items[current].classList.remove('is-active');
        dots[current].classList.remove('is-active');

        current = (idx % total + total) % total;
        track.style.transform = 'translateX(-' + (current * 100) + '%)';

        items[current].classList.add('is-active');
        dots[current].classList.add('is-active');
        updateCaption(current);
      }

      /* ── 버튼: PC 클릭 + 모바일 터치 ── */
      if (btnPrev) {
        btnPrev.addEventListener('click', function (e) {
          e.stopPropagation();
          goTo(current - 1);
        });
      }
      if (btnNext) {
        btnNext.addEventListener('click', function (e) {
          e.stopPropagation();
          goTo(current + 1);
        });
      }

      /* ── 터치: 스와이프 + 버튼 영역 탭 병행 ──
         touchstart → touchend 이동 거리가 작으면 탭(버튼 click)으로 처리되므로
         스와이프와 자연스럽게 공존함.
         단, 수직 스크롤과 혼동되지 않도록 수평 이동이 더 클 때만 슬라이드 처리. */
      var touchStartX = 0;
      var touchStartY = 0;

      slider.addEventListener('touchstart', function (e) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      slider.addEventListener('touchend', function (e) {
        var dx = touchStartX - e.changedTouches[0].clientX;
        var dy = touchStartY - e.changedTouches[0].clientY;
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
          goTo(dx > 0 ? current + 1 : current - 1);
        }
      }, { passive: true });
    });
  }


  /* ──────────────────────────────────────────────
     2. 주석 팝업

     HTML:
       <span class="arti-note-trigger">
         낯선 단어
         <span class="arti-note-popup">설명 텍스트</span>
       </span>

     클릭 → .open 토글 / 바깥 클릭 → 닫기
  ────────────────────────────────────────────── */

  function bindNoteTriggers(root) {
    root.querySelectorAll('.arti-note-trigger:not([data-note-bound])').forEach(function (trigger) {
      trigger.setAttribute('data-note-bound', '');
      var popup = trigger.querySelector('.arti-note-popup');
      var dragStartX = 0;
      var dragStartY = 0;
      var dragY = 0;
      var suppressClick = false;

      trigger.addEventListener('click', function (e) {
        e.stopPropagation();
        if (suppressClick) {
          suppressClick = false;
          return;
        }
        var isOpen = trigger.classList.contains('open');
        closeAllNotes();
        if (!isOpen) {
          trigger.classList.add('open');
          resetNoteDrag(popup);
        }
      });

      if (!popup) return;
      popup.addEventListener('touchstart', function (e) {
        if (window.matchMedia('(min-width: 64rem)').matches) return;
        dragStartX = e.touches[0].clientX;
        dragStartY = e.touches[0].clientY;
        dragY = 0;
      }, { passive: true });
      popup.addEventListener('touchmove', function (e) {
        if (window.matchMedia('(min-width: 64rem)').matches) return;
        var dx = e.touches[0].clientX - dragStartX;
        var dy = e.touches[0].clientY - dragStartY;
        if (dy > 0 && Math.abs(dy) > Math.abs(dx)) {
          e.preventDefault();
          e.stopPropagation();
          dragY = dy;
          popup.classList.add('is-dragging');
          popup.style.setProperty('--note-drag-y', dragY + 'px');
          popup.style.setProperty('--note-drag-opacity', String(Math.max(0.2, 1 - dragY / 300)));
        }
      }, { passive: false });
      popup.addEventListener('touchend', function (e) {
        if (window.matchMedia('(min-width: 64rem)').matches) return;
        e.stopPropagation();
        popup.classList.remove('is-dragging');
        if (dragY > 90) {
          trigger.classList.remove('open');
        }
        if (dragY > 8) suppressClick = true;
        resetNoteDrag(popup);
        dragY = 0;
      }, { passive: true });
    });
  }

  function initNoteTriggers() {
    bindNoteTriggers(document);
    document.addEventListener('click', closeAllNotes);
  }

  function closeAllNotes() {
    document.querySelectorAll('.arti-note-trigger.open').forEach(function (t) {
      t.classList.remove('open');
      resetNoteDrag(t.querySelector('.arti-note-popup'));
    });
  }

  function resetNoteDrag(popup) {
    if (!popup) return;
    popup.classList.remove('is-dragging');
    popup.style.setProperty('--note-drag-y', '0px');
    popup.style.setProperty('--note-drag-opacity', '1');
  }


  /* ──────────────────────────────────────────────
     초기화
  ────────────────────────────────────────────── */

  function init() {
    initResponsiveImages();
    initSlides();
    initNoteTriggers();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

}());
