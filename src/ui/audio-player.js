/**
 * Bộ phát âm thanh cho bài nghe: phát một chuỗi (đoạn âm thanh + khoảng lặng) bằng MỘT phần tử Audio.
 *
 * Vì sao thiết kế thế này (đều là ràng buộc của iPhone/Safari):
 *  - Dùng đúng MỘT phần tử Audio cho cả chuỗi. Safari chỉ cho phát khi có thao tác chạm của người dùng;
 *    phần tử đã được "mở khoá" bằng lần chạm đầu thì các đoạn sau (nối bằng sự kiện ended) phát được.
 *  - TẢI TRƯỚC mọi đoạn thành blob (`preload`) ngay khi câu hiện ra, để lúc chạm nút Nghe thì
 *    `audio.play()` gọi được ĐỒNG BỘ trong thao tác chạm. Nếu phải `await fetch` trước, Safari coi là
 *    không còn trong thao tác chạm và chặn.
 *  - Phát từ blob thay vì từ URL: tránh hẳn request dạng Range (Safari đòi, cache offline không lưu được 206),
 *    và fetch trọn file là 200 nên service worker lưu được để mở offline vẫn nghe.
 */

/**
 * @param {object} [options]
 * @param {() => HTMLAudioElement} [options.makeAudio]
 * @param {typeof fetch} [options.fetchImpl]
 * @param {(blob: Blob) => string} [options.toUrl] - tạo địa chỉ phát từ blob
 * @param {(url: string) => void} [options.revoke]
 * @param {(ms: number) => Promise<void>} [options.wait]
 */
export function createPlayer({
  makeAudio = () => new Audio(),
  fetchImpl = (...args) => fetch(...args),
  toUrl = (blob) => URL.createObjectURL(blob),
  revoke = (url) => URL.revokeObjectURL(url),
  wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
} = {}) {
  const audio = makeAudio();
  /** src -> địa chỉ blob đã sẵn sàng, hoặc Promise đang tải */
  const cache = new Map();
  let token = 0;
  let cancelClip = null;

  /** Tải trước một đoạn. Lỗi mạng thì ghi nhận là chưa có (phát sẽ thử tải lại / dùng địa chỉ gốc). */
  function preloadOne(src) {
    if (cache.has(src)) return cache.get(src);
    const job = (async () => {
      try {
        const response = await fetchImpl(src);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return toUrl(await response.blob());
      } catch {
        cache.delete(src); // lần sau thử lại
        return null;
      }
    })();
    cache.set(src, job);
    job.then((url) => { if (url) cache.set(src, url); });
    return job;
  }

  /** Địa chỉ phát, nếu đã có sẵn ngay (không cần đợi). */
  const ready = (src) => (typeof cache.get(src) === 'string' ? cache.get(src) : null);

  function playClip(url, rate) {
    return new Promise((resolve, reject) => {
      cancelClip = resolve;
      audio.onended = resolve;
      audio.onerror = () => reject(new Error('Không phát được âm thanh'));
      audio.src = url;
      // Đặt tốc độ SAU khi gán src: một số trình duyệt đặt lại tốc độ khi đổi nguồn.
      audio.defaultPlaybackRate = rate;
      audio.playbackRate = rate;
      if ('preservesPitch' in audio) audio.preservesPitch = true; // đổi tốc độ mà không đổi cao độ giọng
      const started = audio.play();
      if (started?.catch) started.catch(reject);
    });
  }

  return {
    /**
     * Tải trước các đoạn để lần phát sau gọi play() được ngay trong thao tác chạm.
     * @param {string[]} sources
     * @returns {Promise<void>}
     */
    async preload(sources) {
      await Promise.all(sources.map(preloadOne));
    },

    /**
     * Phát một chuỗi bước. Phát mới hoặc `stop()` sẽ ngắt chuỗi đang chạy.
     * @param {Array<{type: 'clip', key: string, src: string}|{type: 'gap', ms: number}>} steps
     * @param {{rate?: number, onStep?: (step: object) => void}} [options]
     * @returns {Promise<'done'|'stopped'>}
     */
    async play(steps, { rate = 1, onStep } = {}) {
      token += 1;
      const mine = token;
      cancelClip?.();
      for (const step of steps) {
        if (mine !== token) return 'stopped';
        onStep?.(step);
        if (step.type === 'gap') {
          await wait(step.ms);
          continue;
        }
        // Đoạn đã tải sẵn thì phát ngay (giữ được thao tác chạm); chưa có thì đợi tải, tải hỏng thì dùng địa chỉ gốc.
        const url = ready(step.src) ?? (await preloadOne(step.src)) ?? step.src;
        if (mine !== token) return 'stopped';
        await playClip(url, rate);
      }
      return mine === token ? 'done' : 'stopped';
    },

    /** Ngắt mọi thứ đang phát. */
    stop() {
      token += 1;
      cancelClip?.();
      cancelClip = null;
      audio.pause();
    },

    /** Giải phóng bộ nhớ blob đã tải. */
    dispose() {
      this.stop();
      for (const value of cache.values()) if (typeof value === 'string') revoke(value);
      cache.clear();
    },
  };
}

/**
 * "Ổ cắm" bộ phát cho một màn: tạo bộ phát lúc cần, và cho test thay bằng bộ phát giả.
 *
 * Ba màn (luyện nghe, luyện bộ, thi thử) đều cần đúng mẫu này. Chép tay ba lần thì sửa một chỗ
 * hai chỗ kia lệch — nhất là chỗ `dispose()` khi rời màn (quên là còn tiếng chạy nền).
 *
 * @param {() => object} [makeDefault]
 * @returns {{get: () => object, setFactory: (factory: () => object) => void, dispose: () => void}}
 */
export function createPlayerSlot(makeDefault = () => createPlayer()) {
  let make = makeDefault;
  let player = null;
  return {
    get: () => (player ??= make()),
    setFactory(factory) {
      player?.dispose();
      player = null;
      make = factory;
    },
    dispose() {
      player?.dispose();
      player = null;
    },
  };
}
