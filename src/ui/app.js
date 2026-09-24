/**
 * Lắp ráp app: router + store + bàn phím. Mỗi khi trạng thái đổi thì vẽ lại màn hiện tại.
 */
import { el, replace, scrollToTop } from './dom.js';
import { startRouter } from './router.js';
import { renderHome } from './home-screen.js';
import { renderTriage, handleTriageKey, resetTriage } from './triage-screen.js';
import { renderReview, handleReviewKey, resetReview } from './review-screen.js';
import { renderWeak } from './weak-screen.js';
import { renderQuiz, handleQuizKey, resetQuiz } from './quiz-screen.js';
import { renderSync, resetSync } from './sync-screen.js';
import { renderWords, resetWords } from './words-screen.js';
import { renderPractice, handlePracticeKey, resetPractice } from './practice-screen.js';
import { renderListen, handleListenKey, resetListen } from './listen-screen.js';
import { renderDictation, handleDictationKey, resetDictation } from './dictation-screen.js';
import { renderSets, handleSetsKey, resetSets } from './sets-screen.js';
import { renderExam, handleExamKey, resetExam } from './exam-screen.js';
import { renderVocab } from './vocab-screen.js';
import { renderExams } from './exams-screen.js';
import { renderLookup, resetLookup } from './lookup-screen.js';
import { renderCollocations, resetCollocations } from './collocations-screen.js';
import { createTabBar, updateTabBar } from './tabbar.js';

const SCREENS = {
  home: renderHome,
  triage: renderTriage,
  review: renderReview,
  weak: renderWeak,
  quiz: renderQuiz,
  sync: renderSync,
  words: renderWords,
  practice: renderPractice,
  listen: renderListen,
  dictation: renderDictation,
  vocab: renderVocab,
  exams: renderExams,
  lookup: renderLookup,
  sets: renderSets,
  exam: renderExam,
  collocations: renderCollocations,
};

const KEY_HANDLERS = {
  triage: handleTriageKey,
  review: handleReviewKey,
  quiz: handleQuizKey,
  practice: handlePracticeKey,
  listen: handleListenKey,
  dictation: handleDictationKey,
  sets: handleSetsKey,
  exam: handleExamKey,
};

/** Quản lý giao diện Sáng/Tối */
export function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme') || 'light';
  const next = current === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  try { localStorage.setItem('theme', next); } catch { /* duyệt riêng tư: vẫn đổi, chỉ không nhớ */ }
  return next;
}

/**
 * Gắn app vào DOM.
 * @param {HTMLElement} root
 * @param {object} store
 */
export function mountApp(root, store) {
  // Sáng/tối được đặt sẵn ở index.html, trước lần vẽ đầu (không nháy trắng).
  let current = { name: 'home', params: new URLSearchParams() };
  const nav = createTabBar();
  root.after(nav);

  const draw = () => {
    const render = SCREENS[current.name] ?? renderHome;
    try {
      replace(root, render(store, current.params));
    } catch (error) {
      replace(root, renderError(error));
    }
  };

  // Đổi màn: mờ dần sang màn mới (View Transitions — trình duyệt chưa hỗ trợ thì đổi ngay, không sao),
  // về đầu trang, và đưa focus về tiêu đề màn mới để bàn phím / trình đọc màn hình không bị bỏ lơ ở nút
  // vừa biến mất. Vẽ lại TRONG cùng màn (lật thẻ, chấm câu) thì không làm gì cả — hiệu ứng chỉ làm chậm tay.
  const showNewScreen = () => {
    updateTabBar(nav, current.name);
    draw();
    scrollToTop();
    const heading = root.querySelector('h1');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
  };

  let booted = false;
  startRouter((route) => {
    const changed = route.name !== current.name;
    // Lần vẽ ĐẦU TIÊN (mở app / tải lại trang) không phải "rời màn": chưa có gì để dọn, và dọn lúc này là xoá
    // luôn bài thi làm dở mà màn thi sắp khôi phục (resetExam xoá bản lưu) — tải lại giữa bài là mất trắng.
    if (changed && booted) {
      resetTriage(); resetReview(); resetQuiz(); resetSync(); resetWords(); resetPractice(); resetListen(); resetDictation(); resetLookup(); resetSets(); resetExam(); resetCollocations();
    }
    current = route;
    booted = true;
    if (!changed) { updateTabBar(nav, current.name); draw(); } // cả lần mở app đầu tiên (màn chính)
    // Trang đang ẩn hoặc chuyển màn dồn dập thì trình duyệt BỎ hiệu ứng (vẫn đổi màn) và từ chối `ready`
    // bằng InvalidStateError — không phải lỗi, chỉ cần đừng để nó thành "Uncaught" trong console.
    else if (document.startViewTransition) document.startViewTransition(showNewScreen).ready.catch(() => {});
    else showNewScreen();
  });

  store.subscribe(draw);

  window.addEventListener('keydown', (event) => {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    KEY_HANDLERS[current.name]?.(store, event);
  });
}

/** Màn báo lỗi: thà hiện lỗi rõ ràng còn hơn trang trắng. */
function renderError(error) {
  return el('div', {}, [
    el('h1', { text: 'Có lỗi' }),
    el('p', { class: 'empty', text: String(error?.message ?? error) }),
    el('button', { class: 'secondary', onClick: () => window.location.reload() }, [
      el('span', { text: 'Tải lại' }),
    ]),
  ]);
}
