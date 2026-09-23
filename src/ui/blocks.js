/**
 * Các khối giao diện DÙNG CHUNG cho nhiều màn: làm bài (Part 2–7, thi thử), điều hướng về mục, chấm điểm.
 *
 * Lý do gom về đây: trước đó "dãy nút chọn đáp án" có BỐN bản gần giống nhau (luyện Part 5, luyện bộ,
 * luyện nghe, thi thử) và "bố cục hai cột" có hai bản. Sửa một chỗ thì ba chỗ kia lệch đi.
 * Quy tắc từ 2026-09-20: hàm sinh ra phải dùng được ở nhiều nơi, không đẻ hàm chỉ để rút ngắn một file.
 */
import { el, goTo } from './dom.js';
import { SPEEDS } from '../logic/listen.js';
import { getListenSpeed, setListenSpeed } from '../data/prefs.js';

/**
 * Dãy nút chọn đáp án.
 *
 * Trạng thái của một nút được quyết bởi HAI thứ:
 *   - `picked`: người học đã chọn chữ nào (tô nhạt, chưa nói đúng sai);
 *   - `answer`: truyền vào NGHĨA LÀ đã được phép lộ đáp án — lúc đó mới tô xanh/đỏ.
 * Nhờ tách hai thứ này mà cùng một hàm phục vụ được cả chế độ chấm ngay (Part 5) lẫn chế độ giữ tới
 * cuối bộ (Part 3/4/6/7 — D42) lẫn thi thử (không bao giờ lộ cho tới khi nộp).
 *
 * @param {object} config
 * @param {string[]} config.letters - ['A','B','C'] hoặc ['A','B','C','D']
 * @param {(letter: string) => string|null} [config.textOf] - chữ của phương án; trả rỗng thì chỉ hiện chữ cái (Part 2)
 * @param {string|null} [config.picked] - chữ cái đã chọn
 * @param {string|null} [config.answer] - đáp án đúng; chỉ truyền khi ĐƯỢC PHÉP lộ
 * @param {(letter: string) => void} config.onPick
 * @param {boolean} [config.locked] - không cho chọn nữa
 * @param {(letter: string) => boolean} [config.isDisabled] - vô hiệu từng nút (vd chưa nghe hết)
 * @param {string|null} [config.marker] - chữ cái đang được phát (Part 2 hiện 🔊)
 * @param {string} [config.extra] - lớp CSS thêm cho mỗi nút
 * @param {(letter: string) => HTMLElement} [config.renderText] - vẽ phần chữ của phương án theo cách riêng
 *   (màn bộ đề dùng để từng từ trong phương án gạt được). CHỈ dùng khi đã `locked`, xem bên dưới.
 * @returns {HTMLElement}
 */
export function optionList({
  letters, textOf, picked = null, answer = null, onPick,
  locked = false, isDisabled, marker = null, extra = '', renderText,
}) {
  return el('div', { class: 'options' }, letters.map((letter) => {
    const classes = ['option'];
    if (extra) classes.push(extra);
    if (answer !== null) {
      if (letter === answer) classes.push('correct');
      else if (letter === picked) classes.push('wrong');
    } else if (letter === picked) classes.push('picked');
    if (marker === letter) classes.push('now');

    const off = locked || (isDisabled ? isDisabled(letter) : false);

    // Đã chấm xong VÀ bên gọi muốn chữ trong phương án tự vẽ (gạt từ lạ — D45): dựng bằng <div>.
    // Không dùng <button disabled> ở đây vì trình duyệt KHÔNG gửi sự kiện chạm cho con của một nút bị
    // disabled → chạm vào một từ bên trong sẽ không có gì xảy ra. Buộc phải `locked` để không bao giờ
    // gạt được từ trong phương án TRƯỚC khi trả lời: đánh dấu từ nào lúc đó là gợi ý ngầm cho đáp án (D34).
    if (renderText && locked) {
      return el('div', { class: `${classes.join(' ')} static` }, [
        el('span', { class: 'letter', text: letter }),
        renderText(letter),
      ]);
    }

    return el('button', {
      class: classes.join(' '),
      disabled: off ? 'disabled' : false,
      onClick: () => { if (!off) onPick(letter); },
    }, [
      el('span', { class: 'letter', text: letter }),
      el('span', { class: 'option-text', text: textOf?.(letter) ?? '' }),
    ]);
  }));
}

/**
 * Đề của câu Part 6 trong dữ liệu chỉ là "Blank [1]" — đề thật không in dòng này, vì chỗ trống đã nằm
 * trong đoạn văn rồi. In ra sẽ thừa và khó đọc.
 */
const BLANK_STEM = /^\s*Blank\s*\[\d+\]\s*$/i;

/**
 * Dòng đề của một câu, kèm số hiệu. Câu không có đề riêng (Part 6) thì chỉ hiện số.
 * @param {{stem: string}} question
 * @param {number|string} number
 * @returns {HTMLElement}
 */
export function questionLabel(question, number) {
  if (BLANK_STEM.test(question.stem ?? '')) {
    return el('div', { class: 'set-q-stem' }, [el('span', { class: 'q-no', text: `Câu ${number}` })]);
  }
  return el('div', { class: 'set-q-stem' }, [
    el('span', { class: 'q-no inline', text: `${number}.` }),
    ` ${question.stem}`,
  ]);
}

/**
 * Bố cục hai cột (D41): tài liệu bên trái, câu hỏi và phương án bên phải.
 * Trên điện thoại CSS xếp dọc lại, tài liệu lên trước.
 * @param {Array<Node|string>} material
 * @param {Array<Node|string>} questions
 * @returns {HTMLElement}
 */
export function splitPane(material, questions) {
  return el('div', { class: 'split' }, [
    el('div', { class: 'split-material' }, material),
    el('div', { class: 'split-questions' }, questions),
  ]);
}

/**
 * Thẻ nhắc việc (không có nút): dùng cho "còn mấy câu nữa mới chấm", "đã sang phần Đọc"…
 * @param {string} text
 * @param {string} [title]
 * @returns {HTMLElement}
 */
export function noticeCard(text, title) {
  return el('div', { class: 'card notice' }, [
    title ? el('div', { class: 'gaps-title', text: title }) : '',
    el('p', { text }),
  ]);
}

/**
 * Thẻ hỏi xác nhận: một câu hỏi, một dòng cảnh báo tuỳ chọn, hai nút.
 * @param {object} config
 * @param {string} config.message
 * @param {string} [config.warn]
 * @param {string} config.confirmLabel
 * @param {() => void} config.onConfirm
 * @param {() => void} config.onCancel
 * @param {string} [config.cancelLabel]
 * @returns {HTMLElement}
 */
export function confirmCard({ message, warn, confirmLabel, onConfirm, onCancel, cancelLabel = 'Làm tiếp' }) {
  return el('div', { class: 'card confirm' }, [
    el('p', { text: message }),
    warn ? el('div', { class: 'warn', text: warn }) : '',
    el('div', { class: 'exam-nav' }, [
      el('button', { class: 'secondary', onClick: onCancel }, [el('span', { text: cancelLabel })]),
      el('button', { class: 'primary', onClick: onConfirm }, [el('span', { text: confirmLabel })]),
    ]),
  ]);
}

/** Hai mục lớn mà các màn học quay về. Nhãn viết một lần ở đây, không rải chuỗi khắp nơi. */
const SECTIONS = Object.freeze({
  exams: { label: 'Bài thi', path: '/exams' },
  vocab: { label: 'Từ vựng', path: '/vocab' },
});

/**
 * Link "← Bài thi" / "← Từ vựng" ở góc trên các màn học.
 * @param {string} section - khoá trong SECTIONS
 * @returns {HTMLElement}
 */
export function backLink(section) {
  const { label, path } = SECTIONS[section];
  return el('button', { class: 'link', text: `← ${label}`, onClick: () => goTo(path) });
}

/**
 * Nút "Về mục Bài thi" / "Về mục Từ vựng" ở cuối các màn học.
 * @param {string} section - khoá trong SECTIONS
 * @param {{primary?: boolean}} [options]
 * @returns {HTMLElement}
 */
export function backButton(section, { primary = false } = {}) {
  const { label, path } = SECTIONS[section];
  return el('button', { class: primary ? 'primary' : 'secondary', onClick: () => goTo(path) }, [
    el('span', { text: `Về mục ${label}` }),
  ]);
}

/**
 * Dòng "Đúng" / "Sai — đáp án là B".
 * @param {{correct: boolean}} result
 * @param {string} answer
 * @returns {HTMLElement}
 */
export function verdictLine(result, answer) {
  return el('div', {
    class: `verdict ${result.correct ? 'ok' : 'no'}`,
    text: result.correct ? 'Đúng' : `Sai — đáp án là ${answer}`,
  });
}

/**
 * Thẻ giải thích sau khi chấm: lời giải tiếng Việt + vì sao các phương án sai lại hấp dẫn.
 * @param {{explanation: string, trap?: string}} question
 * @returns {HTMLElement}
 */
export function explanationCard(question) {
  return el('div', { class: 'card back' }, [
    el('div', { class: 'meaning', text: question.explanation }),
    question.trap ? el('div', { class: 'note', text: question.trap }) : '',
  ]);
}

/**
 * Phím vừa bấm ứng với phương án nào: nhận cả số (1–4) lẫn chữ cái (A–D).
 * @param {KeyboardEvent} event
 * @param {string[]} letters
 * @returns {string|null}
 */
export function letterFromKey(event, letters) {
  const byNumber = letters[Number.parseInt(event.key, 10) - 1];
  const upper = event.key.toUpperCase?.();
  return byNumber ?? (letters.includes(upper) ? upper : null);
}

/**
 * Hàng chọn tốc độ phát (0.75× / 1× / 1.25×). Lưu theo từng máy.
 * @param {object} store
 * @returns {HTMLElement}
 */
export function speedChooser(store) {
  const speed = getListenSpeed();
  return el('div', { class: 'chooser' }, [
    el('span', { class: 'chooser-label', text: 'Tốc độ' }),
    ...SPEEDS.map((option) => el('button', {
      class: option === speed ? 'chip-btn active' : 'chip-btn',
      text: `${option}×`,
      onClick: () => { setListenSpeed(option); store.refresh(); },
    })),
  ]);
}

/**
 * Màn "xong một lượt" — dùng chung cho ôn thẻ, phân loại, Part 5, ôn chủ động, bộ đề.
 *
 * Đây là màn quyết định người học có quay lại hay không, nên nó phải trả lời đúng ba câu, theo thứ tự:
 *   1. Vừa rồi mình làm được bao nhiêu?   → `headline` (con số to)
 *   2. Việc đó đổi được cái gì?           → `changed` (dòng "nhờ lượt này thì…")
 *   3. Giờ làm gì tiếp?                   → `actions`, luôn có ít nhất một nút
 * Trước đây mỗi màn tự bày một kiểu, phần lớn chỉ có một câu chữ xám — làm xong không thấy gì thay đổi.
 *
 * @param {object} o
 * @param {string} o.title
 * @param {string} o.headline - con số/kết quả chính của lượt, vd "8 / 10 câu đúng"
 * @param {string} [o.note] - một dòng giải thích dưới headline
 * @param {string} [o.changed] - lượt này làm đổi điều gì (đây là phần tạo động lực)
 * @param {Array<Node|string>} [o.extra] - khối chi tiết tuỳ màn (bảng, danh sách từ quên…)
 * @param {Array<Node|string>} o.actions - nút; đặt nút muốn người học bấm nhất lên đầu
 * @returns {HTMLElement}
 */
export function sessionDone({ title, headline, note, changed, extra = [], actions }) {
  return el('div', { class: 'session-done' }, [
    el('h1', { text: title }),
    el('div', { class: 'done-card' }, [
      el('div', { class: 'done-headline', text: headline }),
      note ? el('div', { class: 'done-note', text: note }) : '',
      changed ? el('div', { class: 'done-changed', text: changed }) : '',
    ]),
    ...extra,
    ...actions,
  ]);
}

/**
 * Một NHÓM mục điều hướng gọn: tiêu đề nhóm + các dòng xếp lưới.
 *
 * Trước đây mục Từ vựng và Bài thi bày 7–8 nút to full-width, mỗi nút hai dòng chữ, nên trên điện thoại
 * phải cuộn rất nhiều mới thấy hết. Gộp theo nhóm + xếp hai cột trên màn rộng thì nhìn một lần là thấy
 * hết, và biết mục nào họ hàng với mục nào.
 *
 * @param {string} title
 * @param {Array<{title: string, note?: string, path?: string, onClick?: Function, primary?: boolean}>} items
 * @returns {HTMLElement}
 */
export function navGroup(title, items) {
  const live = items.filter(Boolean);
  if (live.length === 0) return '';
  return el('section', { class: 'nav-group' }, [
    el('h2', { class: 'nav-group-title', text: title }),
    el('div', { class: 'nav-grid' }, live.map((item) => el('button', {
      class: item.primary ? 'nav-tile primary' : 'nav-tile',
      onClick: item.onClick ?? (() => goTo(item.path)),
    }, [
      el('span', { text: item.title }),
      item.note ? el('small', { text: item.note }) : '',
    ]))),
  ]);
}

/**
 * Nét vẽ SVG của các icon (khung 24×24, nét 2px, màu theo chữ). Thay cho ký tự Unicode/emoji (◔ ✎ ⇅ 🌙 👁):
 * emoji mỗi hệ điều hành vẽ một kiểu, cỡ và độ đậm lệch nhau — nhìn là biết "làm tay".
 */
const ICON_PATHS = Object.freeze({
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9v11h14V9"/><path d="M10 20v-6h4v6"/>',
  book: '<path d="M2 5h6a4 4 0 0 1 4 4v11a3 3 0 0 0-3-3H2z"/><path d="M22 5h-6a4 4 0 0 0-4 4v11a3 3 0 0 1 3-3h7z"/>',
  exam: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 2.5h6v3H9z"/><path d="M9 11h6M9 15h4"/>',
  sync: '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8"/><path d="M4 3v5h5"/><path d="M4 13a8 8 0 0 0 14.3 4.9L20 16"/><path d="M20 21v-5h-5"/>',
  moon: '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  eye: '<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  download: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
});

/**
 * Icon SVG, cỡ bằng cỡ chữ đang dùng. `aria-hidden` vì nút/tab luôn có chữ hoặc aria-label đi kèm.
 * @param {keyof typeof ICON_PATHS} name
 * @returns {HTMLElement}
 */
export function icon(name) {
  return el('span', {
    class: 'icon',
    'aria-hidden': 'true',
    html: '<svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2" '
      + `stroke-linecap="round" stroke-linejoin="round">${ICON_PATHS[name]}</svg>`,
  });
}
