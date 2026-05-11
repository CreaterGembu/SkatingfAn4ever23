'use client';
import React, { useEffect, useState } from 'react';

/**
 * page.tsx — 完全版
 *
 * 追加／調整点（ユーザ指定どおり）
 * - 「後半 (secondHalf)」チェック時は内部 BV が ×1.1（表示は BV に加えて "X" 表示）。
 * - GOE の計算は secondHalf を反映しない BV を使う（ただし underrotation '<'/'<<', edge 'e', REP の BV 影響は GOE 用 BV に含める）。
 * - '*' (Zayak) は BV=0・GOE=0。
 * - ChSq1 は GOE に 0.5 を掛ける（GOE点 = BV_forGOE × 0.1 × GOE × 0.5）。
 * - SEQチェックを REP/F と同じ欄に追加（SEQ は BV に影響しない）。
 * - 行ごとのハイライト（F: 赤系、GOE>0: 緑系、secondHalf: 黄系）
 * - スマホ/iPad優先でタップしやすい UI（横スクロール、ボタン大きめ）
 * - 「決定して表示」ボタンでページが切り替わり（編集 → プロトコル表示）
 *
 * 注意：
 * - 実運用での細かいルール（例えば GOE の係数やREPの厳密な適用タイミング等）は現行の要望に合わせて実装していますが、
 *   もし ISU の最新版ルールと厳密に照合する必要がある場合は具体ルールを提示してください。
 */

/* ---------- 型定義 ---------- */
type Element = {
  name: string;
  baseValue: number;
  type: 'jump' | 'spin' | 'step' | 'choreo';
};

type LineSubElement = {
  id: number;
  element: Element;
  underRotation?: '' | 'q' | '<' | '<<';
  edge?: '' | '!' | 'e';
  goe: number; // integer -5..5
  marks: string[]; // "F","REP","*","V","SEQ","COMBO"
  secondHalf?: boolean;
};

type Line = {
  id: number;
  subs: LineSubElement[];
};

type PCS = {
  comp: number;
  pres: number;
  skills: number;
};

type HistoryItem = {
  id: number;
  playerName: string;
  country: string;
  competition: string;
  category: string;
  tes: number;
  pcsRaw: number;
  pcsApplied: number;
  total: number;
  timestamp: string;
  protocolHtml?: string;
};

const uid = () => Math.floor(Math.random() * 1e9);

/* ---------- 要素テーブル ---------- */
const JUMPS: Element[] = [
  { name: 'A', baseValue: 0.0, type: 'jump' },
  { name: '1A', baseValue: 1.1, type: 'jump' },
  { name: '2A', baseValue: 3.3, type: 'jump' },
  { name: '3A', baseValue: 8.0, type: 'jump' },
  { name: '4A', baseValue: 12.5, type: 'jump' },

  { name: 'Lz', baseValue: 0.0, type: 'jump' },
  { name: '1Lz', baseValue: 0.6, type: 'jump' },
  { name: '2Lz', baseValue: 2.1, type: 'jump' },
  { name: '3Lz', baseValue: 5.9, type: 'jump' },
  { name: '4Lz', baseValue: 11.5, type: 'jump' },
  { name: '5Lz', baseValue: 14.0, type: 'jump' },

  { name: 'F', baseValue: 0.0, type: 'jump' },
  { name: '1F', baseValue: 0.5, type: 'jump' },
  { name: '2F', baseValue: 1.8, type: 'jump' },
  { name: '3F', baseValue: 5.3, type: 'jump' },
  { name: '4F', baseValue: 11.0, type: 'jump' },
  { name: '5F', baseValue: 14.0, type: 'jump' },

  { name: '1Eu', baseValue: 0.0, type: 'jump' },
  { name: 'Lo', baseValue: 0.0, type: 'jump' },
  { name: '1Lo', baseValue: 0.5, type: 'jump' },
  { name: '2Lo', baseValue: 1.7, type: 'jump' },
  { name: '3Lo', baseValue: 4.9, type: 'jump' },
  { name: '4Lo', baseValue: 10.5, type: 'jump' },
  { name: '5Lo', baseValue: 14.0, type: 'jump' },

  { name: 'S', baseValue: 0.0, type: 'jump' },
  { name: '1S', baseValue: 0.4, type: 'jump' },
  { name: '2S', baseValue: 1.3, type: 'jump' },
  { name: '3S', baseValue: 4.3, type: 'jump' },
  { name: '4S', baseValue: 9.7, type: 'jump' },
  { name: '5S', baseValue: 14.0, type: 'jump' },

  { name: 'T', baseValue: 0.0, type: 'jump' },
  { name: '1T', baseValue: 0.4, type: 'jump' },
  { name: '2T', baseValue: 1.3, type: 'jump' },
  { name: '3T', baseValue: 4.2, type: 'jump' },
  { name: '4T', baseValue: 9.5, type: 'jump' },
  { name: '5T', baseValue: 14.0, type: 'jump' },
];

const SPINS: Element[] = [
  { name: 'USp4', baseValue: 2.9, type: 'spin' },
  { name: 'USp3', baseValue: 2.3, type: 'spin' },
  { name: 'USp2', baseValue: 1.8, type: 'spin' },
  { name: 'USp1', baseValue: 1.4, type: 'spin' },
  { name: 'USpB', baseValue: 1.2, type: 'spin' },
  { name: 'LSp4', baseValue: 3.2, type: 'spin' },
  { name: 'LSp3', baseValue: 2.9, type: 'spin' },
  { name: 'LSp2', baseValue: 2.3, type: 'spin' },
  { name: 'LSp1', baseValue: 1.8, type: 'spin' },
  { name: 'LSpB', baseValue: 1.4, type: 'spin' },
  { name: 'CSp4', baseValue: 3.1, type: 'spin' },
  { name: 'CSp3', baseValue: 2.8, type: 'spin' },
  { name: 'CSp2', baseValue: 2.2, type: 'spin' },
  { name: 'CSp1', baseValue: 1.7, type: 'spin' },
  { name: 'CSpB', baseValue: 1.3, type: 'spin' },
  { name: 'SSp4', baseValue: 3.0, type: 'spin' },
  { name: 'SSp3', baseValue: 2.5, type: 'spin' },
  { name: 'SSp2', baseValue: 1.9, type: 'spin' },
  { name: 'SSp1', baseValue: 1.6, type: 'spin' },
  { name: 'SSpB', baseValue: 1.3, type: 'spin' },
  { name: 'FUSp4', baseValue: 3.5, type: 'spin' },
  { name: 'FUSp3', baseValue: 2.9, type: 'spin' },
  { name: 'FUSp2', baseValue: 2.4, type: 'spin' },
  { name: 'FUSp1', baseValue: 2.0, type: 'spin' },
  { name: 'FUSpB', baseValue: 1.8, type: 'spin' },
  { name: 'FLSp4', baseValue: 3.8, type: 'spin' },
  { name: 'FLSp3', baseValue: 3.5, type: 'spin' },
  { name: 'FLSp2', baseValue: 2.9, type: 'spin' },
  { name: 'FLSp1', baseValue: 2.4, type: 'spin' },
  { name: 'FLSpB', baseValue: 2.0, type: 'spin' },
  { name: 'FCSp4', baseValue: 3.8, type: 'spin' },
  { name: 'FCSp3', baseValue: 3.4, type: 'spin' },
  { name: 'FCSp2', baseValue: 2.8, type: 'spin' },
  { name: 'FCSp1', baseValue: 2.4, type: 'spin' },
  { name: 'FCSpB', baseValue: 2.0, type: 'spin' },
  { name: 'FSSp4', baseValue: 3.6, type: 'spin' },
  { name: 'FSSp3', baseValue: 3.1, type: 'spin' },
  { name: 'FSSp2', baseValue: 2.8, type: 'spin' },
  { name: 'FSSp1', baseValue: 2.3, type: 'spin' },
  { name: 'FSSpB', baseValue: 1.9, type: 'spin' },
  { name: 'CUSp4', baseValue: 3.5, type: 'spin' },
  { name: 'CUSp3', baseValue: 2.9, type: 'spin' },
  { name: 'CUSp2', baseValue: 2.4, type: 'spin' },
  { name: 'CUSp1', baseValue: 2.0, type: 'spin' },
  { name: 'CUSpB', baseValue: 1.8, type: 'spin' },
  { name: 'CLSp4', baseValue: 3.8, type: 'spin' },
  { name: 'CLSp3', baseValue: 3.5, type: 'spin' },
  { name: 'CLSp2', baseValue: 2.9, type: 'spin' },
  { name: 'CLSp1', baseValue: 2.4, type: 'spin' },
  { name: 'CLSpB', baseValue: 2.0, type: 'spin' },
  { name: 'CCSp4', baseValue: 3.8, type: 'spin' },
  { name: 'CCSp3', baseValue: 3.4, type: 'spin' },
  { name: 'CCSp2', baseValue: 2.8, type: 'spin' },
  { name: 'CCSp1', baseValue: 2.4, type: 'spin' },
  { name: 'CCSpB', baseValue: 2.0, type: 'spin' },
  { name: 'CSSp4', baseValue: 3.6, type: 'spin' },
  { name: 'CSSp3', baseValue: 3.1, type: 'spin' },
  { name: 'CSSp2', baseValue: 2.8, type: 'spin' },
  { name: 'CSSp1', baseValue: 2.3, type: 'spin' },
  { name: 'CSSpB', baseValue: 1.9, type: 'spin' },
  { name: 'FCUSp4', baseValue: 3.5, type: 'spin' },
  { name: 'FCUSp3', baseValue: 2.9, type: 'spin' },
  { name: 'FCUSp2', baseValue: 2.4, type: 'spin' },
  { name: 'FCUSp1', baseValue: 2.0, type: 'spin' },
  { name: 'FCUSpB', baseValue: 1.8, type: 'spin' },
  { name: 'FCLSp4', baseValue: 3.8, type: 'spin' },
  { name: 'FCLSp3', baseValue: 3.5, type: 'spin' },
  { name: 'FCLSp2', baseValue: 2.9, type: 'spin' },
  { name: 'FCLSp1', baseValue: 2.4, type: 'spin' },
  { name: 'FCLSpB', baseValue: 2.0, type: 'spin' },
  { name: 'FCCSp4', baseValue: 3.8, type: 'spin' },
  { name: 'FCCSp3', baseValue: 3.4, type: 'spin' },
  { name: 'FCCSp2', baseValue: 2.8, type: 'spin' },
  { name: 'FCCSp1', baseValue: 2.4, type: 'spin' },
  { name: 'FCCSpB', baseValue: 2.0, type: 'spin' },
  { name: 'FCSSp4', baseValue: 3.6, type: 'spin' },
  { name: 'FCSSp3', baseValue: 3.1, type: 'spin' },
  { name: 'FCSSp2', baseValue: 2.8, type: 'spin' },
  { name: 'FCSSp1', baseValue: 2.3, type: 'spin' },
  { name: 'FCSSpB', baseValue: 1.9, type: 'spin' },
  { name: 'CoSp4', baseValue: 3.6, type: 'spin' },
  { name: 'CoSp3', baseValue: 3.0, type: 'spin' },
  { name: 'CoSp2', baseValue: 2.4, type: 'spin' },
  { name: 'CoSp1', baseValue: 2.0, type: 'spin' },
  { name: 'CoSpB', baseValue: 1.8, type: 'spin' },
  { name: 'FCoSp4', baseValue: 3.6, type: 'spin' },
  { name: 'FCoSp3', baseValue: 3.0, type: 'spin' },
  { name: 'FCoSp2', baseValue: 2.4, type: 'spin' },
  { name: 'FCoSp1', baseValue: 2.0, type: 'spin' },
  { name: 'FCoSpB', baseValue: 1.8, type: 'spin' },
  { name: 'CCoSp4', baseValue: 4.2, type: 'spin' },
  { name: 'CCoSp3', baseValue: 3.6, type: 'spin' },
  { name: 'CCoSp2', baseValue: 3.0, type: 'spin' },
  { name: 'CCoSp1', baseValue: 2.4, type: 'spin' },
  { name: 'CCoSpB', baseValue: 2.0, type: 'spin' },
  { name: 'FCCoSp4', baseValue: 4.2, type: 'spin' },
  { name: 'FCCoSp3', baseValue: 3.6, type: 'spin' },
  { name: 'FCCoSp2', baseValue: 3.0, type: 'spin' },
  { name: 'FCCoSp1', baseValue: 2.4, type: 'spin' },
  { name: 'FCCoSpB', baseValue: 2.0, type: 'spin' },
];

const STEPS: Element[] = [
  { name: 'StSqBV', baseValue: 1.6, type: 'step' },
  { name: 'StSq1', baseValue: 1.9, type: 'step' },
  { name: 'StSq2', baseValue: 2.7, type: 'step' },
  { name: 'StSq3', baseValue: 3.5, type: 'step' },
  { name: 'StSq4', baseValue: 4.1, type: 'step' },
];

const CHOREO: Element[] = [
  { name: 'ChSq1', baseValue: 3.5, type: 'choreo' },
  { name: 'ChSp1', baseValue: 3.5, type: 'choreo' },
];

const ALL_ELEMENTS: Element[] = [...JUMPS, ...SPINS, ...STEPS, ...CHOREO];

const JUMP_TYPES = ['A', 'Lz', 'F', 'Lo', 'S', 'T'];
const ROTATIONS = ['1', '2', '3', '4', '5'];

const SPIN_TYPES = ['USp', 'LSp', 'SSp', 'CSp', 'CoSp'];
const SPIN_MODES = ['', 'F', 'C', 'FC'];

const PCS_MULTIPLIERS: Record<string, number> = {
  MenSP: 1.67,
  MenFS: 3.33,
  WomenSP: 1.33,
  WomenFS: 2.67,
};

/* ---------- BV / GOE ヘルパー ---------- */

/** downgrade map for '<<' (one rotation less) */
function getLowerRotationJump(name: string): Element | null {
  const map: Record<string, string> = {
    '4A': '3A',
    '3A': '2A',
    '2A': '1A',
    '1A': 'A',
    '5Lz': '4Lz',
    '4Lz': '3Lz',
    '3Lz': '2Lz',
    '2Lz': '1Lz',
    '1Lz': 'Lz',
    '5F': '4F',
    '4F': '3F',
    '3F': '2F',
    '2F': '1F',
    '1F': 'F',
    '5Lo': '4Lo',
    '4Lo': '3Lo',
    '3Lo': '2Lo',
    '2Lo': '1Lo',
    '1Lo': 'Lo',
    '5S': '4S',
    '4S': '3S',
    '3S': '2S',
    '2S': '1S',
    '1S': 'S',
    '5T': '4T',
    '4T': '3T',
    '3T': '2T',
    '2T': '1T',
    '1T': 'T',
  };
  const lower = map[name];
  return lower ? ALL_ELEMENTS.find((e) => e.name === lower) || null : null;
}

/**
 * 表示・合計用の BV（secondHalf を含む）
 * - '*' -> 0 優先
 * - underRotation '<' => BV × 0.8
 * - underRotation '<<' => lower rotation baseValue
 * - edge 'e' => BV × 0.8
 * - REP => BV × 0.7
 * - V (spin) => BV × 0.75
 * - secondHalf (jump) => BV × 1.1  ← 表示 / 合計に反映
 */
function getBVWithMods(sub: LineSubElement): number {
  if (sub.marks.includes('*')) return 0;
  let bv = sub.element.baseValue;

  if (sub.underRotation === '<') bv *= 0.8;
  if (sub.underRotation === '<<') {
    const lower = getLowerRotationJump(sub.element.name);
    if (lower) bv = lower.baseValue;
  }

  if (sub.edge === 'e') bv *= 0.8;
  if (sub.marks.includes('REP')) bv *= 0.7;
  if (sub.marks.includes('V') && sub.element.type === 'spin') {
    bv *= 0.75;
    bv = Math.round(bv * 100) / 100; // *少数第2位へ丸め
  }

  if (sub.secondHalf && sub.element.type === 'jump') bv *= 1.1;

  return Number(bv);
}

/**
 * GOE 計算用 BV（secondHalf を除く）
 * 要望: GOE の際には secondHalf の ×1.1 を使わないが、
 * underRotation / edge / REP の影響は含める（ただし '*' の場合は GOE = 0）
 */
function getBVForGOE(sub: LineSubElement): number {
  if (sub.marks.includes('*')) return 0;
  let bv = sub.element.baseValue;

  if (sub.underRotation === '<') bv *= 0.8;
  if (sub.underRotation === '<<') {
    const lower = getLowerRotationJump(sub.element.name);
    if (lower) bv = lower.baseValue;
  }

  if (sub.edge === 'e') bv *= 0.8;
  if (sub.marks.includes('REP')) bv *= 0.7;
  if (sub.marks.includes('V') && sub.element.type === 'spin') bv *= 0.75;

  // NOTE: intentionally NOT applying secondHalf multiplier here
  return Number(bv);
}

/** 転倒ペナルティ（累積） */
function calcTotalFallPenalty(allLines: Line[]): number {
  const totalF = allLines.reduce(
    (sum, line) =>
      sum +
      line.subs.reduce(
        (s2, sub) => s2 + sub.marks.filter((m) => m === 'F').length,
        0
      ),
    0
  );
  if (totalF === 0) return 0;
  let penalty = 0;
  for (let i = 1; i <= totalF; i++) {
    if (i === 1 || i === 2) penalty -= 1;
    else if (i === 3 || i === 4) penalty -= 2;
    else penalty -= 3;
  }
  return penalty;
}

/* ---------- GOE / subtotal ---------- */

function getOriginalBV(sub: LineSubElement): number {
  let bv = sub.element.baseValue;

  if (sub.underRotation === '<') bv *= 0.8;
  if (sub.underRotation === '<<') {
    const lower = getLowerRotationJump(sub.element.name);
    if (lower) bv = lower.baseValue;
  }

  if (sub.edge === 'e') bv *= 0.8;

  if (sub.element.type === 'spin' && sub.marks.includes('V')) bv *= 0.75;

  return bv;
}

function calcGOEPoint(
  sub: LineSubElement,
  maxSub: LineSubElement | null
): number {
  if (sub.marks.includes('*')) return 0;

// ===== 5回転専用 =====
const quintJumps = ['5T', '5S', '5Lo', '5F', '5Lz'];

if (quintJumps.includes(sub.element.name)) {
return Number((sub.goe * 0.56).toFixed(2));
}

  // ChSq1 ChSp1 special: GOE is halved
  if (
    sub.element.name === 'ChSq1' ||
    sub.element.name === 'ChSp1'
  ) {
    return Number((0.5 * sub.goe).toFixed(2));
  }
    
  // spin/step/choreo: always GOE allowed (if not '*')
  if (
    sub.element.type === 'spin' ||
    sub.element.type === 'step' ||
    sub.element.type === 'choreo'
  ) {
    if (sub.marks.includes('*')) return 0;
    const originalBV = getOriginalBV(sub);
    return Number((originalBV * 0.1 * sub.goe).toFixed(2));
  }

  // jump: only highest-BV in the combo receives GOE
  if (sub.element.type === 'jump') {
    if (!maxSub) return 0;
    if (sub.id !== maxSub.id) return 0;
    if (sub.marks.includes('*')) return 0;
    const originalBV = getOriginalBV(sub);
    return Number((originalBV * 0.1 * sub.goe).toFixed(2));
  }

  return 0;
}

/** 1要素の subtotal = BV(with mods, includes secondHalf) + GOEpoint */
function calcSubTotal(
  sub: LineSubElement,
  maxSub: LineSubElement | null
): number {
  const bv = getBVWithMods(sub);
  const goe = calcGOEPoint(sub, maxSub);
  return Number((bv + goe).toFixed(2));
}

/** 行合計 */
function calcLineTotal(line: Line): number {
  if (line.subs.length === 0) return 0;
  const maxSub = line.subs.reduce(
    (a, b) => (getBVWithMods(a) > getBVWithMods(b) ? a : b),
    line.subs[0]
  );
  return line.subs.reduce((sum, s) => sum + calcSubTotal(s, maxSub), 0);
}

/* ---------- React コンポーネント ---------- */

export default function Page() {
  const [lines, setLines] = useState<Line[]>([]);
  const [tempLine, setTempLine] = useState<Element[]>([]);

  const [playerName, setPlayerName] = useState('');
  const [country, setCountry] = useState('');
  const [competition, setCompetition] = useState('');
  const [category, setCategory] =
    useState<keyof typeof PCS_MULTIPLIERS>('MenSP');

  const [pcs, setPcs] = useState<PCS>({ comp: 8, pres: 8, skills: 8 });
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fs_protocol_history_v1");
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);

  // show ISU-like protocol view after pressing 決定して表示
  const [showProtocol, setShowProtocol] = useState<HistoryItem | null>(null);

  /* ---------- compact selector states ---------- */
const [selectedCategory, setSelectedCategory] = useState<
  'JUMP' | 'SPIN' | 'STEP' | 'CHOREO' | ''
>('');

const [selectedJumpType, setSelectedJumpType] = useState('');
const [selectedSpinType, setSelectedSpinType] = useState('');
const [selectedSpinMode, setSelectedSpinMode] = useState('');

const [recentElements, setRecentElements] = useState<Element[]>([]);
const [isComboMode, setIsComboMode] = useState(false);
useEffect(() => {
    localStorage.setItem('fs_protocol_history_v1', JSON.stringify(history));
  }, [history]);

  /* UI 操作 */
 const addToTemp = (el: Element) => {
  // コンボモードでない場合
  if (!isComboMode) {
    setTempLine([el]);
  } else {
    // コンボモードなら追加
    setTempLine((t) => [...t, el]);
  }

  // 最近使用
  setRecentElements((prev) => {
    const filtered = prev.filter((p) => p.name !== el.name);
    return [el, ...filtered].slice(0, 10);
  });
};
  // 最近使った要素を先頭へ
  setRecentElements((prev) => {
    const filtered = prev.filter((p) => p.name !== el.name);
    return [el, ...filtered].slice(0, 10);
  });
};
  const clearTemp = () => {
  setTempLine([]);
  setIsComboMode(false);
};

  const addLineFromTemp = () => {
    if (tempLine.length === 0) return;
    const newLine: Line = {
      id: uid(),
      subs: tempLine.map((el) => ({
        id: uid(),
        element: el,
        underRotation: '',
        edge: '',
        goe: 0,
        marks: [],
        secondHalf: false,
      })),
    };
    setLines((l) => [...l,newLine]);
   setTempLine([]);
   setIsComboMode(false);
  };

  const addComboToLine = (lineId: number) => {
    setLines((l) =>
      l.map((line) =>
        line.id !== lineId
          ? line
          : {
              ...line,
              subs: [
                ...line.subs,
                {
                  id: uid(),
                  element: JUMPS[0],
                  underRotation: '',
                  edge: '',
                  goe: 0,
                  marks: [],
                  secondHalf: false,
                },
              ],
            }
      )
    );
  };

  const updateSub = (
    lineId: number,
    subId: number,
    updated: Partial<LineSubElement>
  ) => {
    setLines((l) =>
      l.map((line) => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          subs: line.subs.map((s) =>
            s.id !== subId ? s : { ...s, ...updated }
          ),
        };
      })
    );
  };

  const toggleMark = (lineId: number, subId: number, mark: string) => {
    setLines(l =>
      l.map(line => {
        if (line.id !== lineId) return line;
        return {
          ...line,
          subs: line.subs.map(s => {
            if (s.id !== subId) return s;
            const has = s.marks.includes(mark);
            const newMarks = has
              ? s.marks.filter(m => m !== mark)
              : [...s.marks, mark];
  
            let newGOE = s.goe;
  
            return { ...s, marks: newMarks, goe: newGOE };
          })
        };
      })
    );
  };
  

  const deleteLine = (lineId: number) =>
    setLines((l) => l.filter((line) => line.id !== lineId));
  const deleteSub = (lineId: number, subId: number) =>
    setLines((l) =>
      l.map((line) =>
        line.id !== lineId
          ? line
          : { ...line, subs: line.subs.filter((s) => s.id !== subId) }
      )
    );

  /* totals */
  const totalTESbeforeFalls = lines.reduce(
    (sum, line) => sum + calcLineTotal(line),
    0
  );
  const totalFallPenalty = calcTotalFallPenalty(lines);
  const totalTES = Number((totalTESbeforeFalls + totalFallPenalty).toFixed(2));
  const pcsRaw = Number((pcs.comp + pcs.pres + pcs.skills).toFixed(2));
  const pcsApplied = Number((pcsRaw * PCS_MULTIPLIERS[category]).toFixed(2));
  const grandTotal = Number((totalTES + pcsApplied).toFixed(2));

  /* history 操作 */
  const saveResultToHistory = () => {
    const item: HistoryItem = {
      id: uid(),
      playerName,
      country,
      competition,
      category,
      tes: totalTES,
      pcsRaw,
      pcsApplied,
      total: grandTotal,
      timestamp: new Date().toISOString(),
    };
    setHistory((h) => [item, ...h]);
    alert('履歴に保存しました');
  };

  const saveAndShowProtocol = () => {
    const html = renderProtocolHtml({
      playerName,
      country,
      competition,
      category,
      lines,
      pcsRaw,
      pcsApplied,
      totalTES,
      grandTotal,
    });
    const item: HistoryItem = {
      id: uid(),
      playerName,
      country,
      competition,
      category,
      tes: totalTES,
      pcsRaw,
      pcsApplied,
      total: grandTotal,
      timestamp: new Date().toISOString(),
      protocolHtml: html,
    };
    setHistory((h) => [item, ...h]);
    setShowProtocol(item);
    // simulate page refresh by scrolling to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const clearHistory = () => {
    if (!confirm('履歴を全て削除しますか？')) return;
    setHistory([]);
  };
  const deleteHistoryItem = (id: number) =>
    setHistory((h) => h.filter((x) => x.id !== id));
  const exportHistory = () => {
    const blob = new Blob([JSON.stringify(history, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `skating-history-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  const importHistory = (file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result || '[]'));
        if (!Array.isArray(parsed)) throw new Error('invalid');
        setHistory(parsed);
        alert('履歴をインポートしました');
      } catch (e) {
        alert('読み込み失敗: ' + e);
      }
    };
    reader.readAsText(file);
  };

  /* Protocol view */
  if (showProtocol) {
    return (
      <div
    
        style={{
          padding: 18,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto",
          maxWidth: 980,
          margin: '0 auto',

           backgroundColor: '#ffffff',
           color: '#000000',
           minHeight: '100vh',
        }}
      >
        <button
          onClick={() => setShowProtocol(null)}
          style={{ marginBottom: 12, padding: '8px 10px' }}
        >
          ← Back
        </button>
        <div
          dangerouslySetInnerHTML={{
            __html:
              showProtocol.protocolHtml ||
              'No data',
          }}
        />
      </div>
    );
  }

  /* ---------- JSX Editor UI ---------- */
  return (
    <div
      style={{
        padding: 14,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto",
        maxWidth: 980,
        margin: '0 auto',

       backgroundColor: '#ffffff',
       color: '#000000',
       minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>
        Figure Skating Judge Simulation(2026/27)
      </h1>

      {/* header */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <input
          placeholder="Skater"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Nation"
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          style={inputStyle}
        />
        <input
          placeholder="Event"
          value={competition}
          onChange={(e) => setCompetition(e.target.value)}
          style={{ ...inputStyle, gridColumn: '1 / -1' }}
        />
        <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ minWidth: 120 }}> Segment </div>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value as keyof typeof PCS_MULTIPLIERS)
            }
            style={{ padding: 8, borderRadius: 8, border: '1px solid #ccc' }}
          >
            <option value="MenSP">Men&apos;s SP (1.67)</option>
            <option value="MenFS">Men&apos;s FS (3.33)</option>
            <option value="WomenSP">Women&apos;s SP (1.33)</option>
            <option value="WomenFS">Women&apos;s FS (2.67)</option>
          </select>
        </label>
      </div>

   {/* compact selector */}
<div
  style={{
    marginBottom: 12,
    padding: 12,
    border: '1px solid #eee',
    borderRadius: 10,
    background: '#fafafa',
  }}
>
  <div style={{ fontWeight: 700, marginBottom: 10 }}>
    Add Element
  </div>

  {/* Recent Used */}
  {recentElements.length > 0 && (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        Recently Used
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {recentElements.map((el) => (
          <button
            key={el.name}
            onClick={() => addToTemp(el)}
            style={smallBtn}
          >
            {el.name}
          </button>
        ))}
      </div>
    </div>
  )}

  {/* category */}
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {['JUMP', 'SPIN', 'STEP', 'CHOREO'].map((cat) => (
      <button
        key={cat}
        onClick={() => {
          setSelectedCategory(cat as any);
          setSelectedJumpType('');
          setSelectedSpinType('');
        }}
        style={{
          ...smallBtn,
          background:
            selectedCategory === cat ? '#1f7ae0' : '#fff',
          color:
            selectedCategory === cat ? '#fff' : '#000',
        }}
      >
        {cat}
      </button>
    ))}
  </div>

  {/* jump selector */}
  {selectedCategory === 'JUMP' && (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {JUMP_TYPES.map((j) => (
          <button
            key={j}
            onClick={() => setSelectedJumpType(j)}
            style={smallBtn}
          >
            {j}
          </button>
        ))}
      </div>

      {selectedJumpType && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginTop: 8,
          }}
        >
          {ROTATIONS.map((r) => {
            const name = `${r}${selectedJumpType}`;
            const el = ALL_ELEMENTS.find(
              (x) => x.name === name
            );

            if (!el) return null;

            return (
              <button
                key={name}
                onClick={() => addToTemp(el)}
                style={smallBtn}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  )}

  {/* spin selector */}
  {selectedCategory === 'SPIN' && (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {SPIN_TYPES.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSpinType(s)}
            style={smallBtn}
          >
            {s}
          </button>
        ))}
      </div>

      {selectedSpinType && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginTop: 8,
          }}
        >
          {SPIN_MODES.map((m) => (
            <button
              key={m || 'normal'}
              onClick={() => setSelectedSpinMode(m)}
              style={smallBtn}
            >
              {m || 'Normal'}
            </button>
          ))}
        </div>
      )}

      {selectedSpinType && (
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            marginTop: 8,
          }}
        >
          {['B', '1', '2', '3', '4'].map((lv) => {
            let name = '';

            if (selectedSpinType === 'CoSp') {
              name = mangleCoSp(selectedSpinMode, lv);
            } else {
              name = mangleSpin(
                selectedSpinType,
                selectedSpinMode,
                lv
              );
            }

            const el = ALL_ELEMENTS.find(
              (x) => x.name === name
            );

            if (!el) return null;

            return (
              <button
                key={name}
                onClick={() => addToTemp(el)}
                style={smallBtn}
              >
                {name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  )}

  {/* step */}
  {selectedCategory === 'STEP' && (
    <div
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: 12,
      }}
    >
      {STEPS.map((s) => (
        <button
          key={s.name}
          onClick={() => addToTemp(s)}
          style={smallBtn}
        >
          {s.name}
        </button>
      ))}
    </div>
  )}

  {/* choreo */}
  {selectedCategory === 'CHOREO' && (
    <div
      style={{
        display: 'flex',
        gap: 6,
        flexWrap: 'wrap',
        marginTop: 12,
      }}
    >
      {CHOREO.map((c) => (
        <button
          key={c.name}
          onClick={() => addToTemp(c)}
          style={smallBtn}
        >
          {c.name}
        </button>
      ))}
    </div>
  )}
  <div style={{ marginTop: 12 }}>
  <button
    onClick={() => setIsComboMode(true)}
    style={{
      ...smallBtn,
      background: isComboMode ? '#1f7ae0' : '#fff',
      color: isComboMode ? '#fff' : '#000',
    }}
  >
    ＋コンビネーション追加
  </button>
</div>
  {/* temp line */}
  {tempLine.length > 0 && (
    <div style={{ marginTop: 12 }}>
      <div>
        追加予定：
        {tempLine.map((t, i) => (
          <span key={i}>
            {' '}
            {t.name}
            {i < tempLine.length - 1 ? ' + ' : ''}
          </span>
        ))}
      </div>

      <div style={{ marginTop: 8 }}>
        <button
          onClick={addLineFromTemp}
          style={{ ...smallBtn, marginRight: 8 }}
        >
          行追加
        </button>

        <button
          onClick={clearTemp}
          style={smallBtn}
        >
          クリア
        </button>
      </div>
    </div>
  )}
</div>

      {/* lines (responsive table with horizontal scroll) */}
      <div style={{ overflowX: 'auto' }}>
        {lines.map((line) => {
          const maxSub = line.subs.reduce(
            (a, b) => (getBVWithMods(a) > getBVWithMods(b) ? a : b),
            line.subs[0]
          );
          return (
            <div
              key={line.id}
              style={{
                border: '1px solid #eee',
                padding: 8,
                borderRadius: 10,
                marginBottom: 12,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 8,
                }}
              >
                <strong>
                  行 #{line.id} 合計: {calcLineTotal(line).toFixed(2)}
                </strong>
                <div>
                  <button
                    onClick={() => addComboToLine(line.id)}
                    style={{ marginRight: 8, padding: '6px 10px' }}
                  >
                    ＋Add Combo
                  </button>
                  <button
                    onClick={() => deleteLine(line.id)}
                    style={{ padding: '6px 10px' }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  minWidth: 980,
                }}
              >
                <thead>
                  <tr>
                    <th style={thStyle}>Executed Elements</th>
                    <th style={thStyle}>BV</th>
                    <th style={thStyle}>GOE</th>
                    <th style={thStyle}>GOE Point</th>
                    <th style={thStyle}>Score of Panel</th>
                    <th style={thStyle}>Rotation</th>
                    <th style={thStyle}>Edge</th>
                    <th style={thStyle}>V</th>
                    <th style={thStyle}>Second Half (X)</th>
                    <th style={thStyle}>Otehers</th>
                    <th style={thStyle}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                  {line.subs.map((sub) => {
                    const bvWithMods = getBVWithMods(sub);
                    const isMax = sub.id === maxSub.id;
                    const goePoint = calcGOEPoint(sub, maxSub);
                    const subtotal = calcSubTotal(sub, maxSub);

                    // highlighting
                    const hasF = sub.marks.includes('F');
                    const positiveGo = sub.goe > 0;
                    const secondHalfHighlight =
                      sub.secondHalf && sub.element.type === 'jump';
                    const rowStyle: React.CSSProperties = {};
                    if (hasF) rowStyle.background = '#fff0f0'; // light red
                    else if (positiveGo)
                      rowStyle.background = '#f0fff4'; // light green
                    else if (secondHalfHighlight)
                      rowStyle.background = '#fffaf0'; // light yellow

                    return (
                      <tr key={sub.id} style={rowStyle}>
                        <td style={tdStyle}>
                          <select
                            value={sub.element.name}
                            onChange={(e) =>
                              updateSub(line.id, sub.id, {
                                element: ALL_ELEMENTS.find(
                                  (x) => x.name === e.target.value
                                )!,
                              })
                            }
                          >
                            <optgroup label="Jump">
                              {JUMPS.map((j) => (
                                <option key={j.name} value={j.name}>
                                  {j.name}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Spin">
                              {SPINS.map((s) => (
                                <option key={s.name} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Step">
                              {STEPS.map((s) => (
                                <option key={s.name} value={s.name}>
                                  {s.name}
                                </option>
                              ))}
                            </optgroup>
                            <optgroup label="Choreo">
                              {CHOREO.map((c) => (
                                <option key={c.name} value={c.name}>
                                  {c.name}
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </td>

                        <td style={{ ...tdStyle, textAlign: 'right' }}>
                          {bvWithMods.toFixed(2)}
                          {/* secondHalf UI: show 'X' label when checked */}
                          {sub.secondHalf && sub.element.type === 'jump' && (
                            <div style={{ fontSize: 11, color: '#666' }}>X</div>
                          )}
                        </td>

<td style={tdStyle}>
  {(sub.element.type === 'jump' && isMax) ||
  sub.element.type !== 'jump' ||
  sub.element.name === 'ChSq1' ? (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}
    >
      <button
        onClick={() =>
          updateSub(line.id, sub.id, {
            goe: Math.max(-5, sub.goe - 1),
          })
        }
      >
        -
      </button>

      <div
        style={{
          minWidth: 40,
          textAlign: 'center',
          fontWeight: 700,
        }}
      >
        {sub.goe > 0 ? `+${sub.goe}` : sub.goe}
      </div>

      <button
        onClick={() =>
          updateSub(line.id, sub.id, {
            goe: Math.min(5, sub.goe + 1),
          })
        }
      >
        +
      </button>
    </div>
  ) : (
    <div style={{ color: '#999' }}>—</div>
  )}
</td>

<td style={{ ...tdStyle, textAlign: 'right' }}>
  {goePoint.toFixed(2)}
</td>

<td style={{ ...tdStyle, textAlign: 'right' }}>
  {subtotal.toFixed(2)}
</td>

                        <td style={tdStyle}>
                          <select
                            value={sub.underRotation || ''}
                            onChange={(e) =>
                              updateSub(line.id, sub.id, {
                                underRotation: e.target.value as any,
                              })
                            }
                          >
                            <option value="">正常</option>
                            <option value="q">q</option>
                            <option value="<">&lt;</option>
                            <option value="<<">&lt;&lt;</option>
                          </select>
                        </td>

                        <td style={tdStyle}>
                          <select
                            value={sub.edge || ''}
                            onChange={(e) =>
                              updateSub(line.id, sub.id, {
                                edge: e.target.value as any,
                              })
                            }
                          >
                            <option value="">正常</option>
                            <option value="!">!</option>
                            <option value="e">e</option>
                          </select>
                        </td>

                        <td style={tdStyle}>
                          <input
                            type="checkbox"
                            checked={sub.marks.includes('V')}
                            onChange={() => toggleMark(line.id, sub.id, 'V')}
                          />
                        </td>

                        <td style={tdStyle}>
                          {/* secondHalf checkbox (UI shows 'X' in BV cell) */}
                          <input
                            type="checkbox"
                            checked={!!sub.secondHalf}
                            onChange={(e) =>
                              updateSub(line.id, sub.id, {
                                secondHalf: e.target.checked,
                              })
                            }
                   
                            />
                        </td>

                        <td style={tdStyle}>
                          {["F", "REP", "*", "SEQ", "COMBO"].map(mark => (
                            <label key={mark} style={{ marginRight: 6, display: 'block' }}>
                              <input
                                type="checkbox"
                                checked={sub.marks.includes(mark)}
                                onChange={() => toggleMark(line.id, sub.id, mark)}
                              />
                              {mark}
                            </label>
                          ))}
                        </td>

                        <td style={tdStyle}>
                          <button
                            onClick={() => deleteSub(line.id, sub.id)}
                            style={{ padding: '6px 8px' }}
                          >
                            削除
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

     {/* PCS */}
<div
  style={{
    marginTop: 12,
    padding: 12,
    border: '1px solid #eee',
    borderRadius: 10,
    background: '#f7fbff',
  }}
>
  <div style={{ fontWeight: 700, marginBottom: 8 }}>
    Program Component Score
  </div>

  {(
    [
      ['comp', 'Composition'],
      ['pres', 'Presentation'],
      ['skills', 'Skating Skills'],
    ] as const
  ).map(([key, label]) => (
    <div
      key={key}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        marginBottom: 10,
      }}
    >
      <div style={{ width: 140, fontWeight: 600 }}>{label}</div>

      <button
        onClick={() =>
          setPcs((p) => ({
            ...p,
            [key]: Math.max(
              0,
              Number((p[key] - 0.25).toFixed(2))
            ),
          }))
        }
        style={{
          padding: '8px 14px',
          fontSize: 18,
          borderRadius: 8,
        }}
      >
        −
      </button>

      <div
        style={{
          minWidth: 70,
          textAlign: 'center',
          fontSize: 18,
          fontWeight: 700,
        }}
      >
        {pcs[key].toFixed(2)}
      </div>

      <button
        onClick={() =>
          setPcs((p) => ({
            ...p,
            [key]: Math.min(
              10,
              Number((p[key] + 0.25).toFixed(2))
            ),
          }))
        }
        style={{
          padding: '8px 14px',
          fontSize: 18,
          borderRadius: 8,
        }}
      >
        ＋
      </button>
    </div>
  ))}

  <div style={{ marginTop: 8 }}>
    PCS raw: {(pcs.comp + pcs.pres + pcs.skills).toFixed(2)}
    × multiplier ({PCS_MULTIPLIERS[category]})
    = {pcsApplied.toFixed(2)}
  </div>
</div>

      {/* controls */}
      <div
        style={{
          marginTop: 12,
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        <button
          onClick={saveAndShowProtocol}
          style={{
            padding: '10px 14px',
            background: '#1f7ae0',
            color: '#fff',
            borderRadius: 8,
          }}
        >
          Submit
        </button>
        <button
          onClick={saveResultToHistory}
          style={{ padding: '10px 14px', borderRadius: 8 }}
        >
          Add to memories
        </button>
        <button
          onClick={() => {
            setLines([]);
            setTempLine([]);
          }}
          style={{ padding: '10px 12px', borderRadius: 8 }}
        >
          Clear
        </button>
        <button
          onClick={exportHistory}
          style={{ padding: '10px 12px', borderRadius: 8 }}
        >
          Download file
        </button>
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          Import file
          <input
            type="file"
            accept="application/json"
            onChange={(e) => importHistory(e.target.files?.[0] || null)}
          />
        </label>
      </div>

      {/* totals */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          border: '1px solid #ddd',
          borderRadius: 10,
        }}
      >
        <div> Total Technical Element Score : {totalTES.toFixed(2)}</div>
        <div>Program Conpoment Score (factored) : {pcsApplied.toFixed(2)}</div>
        <div style={{ fontWeight: 800, marginTop: 6 }}>
          Total Segment Score: {grandTotal.toFixed(2)}
        </div>
      </div>

      {/* history */}
      <div style={{ marginTop: 12 }}>
        <h3>Memories</h3>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button
            onClick={() => {
              if (!confirm('Delete History')) return;
              clearHistory();
            }}
            style={{ padding: '8px 10px' }}
          >
            Delete All
          </button>
        </div>
        {history.length === 0 && <div>None</div>}
        {history.map((h) => (
          <div
            key={h.id}
            style={{
              border: '1px solid #f1f1f1',
              padding: 10,
              borderRadius: 8,
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 700 }}>
                  {h.playerName} ({h.country}) — {h.competition} [{h.category}]
                </div>
                <div>
                  TES: {h.tes} ・ PCS raw: {h.pcsRaw} ・ PCS :{' '}
                  {h.pcsApplied} ・ Total: {h.total}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 12, color: '#666' }}>
                  {new Date(h.timestamp).toLocaleString()}
                </div>
                <div style={{ marginTop: 8 }}>
                  <button
                    onClick={() => {
                      if (h.protocolHtml) setShowProtocol(h);
                      else alert('No data');
                    }}
                    style={{ marginRight: 6 }}
                  >
                    Submit
                  </button>
                  <button onClick={() => deleteHistoryItem(h.id)}>Delete</button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ height: 48 }} />
    </div>
  );
}

/* ---------- スタイル小分け ---------- */
const inputStyle: React.CSSProperties = {
  padding: 10,
  borderRadius: 8,
  border: '1px solid #ccc',
};
const thStyle: React.CSSProperties = {
  textAlign: 'left',
  borderBottom: '1px solid #ddd',
  padding: '8px 10px',
  whiteSpace: 'nowrap',
};

const smallBtn: React.CSSProperties = {
  padding: '8px 10px',
  borderRadius: 8,
  border: '1px solid #ccc',
  background: '#fff',
  fontSize: 14,
};

const tdStyle: React.CSSProperties = {
padding: '8px 10px',
  verticalAlign: 'middle',
  whiteSpace: 'nowrap',
};

/* ---------- ISU 風プロトコル HTML レンダラ（簡易） ---------- */
function renderProtocolHtml(params: {
  playerName: string;
  country: string;
  competition: string;
  category: string;
  lines: Line[];
  pcsRaw: number;
  pcsApplied: number;
  totalTES: number;
  grandTotal: number;
}) {
  const {
    playerName,
    country,
    competition,
    category,
    lines,
    pcsRaw,
    pcsApplied,
    totalTES,
    grandTotal,
  } = params;

  const rowsHtml = lines
    .map((line, idx) => {
      const maxSub = line.subs.reduce(
        (a, b) => (getBVWithMods(a) > getBVWithMods(b) ? a : b),
        line.subs[0]
      );
      const subsHtml = line.subs
        .map((sub) => {
          const bvDisp = getBVWithMods(sub).toFixed(2);
          const bvForGoe = getBVForGOE(sub).toFixed(2);
          const goe = calcGOEPoint(sub, maxSub).toFixed(2);
          const total = calcSubTotal(sub, maxSub).toFixed(2);
          const marks = sub.marks.join(',') || '';
          const second = sub.secondHalf ? 'X' : '';
          return `<div style="display:flex;gap:8px;padding:2px 0;font-size:13px">
        <div style="width:110px">${sub.element.name}</div>
        <div style="width:70px;text-align:right">BV:${bvDisp}</div>
        <div style="width:110px;text-align:right">BV_forGOE:${bvForGoe}</div>
        <div style="width:70px;text-align:right">GOE:${goe}</div>
        <div style="width:70px;text-align:right">Total:${total}</div>
        <div style="width:40px;text-align:center">${second}</div>
        <div style="flex:1">${marks}</div>
      </div>`;
        })
        .join('');
      const lineTotal = calcLineTotal(line).toFixed(2);
      return `<div style="margin-bottom:8px"><div style="font-weight:700">Row ${
        idx + 1
      } — ${lineTotal} pt</div>${subsHtml}</div>`;
    })
    .join('');

  const header = `<div style="padding:12px;border:1px solid #ddd;border-radius:8px;margin-bottom:12px">
    <div style="font-size:18px;font-weight:700">${escapeHtml(competition)}</div>
    <div>${escapeHtml(playerName)} (${escapeHtml(country)}) — ${escapeHtml(
    category
  )}</div>
  </div>`;

  const summary = `<div style="padding:12px;border:1px solid #ddd;border-radius:8px;margin-top:12px">
    <div>TES: ${totalTES.toFixed(2)}</div>
    <div>PCS raw: ${pcsRaw.toFixed(2)} ・ PCS applied: ${pcsApplied.toFixed(
    2
  )}</div>
    <div style="font-weight:800;margin-top:6px">Total: ${grandTotal.toFixed(
      2
    )}</div>
  </div>`;

  return `<div style="font-family:system-ui, -apple-system, 'Segoe UI', Roboto;padding:12px">${header}${rowsHtml}${summary}</div>`;
}
function mangleSpin(
  type: string,
  mode: string,
  level: string
) {
  // Normal
  if (!mode) {
    return `${type}${level}`;
  }

  // F + type
  if (mode === 'F') {
    return `F${type}${level}`;
  }

  // C + type
  if (mode === 'C') {
    return `C${type}${level}`;
  }

  // FC + type
  if (mode === 'FC') {
    return `FC${type}${level}`;
  }

  return `${type}${level}`;
}

function mangleCoSp(
  mode: string,
  level: string
) {
  // CoSp は特殊命名
  if (!mode) {
    return `CoSp${level}`;
  }

  if (mode === 'F') {
    return `FCoSp${level}`;
  }

  if (mode === 'C') {
    return `CCoSp${level}`;
  }

  if (mode === 'FC') {
    return `FCCoSp${level}`;
  }

  return `CoSp${level}`;
}
function escapeHtml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
