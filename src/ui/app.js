/**
 * Lắp ráp app: router + store + bàn phím. Mỗi khi trạng thái đổi thì vẽ lại màn hiện tại.
 */
import { el, replace } from './dom.js';
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
import { renderSets, handleSetsKey, resetSets } from './sets-screen.js';
import { renderExam, handleExamKey, resetExam } from './exam-screen.js';
import { renderVocab } from './vocab-screen.js';
import { renderExams } from './exams-screen.js';
import { renderLookup, resetLookup } from './lookup-screen.js';
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
  vocab: renderVocab,
  exams: renderExams,
  lookup: renderLookup,
  sets: renderSets,
  exam: renderExam,
};

const KEY_HANDLERS = {
  triage: handleTriageKey,
  review: handleReviewKey,
  quiz: handleQuizKey,
  practice: handlePracticeKey,
  listen: handleListenKey,
  sets: handleSetsKey,
  exam: handleExamKey,
};

/**
 * Gắn app vào DOM.
 * @param {HTMLElement} root
 * @param {object} store
 */
export function mountApp(root, store) {
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

  startRouter((route) => {
    if (route.name !== current.name) { resetTriage(); resetReview(); resetQuiz(); resetSync(); resetWords(); resetPractice(); resetListen(); resetLookup(); resetSets(); resetExam(); }
    current = route;
    updateTabBar(nav, current.name);
    draw();
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
