/**
 * Nơi duy nhất nối nhật ký sự kiện (IndexedDB) với trạng thái tính ra được (reducer).
 * Màn hình chỉ nói chuyện với store, không tự mở database.
 *
 * Luồng: UI gọi record(...) -> ghi sự kiện vào IndexedDB -> tính lại trạng thái -> báo UI vẽ lại.
 */
import { createEvent } from '../logic/events.js';
import { reduceVocabState } from '../logic/vocab-state.js';
import { reduceQuizState } from '../logic/quiz.js';
import { reduceCaptured, buildWordIndex } from '../logic/capture.js';
import { buildSearchIndex } from '../logic/lookup.js';
import { openDb, appendEvents, readAllEvents } from './db.js';
import { getDeviceId } from './device.js';
import { loadAllVocabDecks, loadQuestionBank, loadListeningBank, loadSetBank } from './content.js';
import { SET_PARTS } from '../logic/sets.js';

/**
 * Tạo store và nạp dữ liệu ban đầu.
 * @param {object} [options]
 * @param {IDBFactory} [options.factory]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<object>}
 */
export async function createStore({ factory, fetchImpl } = {}) {
  const db = await openDb(factory);
  const [vocab, questionBank, listeningBank, ...setBanks] = await Promise.all([
    loadAllVocabDecks(fetchImpl),
    loadQuestionBank(undefined, fetchImpl),
    loadListeningBank(undefined, fetchImpl),
    ...SET_PARTS.map((part) => loadSetBank(part, fetchImpl)),
  ]);
  const sets = Object.fromEntries(SET_PARTS.map((part, i) => [part, setBanks[i]]));
  const deviceId = getDeviceId();

  let events = await readAllEvents(db);
  let states = reduceVocabState(events);
  let quizStates = reduceQuizState(events);
  let captured = reduceCaptured(events);
  const wordIndex = buildWordIndex(vocab.entries);
  let searchIndex = null; // dựng lần đầu khi cần tra từ, không tốn thời gian lúc mở app
  const listeners = new Set();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    deck: vocab.primary,
    decks: vocab.decks,
    entries: vocab.entries,
    questions: questionBank.entries,
    /** Câu nghe Part 2 (M9). Trạng thái làm bài dùng chung `quizStates` với Part 5 vì cùng khoá theo questionId. */
    listening: listeningBank.entries,
    /** Bộ tài liệu + câu hỏi theo Part (3, 4, 6, 7): {3: [...], 4: [...], 6: [...], 7: [...]}. Xem logic/sets.js. */
    sets,
    deviceId,
    get states() { return states; },
    get quizStates() { return quizStates; },
    /** Từ đã gạt lúc làm bài (D34): từ (chuẩn hoá) -> {count, questionIds, ...}. */
    get captured() { return captured; },
    /** Chỉ mục từ -> mục deck, dùng để biết một từ gạt được đã có trong deck chưa. */
    wordIndex,
    get eventCount() { return events.length; },
    /** Toàn bộ nhật ký, CHỈ ĐỌC (không sửa). Dashboard tính số liệu từ đây; muốn bản sao thì dùng exportEvents(). */
    get events() { return events; },
    /** Chỉ mục tra cứu từ vựng (xem logic/lookup.js), dựng một lần. */
    get searchIndex() { return (searchIndex ??= buildSearchIndex(vocab.entries)); },

    /**
     * Ghi một sự kiện mới rồi tính lại trạng thái.
     * @param {string} type
     * @param {object} payload
     */
    async record(type, payload) {
      const event = createEvent({ type, deviceId, payload });
      await appendEvents(db, [event]);
      events = [...events, event];
      states = reduceVocabState(events);
      quizStates = reduceQuizState(events);
      captured = reduceCaptured(events);
      notify();
      return event;
    },

    /**
     * Nhận sự kiện từ nơi khác (đồng bộ Supabase, hoặc nhập lại file sao lưu).
     * Sự kiện trùng id bị bỏ qua ở lớp IndexedDB nên gọi lại nhiều lần vẫn an toàn.
     * @param {Array<object>} incoming
     * @returns {Promise<number>} số sự kiện thực sự thêm mới
     */
    async importEvents(incoming) {
      const added = await appendEvents(db, incoming);
      if (added > 0) {
        events = await readAllEvents(db);
        states = reduceVocabState(events);
        quizStates = reduceQuizState(events);
        captured = reduceCaptured(events);
        notify();
      }
      return added;
    },

    /** Toàn bộ nhật ký, dùng cho nút xuất dữ liệu (M6). */
    exportEvents() {
      return events.map((event) => ({ ...event }));
    },

    /** Yêu cầu vẽ lại mà không ghi sự kiện nào (vd khi lật thẻ). */
    refresh() {
      notify();
    },

    /** Đăng ký hàm được gọi mỗi khi trạng thái đổi. Trả về hàm huỷ đăng ký. */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
