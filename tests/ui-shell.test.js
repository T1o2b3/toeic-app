// @vitest-environment jsdom
/**
 * Khung điều hướng mới (D36): thanh tab, dashboard, mục Từ vựng / Bài thi, và màn Tra từ.
 * Các `it` chạy nối tiếp, dùng chung một app (xem tests/helpers/ui-app.js).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import { bootApp } from './helpers/ui-app.js';

let store; let root; let tick; let go; let key; let text; let click; let triageWord;

const nav = () => document.querySelector('nav.tabbar');
const tabs = () => [...nav().querySelectorAll('a.tab')].map((a) => a.textContent);
const activeTab = () => nav().querySelector('a.tab.active')?.textContent ?? null;
const typeInto = async (value) => {
  const input = root.querySelector('input');
  input.value = value;
  input.dispatchEvent(new window.Event('input'));
  await tick(30);
  return input;
};

beforeAll(async () => {
  ({ store, root, tick, go, key, text, click, triageWord } = await bootApp());
});

describe('điều hướng chính: cột trái trên máy tính, thanh đáy trên điện thoại (D43)', () => {
  it('có 4 mục và tô sáng đúng mục ở mỗi màn (kể cả màn con); Tra từ nằm trong Từ vựng', async () => {
    await go('#/');
    expect(nav().classList.contains('in-session')).toBe(false);
    expect(tabs().map((t) => t.replace(/^\S+\s*/, '')).length).toBe(4);
    expect(nav().textContent).toContain('Tổng quan');
    expect(activeTab()).toContain('Tổng quan');
    for (const [hash, label] of [['#/vocab', 'Từ vựng'], ['#/words', 'Từ vựng'], ['#/lookup', 'Từ vựng'], ['#/exams', 'Bài thi'], ['#/sync', 'Sao lưu']]) {
      await go(hash);
      expect(activeTab(), hash).toContain(label);
    }
  });

  it('mỗi mục trỏ đúng địa chỉ; có tên app ở đầu cột (chỉ hiện trên màn rộng)', () => {
    expect([...nav().querySelectorAll('a.tab')].map((a) => a.getAttribute('href'))).toEqual(['#/', '#/vocab', '#/exams', '#/sync']);
    expect(nav().querySelector('.nav-brand').textContent).toBe('TOEIC 950');
  });

  it('phiên học: ẩn thanh ĐÁY (vướng hàng nút chấm) — cột trái thì CSS vẫn cho hiện', async () => {
    for (const hash of ['#/triage', '#/review', '#/practice', '#/quiz', '#/listen', '#/sets?part=6', '#/exam']) {
      await go(hash);
      expect(nav().classList.contains('in-session'), hash).toBe(true);
      expect(document.body.classList.contains('has-tabbar'), hash).toBe(false);
    }
  });

  it('thanh tab nằm ngoài #app nên vẽ lại màn không làm nó nháy', async () => {
    await go('#/');
    expect(root.contains(nav())).toBe(false);
  });
});

describe('dashboard khi chưa học gì', () => {
  it('có đủ các khối, biểu đồ báo chưa có hoạt động thay vì vẽ cột rỗng', async () => {
    await go('#/');
    expect(text()).toContain('Tổng quan');
    expect(text()).toContain('Hôm nay');
    expect(text()).toContain('14 ngày gần đây');
    expect(text()).toContain('Chưa có hoạt động nào');
    expect(root.querySelector('.viz-cols')).toBeNull();
    expect(text()).not.toContain('Chuỗi');
  });

  it('người mới (chưa phân loại từ nào): nút chính mời phân loại từ vựng, qua màn chọn tầng từ trước', async () => {
    expect(text()).toContain('Bắt đầu: phân loại từ vựng');
    expect(root.querySelectorAll('.panel.today button.pick')).toHaveLength(0);
    await click((t) => t.includes('Bắt đầu: phân loại'));
    expect(window.location.hash).toBe('#/vocab');
    expect(text()).toContain('Tầng từ');
    await go('#/');
  });

  it('ba số đầu trang: học tuần này (so với mục tiêu), từ nhớ vững, đúng ở bài thi — không còn số sự kiện thô', () => {
    const kpis = [...root.querySelectorAll('.kpi')].map((k) => k.textContent);
    expect(kpis).toHaveLength(3);
    expect(kpis[0]).toContain('Học tuần này');
    expect(kpis[0]).toContain('0 phút');
    expect(kpis[0]).toContain('mục tiêu 90 phút');
    expect(kpis[1]).toContain('Từ nhớ vững');
    expect(kpis[2]).toContain('Đúng ở bài thi');
    expect(kpis[2]).toContain('—');
    for (const gone of ['việc trong 7 ngày', 'ngày có học', 'thẻ đến hạn']) expect(text(), gone).not.toContain(gone);
  });

  it('không còn các nút chi tiết của mục Từ vựng / Bài thi ở trang chủ', () => {
    for (const gone of ['Ôn tập từ vựng', 'Kho từ vựng', 'Luyện phần Đọc', 'Luyện phần Nghe']) {
      expect(text(), gone).not.toContain(gone);
    }
  });
});

describe('dashboard sau khi học', () => {
  it('số liệu phản ánh đúng việc đã làm hôm nay', async () => {
    await go('#/triage');
    await triageWord('4'); await triageWord('1'); await triageWord('2');   // 3 việc từ vựng (bỏ qua thẻ cụm)
    await go('#/quiz');
    await key('a');                                        // 1 câu Part 5, đáp án A → đúng
    await tick(60);
    await go('#/');
    expect(text()).toContain('1 tuần đã học');
    const today = root.querySelector('.viz-col.today');
    expect(today.getAttribute('title')).toMatch(/4 việc \(3 Từ vựng, 1 Đọc\)/);
    expect(root.querySelector('.viz-cols').getAttribute('aria-label')).toContain('4 việc');
  });

  it('thẻ "Hôm nay" LUÔN có ít nhất một nút — màn chính không được là ngõ cụt', () => {
    // Quy tắc UX: lúc Huy mở app là lúc đang rảnh và sẵn sàng học. Mọi nhánh của thẻ "Hôm nay"
    // (mới bắt đầu / có việc đến hạn / hết việc) đều phải đưa ra một chỗ để bấm, không được chỉ
    // hiện một câu chữ xám rồi bắt tự đi tìm mục khác.
    const today = root.querySelector('.panel.today');
    expect(today.querySelectorAll('button').length).toBeGreaterThan(0);
  });

  it('huy hiệu đếm TUẦN, không đếm chuỗi ngày (RESEARCH.md: streak phản tác dụng ở nhịp 1–2h/tuần)', () => {
    expect(text()).not.toContain('Chuỗi');
    expect(root.querySelector('.weeks-badge').textContent).toMatch(/\d+ tuần đã học/);
  });

  it('học tuần này: ước tính từ số việc (3 từ × giây + 1 câu Part 5), thanh tiến độ khớp số phút', () => {
    const kpi = root.querySelector('.kpi');
    expect(kpi.textContent).toContain('1 phút');       // (4+4+4+25)s ≈ 37s → làm tròn 1 phút
    expect(root.querySelector('.meter').getAttribute('aria-valuenow')).toBe('1');
    expect(root.querySelector('.meter-fill').style.width).toMatch(/^1\.1/);
  });

  it('đúng ở bài thi: 1/1 câu Part 5 đúng → 100%, chưa có tuần trước nên chỉ ghi số câu', () => {
    const kpi = root.querySelectorAll('.kpi')[2].textContent;
    expect(kpi).toContain('100%');
    expect(kpi).toContain('1 câu · 7 ngày qua');
  });

  it('thẻ "Hôm nay" cho HAI lựa chọn, mỗi lựa chọn nói rõ LÝ DO được chọn', async () => {
    const picks = [...root.querySelectorAll('.panel.today button.pick')];
    expect(picks).toHaveLength(2);
    for (const b of picks) expect(b.querySelector('.pick-why').textContent).toMatch(/^vì .+/);
    // Hai lựa chọn phải khác loại nhau, không phải hai phần nghe hay hai việc từ vựng.
    expect(text()).toContain('Chọn một trong hai');
  });

  it('hai lựa chọn dẫn đúng chỗ khi bấm', async () => {
    const first = root.querySelector('.panel.today button.pick');
    const label = first.querySelector('span').textContent;
    first.click();
    await tick(50);
    expect(window.location.hash, `nút "${label}"`).not.toBe('#/');
    await go('#/');
  });

  it('có bảng thay thế cho biểu đồ (không dựa vào màu) với đủ 14 ngày', () => {
    expect(root.querySelectorAll('.viz-table tbody tr')).toHaveLength(14);
    expect(text()).toContain('Xem dạng bảng');
  });

  it('chú thích có đủ 3 chuỗi bằng chữ', () => {
    const legend = root.querySelector('.viz-legend').textContent;
    for (const label of ['Từ vựng', 'Đọc', 'Nghe']) expect(legend).toContain(label);
  });

  it('tiến độ từ vựng: số từ đã phân loại, thanh chỉ vẽ các mức (không có đoạn "chưa phân loại")', () => {
    expect(root.querySelector('.hero-value').textContent).toBe('3');   // 3 từ đã chấm (phím 4, 1, 2)
    expect(text()).toContain('/ 60 từ đã phân loại');
    expect(text()).toContain('1 thành thạo · 2 đang học');
    expect(root.querySelectorAll('.viz-bar-seg')).toHaveLength(3);      // không biết, đoán được, thành thạo
    expect(root.querySelector('.viz-bar').getAttribute('aria-label')).not.toContain('Chưa phân loại');
  });

  it('chú thích đủ 5 dòng và tổng số từ khớp số từ trong deck', () => {
    const values = [...root.querySelectorAll('.viz-row-value')].map((n) => Number.parseInt(n.textContent, 10));
    expect(values).toHaveLength(5);
    expect(values.reduce((a, b) => a + b, 0)).toBe(60);
  });

  it('ô Đọc hiện 100% (1/1), ô Nghe chưa có câu nào', () => {
    const tiles = [...root.querySelectorAll('.tile')];
    expect(tiles[0].textContent).toContain('100%');
    expect(tiles[1].textContent).toContain('chưa làm câu nào');
  });

  it('bấm tiêu đề khối để sang mục tương ứng; bấm dòng mức để mở đúng danh sách trong kho', async () => {
    await click((t) => t.startsWith('Từ vựng') && t.includes('Xem'));
    expect(window.location.hash).toBe('#/vocab');
    await go('#/');
    await click((t) => t.startsWith('Thành thạo'));
    expect(window.location.hash).toBe('#/words?f=fluent');
  });
});

describe('mục Từ vựng và Bài thi', () => {
  it('Từ vựng gom mọi nút học từ; ô tra nhanh chuyển sang Tra từ khi bấm Enter', async () => {
    await go('#/vocab');
    for (const label of ['Ôn tập', 'Phân loại từ vựng', 'Ôn chủ động', 'Kho từ vựng']) expect(text()).toContain(label);
    expect(text()).not.toContain('Luyện phần Đọc');
    // Gộp thành nhóm để bớt cuộn: "Học" (việc tốn công) và "Tra cứu & xem lại" (mở ra xem rồi đóng).
    expect([...root.querySelectorAll('.nav-group-title')].map((h) => h.textContent))
      .toEqual(['Học', 'Tra cứu & xem lại']);
    const input = root.querySelector('input');
    input.value = 'amend';
    input.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    await tick(60);
    expect(window.location.hash).toBe('#/lookup?q=amend');
  });

  it('Bài thi gom theo KỸ NĂNG (Đọc / Nghe), không có nút từ vựng', async () => {
    await go('#/exams');
    expect([...root.querySelectorAll('.nav-group-title')].map((h) => h.textContent))
      .toEqual(['Luyện phần Đọc', 'Luyện phần Nghe · nên đeo tai nghe']);
    expect(text()).toContain('Part 5 · Điền câu');
    expect(text()).toContain('Part 2 · Hỏi - đáp');
    // Gộp cho gọn nhưng vẫn phải chỉ ra chỗ bắt đầu: đúng MỘT phần được đánh dấu "cần nhất".
    expect([...root.querySelectorAll('.nav-tile')].filter((b) => b.textContent.includes('cần nhất')))
      .toHaveLength(1);
    expect(text()).toContain('đúng 100%');
    expect(text()).not.toContain('Kho từ vựng');
  });

  it('nút quay lại của màn học trỏ về đúng mục (Từ vựng / Bài thi)', async () => {
    await go('#/triage');
    await click((t) => t.includes('← Từ vựng'));
    expect(window.location.hash).toBe('#/vocab');
    await go('#/quiz');
    await click((t) => t.includes('← Bài thi'));
    expect(window.location.hash).toBe('#/exams');
  });
});

describe('Tra từ', () => {
  it('chưa gõ gì: có gợi ý và ví dụ để bấm thử', async () => {
    await go('#/lookup');
    expect(text()).toContain('Tìm trong 60 từ');
    expect(root.querySelectorAll('.lookup-hint .chip-btn').length).toBeGreaterThan(2);
  });

  it('gõ đúng một từ thì mở luôn thẻ đầy đủ (kể cả từ chưa học) — ô nhập không bị thay mất', async () => {
    const input = root.querySelector('input');
    await typeInto('w30x');
    expect(root.querySelector('input')).toBe(input);
    expect(text()).toContain('nghĩa số 30');
    expect(text()).toContain('Example 30.');
    expect(text()).toContain('chưa học');
    expect(text()).toContain('＋ Thêm vào danh sách học');
  });

  it('bấm thêm: ghi đúng một sự kiện phân loại, hiện thông báo, nút đổi thành "Đang trong danh sách học"', async () => {
    const events = store.eventCount;
    await click((t) => t.includes('Thêm vào danh sách học'));
    await tick(60);
    expect(store.eventCount).toBe(events + 1);
    expect(store.states.get('tsl-0030')).toMatchObject({ triaged: true, level: 'unknown', known: false });
    expect(text()).toContain('Đã thêm “w30x”');
    expect(root.querySelector('button.secondary[disabled]').textContent).toContain('Đang trong danh sách học');
    expect(root.querySelector('input').value).toBe('w30x');
  });

  it('tìm theo nghĩa tiếng Việt không cần gõ dấu', async () => {
    await typeInto('nghia so 12');
    expect(root.querySelector('.word-row strong').textContent).toBe('w12x');
  });

  it('nhiều kết quả: xếp theo độ khớp và không tự mở thẻ nào khi chỉ khớp mờ', async () => {
    await typeInto('nghia so');
    expect(root.querySelectorAll('.word-row').length).toBeGreaterThan(10);
    expect(root.querySelector('.word-detail')).toBeNull();
  });

  it('từ không có trong deck: cho ghi lại để học sau và tra từ điển ngoài', async () => {
    await typeInto('zoning');
    expect(text()).toContain('Không có “zoning” trong bộ từ');
    expect(root.querySelector('a.ext-link').href).toContain('wiktionary.org/wiki/zoning');
    const events = store.eventCount;
    await click((t) => t.includes('Ghi lại “zoning”'));
    await tick(60);
    expect(store.eventCount).toBe(events + 1);
    expect(store.captured.has('zoning')).toBe(true);
    expect(text()).toContain('Đã ghi lại “zoning”');
  });

  it('địa chỉ có ?q= thì tra sẵn; rời màn rồi vào lại thì ô nhập trống', async () => {
    await go('#/lookup?q=w05x');
    expect(root.querySelector('input').value).toBe('w05x');
    expect(text()).toContain('nghĩa số 05');
    await go('#/');
    await go('#/lookup');
    expect(root.querySelector('input').value).toBe('');
  });
});

describe('nút quay về mục (dùng chung blocks.js)', () => {
  it('màn học trỏ về đúng mục: Part 5 → Bài thi, ôn chủ động → Từ vựng', async () => {
    await go('#/quiz');
    expect(text()).toContain('← Bài thi');
    await go('#/practice');
    expect(text()).toContain('← Từ vựng');
  });

  it('màn "hết từ" của kho từ hay sai có nút Về mục Từ vựng', async () => {
    await go('#/weak');
    expect(text()).toContain('Về mục Từ vựng');
  });

  it('màn hết câu của Part 5 có nút về mục Bài thi', async () => {
    await go('#/listen');
    expect(text()).toMatch(/← Bài thi|Về mục Bài thi/);
  });
});
