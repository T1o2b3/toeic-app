/**
 * Lưu nhật ký sự kiện vào IndexedDB (D24: ghi máy trước, đồng bộ sau).
 *
 * IndexedDB là kho dữ liệu của trình duyệt: giống một cơ sở dữ liệu nhỏ nằm trong máy,
 * dung lượng lớn hơn localStorage nhiều và không mất khi tải lại trang. API của nó dùng
 * callback kiểu cũ, nên ở đây bọc lại thành Promise cho dễ dùng.
 *
 * Chỉ có MỘT bảng `events`, append-only (D23). Không có bảng "trạng thái" —
 * trạng thái luôn được tính lại từ nhật ký bằng reduceVocabState.
 */
const DB_NAME = 'toeic-app';
const DB_VERSION = 1;
const STORE = 'events';

/**
 * Bọc một IDBRequest thành Promise.
 * @param {IDBRequest} request
 * @returns {Promise<any>}
 */
function promisify(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Mở (và tạo nếu cần) cơ sở dữ liệu.
 * @param {IDBFactory} [factory] - tiêm được để test bằng IndexedDB giả
 * @returns {Promise<IDBDatabase>}
 */
export function openDb(factory = globalThis.indexedDB) {
  if (!factory) throw new Error('Trình duyệt này không hỗ trợ IndexedDB');

  return new Promise((resolve, reject) => {
    const request = factory.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('ts', 'ts');
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Ghi thêm sự kiện. Sự kiện trùng id bị bỏ qua (không ghi đè) — nhật ký là append-only,
 * và đồng bộ có thể gửi lại sự kiện đã có.
 * @param {IDBDatabase} db
 * @param {object[]} events
 * @returns {Promise<number>} số sự kiện thực sự được thêm mới
 */
export function appendEvents(db, events) {
  if (events.length === 0) return Promise.resolve(0);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    let added = 0;

    for (const event of events) {
      const request = store.add(event);
      request.onsuccess = () => { added += 1; };
      // Trùng id -> ConstraintError. Nuốt lỗi này để giao dịch không bị huỷ.
      request.onerror = (e) => { e.preventDefault(); e.stopPropagation(); };
    }

    tx.oncomplete = () => resolve(added);
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Đọc toàn bộ nhật ký, sắp xếp theo thời gian.
 * @param {IDBDatabase} db
 * @returns {Promise<object[]>}
 */
export async function readAllEvents(db) {
  const tx = db.transaction(STORE, 'readonly');
  const events = await promisify(tx.objectStore(STORE).index('ts').getAll());
  return events;
}

/**
 * Đếm số sự kiện đang có.
 * @param {IDBDatabase} db
 * @returns {Promise<number>}
 */
export function countEvents(db) {
  const tx = db.transaction(STORE, 'readonly');
  return promisify(tx.objectStore(STORE).count());
}

/**
 * Xoá sạch nhật ký. Chỉ dùng khi Huy chủ động bấm "xoá dữ liệu" hoặc trong test —
 * KHÔNG dùng trong luồng chạy bình thường (D23: sự kiện là bất biến).
 * @param {IDBDatabase} db
 * @returns {Promise<void>}
 */
export async function clearAllEvents(db) {
  const tx = db.transaction(STORE, 'readwrite');
  await promisify(tx.objectStore(STORE).clear());
}
