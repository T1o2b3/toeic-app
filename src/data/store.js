/**
 * Nơi duy nhất nối nhật ký sự kiện (IndexedDB) với trạng thái tính ra được (reducer).
 * Màn hình chỉ nói chuyện với store, không tự mở database.
 *
 * Luồng: UI gọi record(...) -> ghi sự kiện vào IndexedDB -> tính lại trạng thái -> báo UI vẽ lại.
 */
import { createEvent } from '../logic/events.js';
import { reduceVocabState } from '../logic/vocab-state.js';
import { openDb, appendEvents, readAllEvents } from './db.js';
import { getDeviceId } from './device.js';
import { loadVocabDeck } from './content.js';

/**
 * Tạo store và nạp dữ liệu ban đầu.
 * @param {object} [options]
 * @param {IDBFactory} [options.factory]
 * @param {typeof fetch} [options.fetchImpl]
 * @returns {Promise<object>}
 */
export async function createStore({ factory, fetchImpl } = {}) {
  const db = await openDb(factory);
  const deckData = await loadVocabDeck(undefined, fetchImpl);
  const deviceId = getDeviceId();

  let events = await readAllEvents(db);
  let states = reduceVocabState(events);
  const listeners = new Set();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    deck: deckData,
    entries: deckData.entries,
    get states() { return states; },
    get eventCount() { return events.length; },

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
      notify();
      return event;
    },

    /** Toàn bộ nhật ký, dùng cho nút xuất dữ liệu (M6). */
    exportEvents() {
      return events.map((event) => ({ ...event }));
    },

    /** Đăng ký hàm được gọi mỗi khi trạng thái đổi. Trả về hàm huỷ đăng ký. */
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
