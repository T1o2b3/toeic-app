/**
 * Gạt từ lạ lúc làm Part 5 (D34): chạm hoặc kéo một từ trong câu vào khay "Cần học".
 * KHÔNG hiện nghĩa ở đây — mục đích là không đứt mạch làm bài; nghĩa xem sau ở màn học.
 *
 * Trên Mac kéo thả được. Trên iPhone kéo thả HTML5 với chữ không chạy ổn định nên dùng
 * chạm-để-chọn rồi bấm "Cần học" — cả hai đường cùng gọi `capture`.
 */
import { el } from './dom.js';
import { tokenize, normalizeWord, planCapture } from '../logic/capture.js';
import { renderBlanks } from './exam-unit.js';

/**
 * Vẽ lại màn mà GIỮ NGUYÊN chỗ đang đọc.
 *
 * `draw()` thay toàn bộ nội dung nên trang tự nhảy về đầu. Với các thao tác "sang mục mới" (câu kế,
 * bộ kế) thì đúng là muốn về đầu, nhưng gạt một từ thì KHÔNG: chạm một từ trong phương án ở cuối bộ
 * Part 7 mà trang nhảy lên đầu là mất chỗ đang đọc.
 *
 * `window.scrollY !== y` cũng là cách tránh gọi `scrollTo` trong jsdom (luôn 0, và jsdom chưa cài hàm này).
 */
function keepScroll() {
  const y = window.scrollY;
  return () => { if (window.scrollY !== y) window.scrollTo(0, y); };
}

/** Từ đang được chọn (chuẩn hoá), chờ bấm "Cần học". */
let selected = null;

/** Thông báo kết quả của lần gạt gần nhất. */
let notice = null;

/** Đang ghi sự kiện: chặn bấm/thả hai lần thật nhanh ghi trùng. */
let busy = false;

const HINT = 'Gặp từ lạ? Chạm vào từ trong câu (hoặc kéo vào đây) để thêm vào danh sách cần học — nghĩa xem sau, không hiện lúc làm bài.';

/**
 * Câu hỏi với từng từ bấm/kéo được, và chỗ trống in đúng kiểu đề thật.
 * @param {object} store
 * @param {{stem: string}} question
 * @param {{numbers?: number[]}} [options] - số hiệu câu cho chỗ trống [1], [2]… của Part 6
 * @returns {HTMLElement}
 */
export function renderStem(store, question, { numbers = [] } = {}) {
  const parts = tokenize(question.stem).flatMap((token) => {
    // Phần không phải từ có thể chứa chỗ trống (---- hoặc [1]); in nó thành ô trống thay vì gạch nối thô.
    if (!token.word) return renderBlanks(token.text, numbers);

    const classes = ['tok'];
    if (store.captured.has(token.word)) classes.push('captured');
    if (token.word === selected) classes.push('selected');

    const node = el('span', { class: classes.join(' '), draggable: 'true', role: 'button', tabindex: '0', text: token.text });
    node.addEventListener('click', () => {
      const restore = keepScroll();
      selected = selected === token.word ? null : token.word;
      store.refresh();
      restore();
    });
    node.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData('text/plain', token.word);
      event.dataTransfer.effectAllowed = 'copy';
    });
    return [node];
  });
  return el('div', { class: 'stem' }, parts);
}

/**
 * Khay nhận từ: vùng thả (Mac) và nơi xác nhận "Cần học" (chạm).
 * @param {object} store
 * @param {{id: string}} question
 * @param {{extra?: string}} [options] - lớp CSS thêm (màn bộ đề dùng để chỉ hiện khay thứ hai trên màn hẹp)
 * @returns {HTMLElement}
 */
export function renderTray(store, question, { extra = '' } = {}) {
  let content;
  if (selected) {
    content = [
      el('span', { class: 'tray-word', text: `“${selected}”` }),
      el('button', { class: 'tray-add', text: '＋ Cần học', onClick: () => capture(store, question, selected) }),
      el('button', { class: 'link', text: 'Bỏ chọn', onClick: () => { const restore = keepScroll(); selected = null; store.refresh(); restore(); } }),
    ];
  } else {
    content = [el('span', { class: 'tray-note', text: notice ?? HINT })];
  }

  const tray = el('div', { class: extra ? `tray ${extra}` : 'tray' }, content);
  tray.addEventListener('dragover', (event) => {
    event.preventDefault();
    tray.classList.add('over');
  });
  tray.addEventListener('dragleave', () => tray.classList.remove('over'));
  tray.addEventListener('drop', (event) => {
    event.preventDefault();
    tray.classList.remove('over');
    capture(store, question, event.dataTransfer.getData('text/plain'));
  });
  return tray;
}

/**
 * Từ trong bốn phương án — CHỈ hiện sau khi đã trả lời, vì trước đó việc đánh dấu từ nào
 * là gợi ý ngầm cho đáp án. Bấm để thêm vào danh sách cần học.
 * @param {object} store
 * @param {{id: string, options: Record<string, string>}} question
 * @returns {HTMLElement}
 */
export function renderOptionCapture(store, question) {
  const words = [...new Set(Object.values(question.options).map(normalizeWord).filter(Boolean))];
  if (words.length === 0) return el('div');

  return el('div', { class: 'option-capture' }, [
    el('div', { class: 'gaps-title', text: 'Từ trong các phương án — thêm vào danh sách cần học:' }),
    el('div', { class: 'chips' }, words.map((word) => {
      const done = store.captured.get(word)?.questionIds.includes(question.id);
      return el('button', {
        class: done ? 'chip-btn active' : 'chip-btn',
        text: done ? `✓ ${word}` : `＋ ${word}`,
        onClick: () => !done && capture(store, question, word),
      });
    })),
  ]);
}

/** Ghi một từ vào danh sách cần học rồi báo kết quả. */
async function capture(store, question, raw) {
  const word = normalizeWord(raw);
  if (!word || busy) return;
  busy = true;
  const restore = keepScroll();
  try {
    const plan = planCapture(word, {
      questionId: question.id, index: store.wordIndex, states: store.states, captured: store.captured,
    });
    selected = null;
    notice = plan.notice;
    if (plan.events.length === 0) {
      store.refresh();
      return;
    }
    for (const event of plan.events) await store.record(event.type, event.payload);
  } finally {
    busy = false;
    restore();
  }
}

/** Đặt lại khi sang câu khác hoặc rời màn. */
export function resetCapture() {
  selected = null;
  notice = null;
}
