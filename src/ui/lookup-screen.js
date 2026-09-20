/**
 * Tra từ (D36): tìm bất kỳ từ nào trong deck — kể cả từ CHƯA học — để dùng ngay, và thêm vào danh sách học
 * nếu cần. Từ không có trong deck thì cho ghi lại để học sau (chưa có nghĩa vì app không gọi AI lúc chạy,
 * ràng buộc #2) kèm nút tra từ điển ngoài.
 */
import { el, goTo } from './dom.js';
import { searchWords, lookupAction, MATCH, MATCH_LABEL } from '../logic/lookup.js';
import { normalizeWord, planCapture } from '../logic/capture.js';
import { LEVEL_INFO } from '../logic/vocab-levels.js';
import { renderWordBack } from './word-detail.js';

const EXAMPLES = ['amend', 'ngân sách', 'raised', 'deadline'];

// Trạng thái riêng của màn (giữ ngoài DOM vì ghi sự kiện sẽ vẽ lại cả màn).
let query = null;    // null = chưa khởi tạo (đọc từ địa chỉ #/lookup?q=... nếu có)
let openId = null;   // id từ đang mở; '' = người dùng đã tự đóng
let notice = null;   // thông báo kết quả của hành động gần nhất
let seenParam;       // giá trị ?q= lần vẽ trước — địa chỉ đổi q khi đang ở màn này thì phải tra theo q mới

/**
 * @param {object} store
 * @param {URLSearchParams} [params]
 * @returns {HTMLElement}
 */
export function renderLookup(store, params) {
  const fromUrl = params?.get('q') ?? null;
  if (fromUrl !== seenParam) {
    seenParam = fromUrl;
    if (fromUrl !== null) { query = fromUrl; openId = null; notice = null; }
  }
  if (query === null) query = '';

  const results = el('div', { class: 'lookup-results' });
  const fill = () => fillResults(store, results, fill);
  fill();

  // Gõ chỉ vẽ lại danh sách kết quả, không vẽ lại cả màn — vẽ lại cả màn sẽ mất ô nhập và bàn phím.
  const input = el('input', {
    class: 'field lookup-input', type: 'search', value: query, autofocus: 'autofocus',
    placeholder: 'Gõ một từ tiếng Anh hoặc nghĩa tiếng Việt…', 'aria-label': 'Tra từ',
    autocapitalize: 'none', autocorrect: 'off', spellcheck: 'false',
  });
  input.addEventListener('input', () => {
    query = input.value;
    openId = null;
    notice = null;
    fill();
  });

  return el('div', {}, [
    el('h1', { text: 'Tra từ' }),
    el('p', { class: 'subtitle', text: `Tìm trong ${store.searchIndex.length} từ của deck, kể cả từ chưa học.` }),
    input,
    results,
  ]);
}

/** Vẽ (lại) phần kết quả theo chuỗi đang gõ. */
function fillResults(store, box, refill) {
  const text = query.trim();
  if (text === '') {
    box.replaceChildren(el('div', { class: 'lookup-hint' }, [
      el('p', { class: 'empty', text: 'Gõ để tìm. Hiểu cả dạng chia (raised → raise), nghĩa tiếng Việt không cần gõ dấu, và tìm được trong cụm từ, đồng nghĩa, ví dụ.' }),
      el('div', { class: 'chips' }, EXAMPLES.map((word) => el('button', {
        class: 'chip-btn', text: word, onClick: () => { query = word; store.refresh(); },
      }))),
    ]));
    return;
  }

  const hits = searchWords(store.searchIndex, text);
  if (hits.length === 0) {
    box.replaceChildren(renderNotFound(store, text));
    return;
  }

  // Gõ đúng một từ (hoặc dạng chia của nó) thì mở luôn thẻ đó — đỡ một lần chạm.
  const autoOpen = openId === null && hits[0].score >= MATCH.FORM ? hits[0].entry.id : null;
  const rows = hits.map(({ entry, score }) => renderRow(store, entry, score, openId === entry.id || autoOpen === entry.id, refill));
  box.replaceChildren(
    el('p', { class: 'progress', text: `${hits.length}${hits.length >= 30 ? '+' : ''} kết quả` }),
    ...(notice ? [el('p', { class: 'notice', text: notice })] : []),
    ...rows,
  );
}

/** Một kết quả: bấm để mở/đóng thẻ đầy đủ. */
function renderRow(store, entry, score, open, refill) {
  const state = store.states.get(entry.id);
  const level = state?.triaged ? state.level : null;

  const head = el('button', {
    class: open ? 'word-head open' : 'word-head', 'aria-expanded': String(open),
    onClick: () => { openId = open ? '' : entry.id; refill(); },
  }, [
    el('span', { class: 'wh-main' }, [
      el('strong', { text: entry.word }),
      entry.ipa ? el('span', { class: 'ipa-inline', text: entry.ipa }) : '',
      el('span', { class: level ? `lvl ${LEVEL_INFO[level].css}` : 'lvl none', text: level ? LEVEL_INFO[level].label : 'chưa học' }),
    ]),
    el('small', { text: `${entry.vi}${score < MATCH.PREFIX ? ` · ${MATCH_LABEL[score]}` : ''}` }),
  ]);
  return el('div', { class: 'word-row' }, open ? [head, renderDetail(store, entry, state)] : [head]);
}

/** Thẻ đầy đủ + hành động thêm vào danh sách học tuỳ trạng thái hiện tại của từ. */
function renderDetail(store, entry, state) {
  const action = lookupAction(entry, state);
  return el('div', { class: 'word-detail' }, [
    entry.pos?.length ? el('div', { class: 'pos', text: entry.pos.join(' · ') }) : '',
    renderWordBack(entry),
    entry.synonyms?.length ? el('div', { class: 'chips' }, [
      el('span', { class: 'chooser-label', text: 'Đồng nghĩa' }),
      ...entry.synonyms.map((w) => el('span', { class: 'chip', text: w })),
    ]) : '',
    el('button', {
      class: action.kind === 'learning' ? 'secondary' : 'primary',
      disabled: action.kind === 'learning' ? 'disabled' : false,
      onClick: () => learn(store, entry, action),
    }, [el('span', { text: action.label })]),
  ]);
}

/** Thêm vào danh sách học (hoặc học lại) bằng đúng một sự kiện phân loại. */
async function learn(store, entry, action) {
  if (!action.event) return;
  notice = action.kind === 'add'
    ? `Đã thêm “${entry.word}” vào danh sách học.`
    : `Đã đưa “${entry.word}” về danh sách học.`;
  await store.record(action.event.type, action.event.payload);
}

/** Không có trong deck: cho ghi lại để học sau, và tra từ điển ngoài. */
function renderNotFound(store, text) {
  const word = normalizeWord(text);
  const already = word !== '' && store.captured.has(word);
  const actions = [];

  if (word === '') {
    actions.push(el('p', { class: 'empty', text: 'Gõ thêm chữ cái để tìm (tối thiểu 3 chữ cái để ghi lại).' }));
  } else if (already) {
    actions.push(
      el('p', { class: 'notice', text: `✓ Đã ghi lại “${word}” — xem ở Kho từ vựng › Đã gạt.` }),
      el('button', { class: 'secondary', onClick: () => goTo('/words?f=captured') }, [el('span', { text: 'Mở danh sách đã gạt' })]),
    );
  } else {
    actions.push(el('button', { class: 'primary', onClick: () => record(store, word) }, [
      el('span', { text: `＋ Ghi lại “${word}” để học sau` }),
      el('small', { text: 'chưa có nghĩa trong deck — bạn tra ở dưới rồi học sau' }),
    ]));
  }

  if (word !== '') {
    actions.push(el('div', { class: 'ext-links' }, [
      el('a', { class: 'ext-link', href: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`, target: '_blank', rel: 'noopener', text: 'Tra Wiktionary ↗' }),
      el('a', { class: 'ext-link', href: `https://dictionary.cambridge.org/dictionary/english-vietnamese/${encodeURIComponent(word)}`, target: '_blank', rel: 'noopener', text: 'Tra Cambridge ↗' }),
    ]));
  }
  return el('div', { class: 'lookup-none' }, [
    el('p', { class: 'empty', text: `Không có “${text}” trong deck.` }),
    ...actions,
  ]);
}

/** Ghi từ không có trong deck vào danh sách đã gạt. */
async function record(store, word) {
  const plan = planCapture(word, { index: store.wordIndex, states: store.states, captured: store.captured });
  for (const event of plan.events) await store.record(event.type, event.payload);
}

/** Đặt lại khi rời màn. */
export function resetLookup() {
  query = null;
  seenParam = undefined;
  openId = null;
  notice = null;
}
