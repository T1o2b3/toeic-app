import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { parseTslCsv, makeVocabId, TSL_ATTRIBUTION, BSL_ATTRIBUTION, NOT_WORDS, WORDLISTS, readWordlistCsv } from '../pipeline/lib/wordlists.js';
import { projectPath } from '../pipeline/lib/cli.js';

const CSV = `Word,TSL Rank,SFI,U
mister,1,71.28,1342.2
Vacation,2,65.56,359.64
client,3,65.26,335.37`;

describe('parseTslCsv', () => {
  it('đọc được từ và thứ hạng, chuyển về chữ thường', () => {
    expect(parseTslCsv(CSV)).toEqual([
      { word: 'mister', rank: 1 },
      { word: 'vacation', rank: 2 },
      { word: 'client', rank: 3 },
    ]);
  });

  it('sắp xếp theo rank kể cả khi file xáo trộn', () => {
    const shuffled = 'Word,TSL Rank\nclient,3\nmister,1\nvacation,2';
    expect(parseTslCsv(shuffled).map((w) => w.rank)).toEqual([1, 2, 3]);
  });

  it('bỏ qua dòng hỏng thay vì làm hỏng cả lô', () => {
    const dirty = 'Word,TSL Rank\nmister,1\n,2\nbroken,x\n\nclient,3';
    expect(parseTslCsv(dirty).map((w) => w.word)).toEqual(['mister', 'client']);
  });

  it('báo lỗi rõ ràng khi sai định dạng file', () => {
    expect(() => parseTslCsv('a,b\n1,2')).toThrow(/thiếu cột/);
  });

  it('CSV rỗng trả về mảng rỗng', () => {
    expect(parseTslCsv('')).toEqual([]);
  });
});

describe('makeVocabId', () => {
  it('đệm số 0 cho đủ 4 chữ số', () => {
    expect(makeVocabId(7)).toBe('tsl-0007');
    expect(makeVocabId(1250)).toBe('tsl-1250');
  });

  it('từ chối rank không hợp lệ', () => {
    expect(() => makeVocabId(0)).toThrow();
    expect(() => makeVocabId(1.5)).toThrow();
  });
});

describe('file TSL thật đã tải về', () => {
  it('đọc được đủ 1250 từ', () => {
    const csv = readFileSync(new URL('../pipeline/data/TSL_12_stats.csv', import.meta.url), 'utf8');
    const words = parseTslCsv(csv);
    expect(words).toHaveLength(1250);
    expect(words[0]).toEqual({ word: 'mister', rank: 1 });
    expect(new Set(words.map((w) => w.rank)).size).toBe(1250);
  });
});

describe('TSL_ATTRIBUTION', () => {
  it('giữ đúng giấy phép CC BY-SA 4.0 (D18)', () => {
    expect(TSL_ATTRIBUTION.license).toBe('CC BY-SA 4.0');
  });
});

describe('đọc danh sách thứ hai (BSL) bằng cùng một hàm', () => {
  const BSL = `﻿Word,BSL Rank,Band,SFI,U
equity,3,1,62.1,10
non,4,1,61.0,9
Sponsorship,5,1,60.2,8`;

  it('đọc được file có tên cột rank khác', () => {
    expect(parseTslCsv(BSL, { rankColumn: 'BSL Rank' }).map((w) => w.word))
      .toEqual(['equity', 'sponsorship']);
  });

  it('bỏ qua dòng thực ra là tiền tố chứ không phải từ', () => {
    // `non` đến từ việc tách `non-profit`; học nó như từ đơn thì vô nghĩa.
    expect(NOT_WORDS).toContain('non');
    expect(parseTslCsv(BSL, { rankColumn: 'BSL Rank' }).map((w) => w.word)).not.toContain('non');
  });

  it('bỏ BOM ở đầu file — không bỏ thì tên cột đầu tiên không khớp', () => {
    expect(() => parseTslCsv(BSL, { rankColumn: 'BSL Rank' })).not.toThrow();
  });

  it('không truyền rankColumn thì vẫn mặc định là TSL, giữ nguyên cách gọi cũ', () => {
    expect(parseTslCsv(CSV).map((w) => w.word)).toEqual(['mister', 'vacation', 'client']);
  });

  it('báo rõ thiếu cột nào khi đưa nhầm file', () => {
    expect(() => parseTslCsv(BSL, { rankColumn: 'TSL Rank' })).toThrow(/TSL Rank/);
  });
});

describe('makeVocabId với tiền tố', () => {
  it('tách id của hai danh sách ra', () => {
    expect(makeVocabId(3, 'bsl')).toBe('bsl-0003');
    expect(makeVocabId(3, 'tsl')).toBe('tsl-0003');
    expect(makeVocabId(3)).toBe('tsl-0003'); // mặc định giữ nguyên như cũ
  });

  it('từ chối tiền tố lạ — id là vĩnh viễn, ghi sai là hỏng luôn (D16)', () => {
    expect(() => makeVocabId(3, '')).toThrow();
    expect(() => makeVocabId(3, 'QUA-DAI')).toThrow();
  });
});

describe('WORDLISTS', () => {
  it('mỗi danh sách khai báo đủ thông tin để pipeline chạy', () => {
    for (const [name, list] of Object.entries(WORDLISTS)) {
      for (const field of ['deck', 'idPrefix', 'csv', 'rankColumn', 'output', 'aiCache', 'ipaCache', 'attribution']) {
        expect(list[field], `${name}.${field}`).toBeTruthy();
      }
    }
  });

  it('hai danh sách KHÔNG dùng chung file cache — chạy song song sẽ đè lên nhau', () => {
    const caches = Object.values(WORDLISTS).flatMap((l) => [l.aiCache, l.ipaCache]);
    expect(new Set(caches).size).toBe(caches.length);
  });

  it('hai danh sách khác deck, khác tiền tố id, khác file kết quả', () => {
    const lists = Object.values(WORDLISTS);
    for (const field of ['deck', 'idPrefix', 'output']) {
      const values = lists.map((l) => l[field]);
      expect(new Set(values).size, field).toBe(values.length);
    }
  });

  it('deck cao cấp ghi công đúng nguồn BSL và loại phần trùng TSL', () => {
    expect(WORDLISTS.bsl.attribution).toBe(BSL_ATTRIBUTION);
    expect(BSL_ATTRIBUTION.license).toBe('CC BY-SA 4.0');
    expect(TSL_ATTRIBUTION.license).toBe('CC BY-SA 4.0');
    expect(WORDLISTS.bsl.excludeFrom).toBe('tsl');
  });
});

describe('readWordlistCsv', () => {
  it('đọc đúng từ có dấu trong file Latin-1 (3 từ TSL trước đây không sinh được vì lỗi này)', () => {
    const words = parseTslCsv(readWordlistCsv(projectPath(WORDLISTS.tsl.csv)), { rankColumn: WORDLISTS.tsl.rankColumn });
    expect(words).toHaveLength(1250);
    const accented = words.filter((w) => /[^\x00-\x7F]/.test(w.word));
    expect(accented.map((w) => w.word)).toEqual(['résumé', 'café', 'entrée']);
    expect(accented.every((w) => !w.word.includes('�'))).toBe(true);   // không còn ký tự thay thế
  });

  it('file UTF-8 thật (BSL) KHÔNG bị đọc nhầm thành Latin-1', () => {
    const words = parseTslCsv(readWordlistCsv(projectPath(WORDLISTS.bsl.csv)), { rankColumn: WORDLISTS.bsl.rankColumn });
    expect(words.length).toBeGreaterThan(1000);
    expect(words.every((w) => !w.word.includes('�'))).toBe(true);
  });
});
