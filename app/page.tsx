'use client';
import React, { useEffect, useState } from 'react';
type LineSubElement = {
  id: number;
  element: SkateElement;
  underRotation?: '' | 'q' | '<' | '<<';
  edge?: '' | '!' | 'e';
  goe: number; // integer -5..5
  marks: string[]; // "F","REP","*","V","SEQ","COMBO"
  secondHalf?: boolean;};
type Line = {
  id: number;
  subs: LineSubElement[];};
type PCS = {
  comp: number;
  pres: number;
  skills: number;};
type HistoryItem = {
  id: number;
  playerName: string;
  country: string;
  competition: string;
  category: string;
  tes: number;
  pcsRaw: number;
  pcsfactored: number;
  total: number;
  timestamp: string;
  protocolHtml?: string;};
const uid = () => Math.floor(Math.random() * 1e9);
type ElementType = 'jump' | 'spin' | 'step' | 'choreo';

interface SkateElement {
  name: string;
  baseValue: number;
  type: ElementType;
}

const createElements = (
  type: ElementType,
  data: Record<string, number>
): SkateElement[] =>
  Object.entries(data).map(([name, baseValue]) => ({
    name,
    baseValue,
    type,
  }));

// ====================
// JUMPS
// ====================

const jumpLevels: Record<string, number[]> = {
  A: [1.1, 3.3, 8.0, 12.5],
  Lz: [0.6, 2.1, 5.9, 11.5, 14.0],
  F: [0.5, 1.8, 5.3, 11.0, 14.0],
  Lo: [0.5, 1.7, 4.9, 10.5, 14.0],
  S: [0.4, 1.3, 4.3, 9.7, 14.0],
  T: [0.4, 1.3, 4.2, 9.5, 14.0],
};

const JUMPS: SkateElement[] = [
  ...Object.entries(jumpLevels).flatMap(([prefix, vals]) => [
    {
      name: prefix,
      baseValue: 0,
      type: 'jump' as const,
    },
    ...vals.map((v, i) => ({
      name: `${i + 1}${prefix}`,
      baseValue: v,
      type: 'jump' as const,
    })),
  ]),

  {
    name: '1Eu',
    baseValue: 0,
    type: 'jump',
  },
];

// ====================
// SPINS
// ====================

const spinLevels: Record<string, number[]> = {
  USp: [2.9, 2.3, 1.8, 1.4, 1.2],
  LSp: [3.2, 2.9, 2.3, 1.8, 1.4],
  CSp: [3.1, 2.8, 2.2, 1.7, 1.3],
  SSp: [3.0, 2.5, 1.9, 1.6, 1.3],

  FUSp: [3.5, 2.9, 2.4, 2.0, 1.8],
  FLSp: [3.8, 3.5, 2.9, 2.4, 2.0],
  FCSp: [3.8, 3.4, 2.8, 2.3, 1.9],
  FSSp: [3.6, 3.1, 2.8, 2.4, 2.0],

  CUSp: [3.5, 2.9, 2.4, 2.0, 1.8],
  CLSp: [3.8, 3.5, 2.9, 2.4, 2.0],
  CCSp: [3.8, 3.4, 2.8, 2.4, 2.0],
  CSSp: [3.6, 3.1, 2.8, 2.3, 1.9],

  FCUSp: [3.5, 2.9, 2.4, 2.0, 1.8],
  FCLSp: [3.8, 3.5, 2.9, 2.4, 2.0],
  FCCSp: [3.8, 3.4, 2.8, 2.4, 2.0],
  FCSSp: [3.6, 3.1, 2.8, 2.3, 1.9],

  CoSp: [3.6, 3.0, 2.4, 2.0, 1.8],
  FCoSp: [3.6, 3.0, 2.4, 2.0, 1.8],

  CCoSp: [4.2, 3.6, 3.0, 2.4, 2.0],
  FCCoSp: [4.2, 3.6, 3.0, 2.4, 2.0],
};

const SPINS: SkateElement[] = Object.entries(spinLevels).flatMap(
  ([prefix, vals]) => [
    ...vals.slice(0, 4).map((v, i) => ({
      name: `${prefix}${4 - i}`,
      baseValue: v,
      type: 'spin' as const,
    })),

    {
      name: `${prefix}B`,
      baseValue: vals[4],
      type: 'spin' as const,
    },

    {
      name: prefix,
      baseValue: 0,
      type: 'spin' as const,
    },
  ]
);

// ====================
// STEPS
// ====================

const STEPS = createElements('step', {
  StSqBV: 1.6,
  StSq1: 1.9,
  StSq2: 2.7,
  StSq3: 3.5,
  StSq4: 4.1,
});

// ====================
// CHOREO
// ====================

const CHOREO = createElements('choreo', {
  ChSq1: 3.5,
  ChSp1: 3.5,
});
const ALL_ELEMENTS: SkateElement[] = [...JUMPS, ...SPINS, ...STEPS, ...CHOREO];
const JUMP_TYPES = ['A', 'Lz', 'F', 'Lo', 'S', 'T', 'Eu'];
const ROTATIONS = ['1', '2', '3', '4', '5'];
const SPIN_TYPES = ['USp', 'LSp', 'SSp', 'CSp', 'CoSp'];
const SPIN_MODES = ['', 'F', 'C', 'FC'];
const PCS_MULTIPLIERS: Record<string, number> = {
  MenSP: 1.67,
  MenFS: 3.33,
  WomenSP: 1.33,
  WomenFS: 2.67,};
function getLowerRotationJump(name: string): SkateElement | null {
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
    '1T': 'T',};
  const lower = map[name];
  return lower ? ALL_ELEMENTS.find((e) => e.name === lower) || null : null;}
type CalcBVOptions = {
  applySecondHalf?: boolean;
  applyREP?: boolean;
  ignoreAsterisk?: boolean;};
function calcBV(
  sub: LineSubElement,
  options: CalcBVOptions = {}
): number {
  const {
    applySecondHalf = true,
    applyREP = true,
    ignoreAsterisk = false,
  } = options;
  // * は0点
  if (
    !ignoreAsterisk &&
    sub.marks.includes('*')
  ) {
    return 0;}
  let bv = sub.element.baseValue;
  // under rotation
  if (sub.underRotation === '<') {
    bv *= 0.8;}
  // downgrade
  if (sub.underRotation === '<<') {
    const lower = getLowerRotationJump(
      sub.element.name);
    if (lower) {
      bv = lower.baseValue;
    }
  }
  // edge call
  const jumpType =
    sub.element.name.match(/[A-Za-z]+/)?.[0] || '';

  if (
    (jumpType === 'F' ||
      jumpType === 'Lz') &&
    sub.edge === 'e'
  ) {
    bv *= 0.8;
  }

  // REP
  if (
    applyREP &&
    sub.marks.includes('REP')
  ) {
    bv *= 0.8;
  }

  // V mark
  if (
    sub.element.type === 'spin' &&
    sub.marks.includes('V')
  ) {
    bv *= 0.75;}
  // second half bonus
  if (
    applySecondHalf &&
    sub.secondHalf &&
    sub.element.type === 'jump'
  ) {
    bv *= 1.1;}
  return Number(bv.toFixed(2));}
function countTotalFalls(allLines: Line[]): number {
  return allLines.reduce(
    (sum, line) =>
      sum +
      line.subs.reduce(
        (s2, sub) => s2 + sub.marks.filter((m) => m === 'F').length,
        0
      ),
    0
  );
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
    else penalty -= 3;}
  return penalty;}
function calcGOEPoint(
  sub: LineSubElement,
  maxSub: LineSubElement | null
): number {
  if (sub.marks.includes('*')) return 0;
  // ChSq1 ChSp1 special: GOE is halved
  if (
    sub.element.name === 'ChSq1' ||
    sub.element.name === 'ChSp1'
  ) {
    return Number((0.5 * sub.goe).toFixed(2));} 
  // spin/step/choreo: always GOE allowed (if not '*')
  if (
    sub.element.type === 'spin' ||
    sub.element.type === 'step' ||
    sub.element.type === 'choreo'
  ) {
    if (sub.marks.includes('*')) return 0;
    const originalBV = calcBV(sub, {
  applySecondHalf: false,
  applyREP: false,
});
    return Number((originalBV * 0.1 * sub.goe).toFixed(2));}
  // jump: only highest-BV in the combo receives GOE
  if (sub.element.type === 'jump') {
    if (!maxSub) return 0;
    if (sub.id !== maxSub.id) return 0;
    if (sub.marks.includes('*')) return 0;
    const originalBV = calcBV(sub, {
  applySecondHalf: false,
  applyREP: false,
});
    return Number((originalBV * 0.1 * sub.goe).toFixed(2));}
  return 0;}
function calcSubTotal(
  sub: LineSubElement,
  maxSub: LineSubElement | null
): number {
  const bv = calcBV(sub);
  const goe = calcGOEPoint(sub, maxSub);
  return Number((bv + goe).toFixed(2));}
function calcLineTotal(line: Line): number {
  if (line.subs.length === 0) return 0;
  const maxSub =
  line.subs.length > 0
    ? line.subs.reduce(
        (a, b) =>
          calcBV(a) > calcBV(b)
            ? a
            : b,
        line.subs[0])
    : null;
  return line.subs.reduce((sum, s) => sum + calcSubTotal(s, maxSub), 0);}
export default function Page() {
  const [isMobileView, setIsMobileView] = useState(false);
useEffect(() => {
  const checkMobile = () => {
    setIsMobileView(window.innerWidth <= 1024);};
  checkMobile();
  window.addEventListener('resize', checkMobile);
  return () =>
    window.removeEventListener('resize', checkMobile);
}, []);
  const [lines, setLines] = useState<Line[]>([]);
  const [tempLine, setTempLine] = useState<SkateElement[]>([]);
  const [playerName, setPlayerName] = useState('');
  const [country, setCountry] = useState('');
  const [competition, setCompetition] = useState('');
  const [category, setCategory] =
    useState<keyof typeof PCS_MULTIPLIERS>('MenSP');
  const [pcs, setPcs] = useState<PCS>({ comp: 8, pres: 8, skills: 8 });
  const [Deductions, setDeductions] = useState({
  programTime: false,
  illegalElement: false,
  illegalMovement: false,
  costumeProp: false,
  costumeFall: false,
  lateStart: false,
  interruption: 0, // 0,-1,-2
});
  const [history, setHistory] = useState<HistoryItem[]>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("fs_protocol_history_v1");
      if (raw) setHistory(JSON.parse(raw));
    } catch {}
  }, []);
  // show ISU-like protocol view after pressing 決定して表示
  const [showProtocol, setShowProtocol] = useState<HistoryItem | null>(null);
  const [isDeductionsOpen, setIsDeductionsOpen] = useState(false);
  const [isPCSOpen, setIsPCSOpen] = useState(false);
  const [isElementSelectorOpen, setIsElementSelectorOpen] = useState(false);
const [selectedCategory, setSelectedCategory] = useState<
  'JUMP' | 'SPIN' | 'STEP' | 'CHOREO' | ''
>('');
const [selectedJumpType, setSelectedJumpType] = useState('');
const [selectedSpinType, setSelectedSpinType] = useState('');
const [selectedSpinMode, setSelectedSpinMode] = useState('');
const [recentElements, setRecentElements] = useState<SkateElement[]>([]);
const [isComboMode, setIsComboMode] = useState(false);
useEffect(() => {
    localStorage.setItem('fs_protocol_history_v1', JSON.stringify(history));
  }, [history]);
 const addToTemp = (el: SkateElement) => {
  // コンボモードでない場合
  if (!isComboMode) {
    setTempLine([el]);
  } else {
    // コンボモードなら追加
    setTempLine((t) => [...t, el]);}
  // 最近使用
  setRecentElements((prev) => {
    const filtered = prev.filter((p) => p.name !== el.name);
    return [el, ...filtered].slice(0, 10);
  });};
  const clearTemp = () => {
  setTempLine([]);
  setIsComboMode(false);};
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
        marks: [] as string[],
        secondHalf: false,
      })),};
    setLines((l) => [...l,newLine]);
   setTempLine([]);
   setIsComboMode(false);};
  const addComboToLine = (lineId: number) => {
    setLines((l) =>
      l.map((line) =>
        line.id !== lineId
          ? line
          : {
              ...line,
              subs: [
                ...line.subs,
                {id: uid(),
                  element: JUMPS[0],
                  underRotation: '',
                  edge: '',
                  goe: 0,
                  marks: [] as string[],
                  secondHalf: false,},],}));};
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
            return { ...s, marks: newMarks };
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
  const totalFalls = countTotalFalls(lines);
  const totalTESbeforeFalls = lines.reduce(
    (sum, line) => sum + calcLineTotal(line),
    0
  );
  const totalFallPenalty = calcTotalFallPenalty(lines);
  const additionalDeductions =
  (Deductions.programTime ? -1 : 0) +
  (Deductions.illegalElement ? -2 : 0) +
  (Deductions.illegalMovement ? -2 : 0) +
  (Deductions.costumeProp ? -1 : 0) +
  (Deductions.costumeFall ? -1 : 0) +
  (Deductions.lateStart ? -1 : 0) +
  Deductions.interruption;
  const totalDeductions =
  totalFallPenalty + additionalDeductions;
  // TES は純粋に技術点のみ
  const totalTES = Number(
  totalTESbeforeFalls.toFixed(2)
);
  const pcsRaw = Number((pcs.comp + pcs.pres + pcs.skills).toFixed(2));
  const pcsfactored = Number((pcsRaw * PCS_MULTIPLIERS[category]).toFixed(2));
// Total Segment Score で Deductions を引く
  const grandTotal = Number(
  (totalTES + pcsfactored + totalDeductions).toFixed(2)
);
  const saveResultToHistory = () => {
    const item: HistoryItem = {
      id: uid(),
      playerName,
      country,
      competition,
      category,
      tes: totalTES,
      pcsRaw,
      pcsfactored,
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
  pcs, 
  pcsRaw,
  pcsfactored,
  totalTES,
  grandTotal,
  totalDeductions,
  Deductions,
});
    const item: HistoryItem = {
      id: uid(),
      playerName,
      country,
      competition,
      category,
      tes: totalTES,
      pcsRaw,
      pcsfactored,
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
    if (!confirm('Delete All')) return;
    setHistory([]);
  };
  const deleteHistoryItem = (id: number) =>
    setHistory((h) => h.filter((x) => x.id !== id));
    const downloadProtocol = () => {
  if (!showProtocol?.protocolHtml) {
    alert('No protocol data');
    return;
  }
  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta
  name="viewport"
  content="width=device-width, initial-scale=1"
/>
<title>Protocol</title>
<style>
body {
  margin: 0;
  padding:12px;
  background: #ffffff;
  color: #000000;
  font-family: Arial, sans-serif;
}
table {
  border-collapse: collapse;
}
button {
  display: none;
}
</style>
</head>
<body>
${showProtocol.protocolHtml}
</body>
</html>
`;
  const blob = new Blob(
    [fullHtml],
    { type: 'text/html;charset=utf-8' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    `${showProtocol.playerName || 'protocol'}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
  const exportHistory = () => {
  const blob = new Blob(
    [JSON.stringify(history, null, 2)],
    { type: 'application/json' }
  );
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download =
    `skating-history-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
  /* Protocol view */
  if (showProtocol) {
    return (
      <div
        style={{
          padding: 18,
          fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto",
          maxWidth: isMobileView ? '100%' : 980,
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
  style={{
    overflowX: 'auto',
    WebkitOverflowScrolling: 'touch',
  }}
  dangerouslySetInnerHTML={{
    __html:
      showProtocol.protocolHtml ||
      'No data',
  }}
/>
      </div>
    );
  }
  return (
    <div
      style={{
        padding: 14,
        fontFamily: "system-ui, -apple-system, 'Segoe UI', Roboto",
        maxWidth: isMobileView ? '100%' : 980,
        margin: '0 auto',
       backgroundColor: '#ffffff',
       color: '#000000',
       minHeight: '100vh',
      }}
    >
      <h1 style={{ fontSize: 22, marginBottom: 10 }}>
        Figure Skating Judge Simulation(2026/27)
      </h1>
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
      <div style={{ overflowX: 'auto' }}>
         {lines.map((line, lineIndex) => {
          const maxSub =
  line.subs.length > 0
    ? line.subs.reduce(
        (a, b) =>
          calcBV(a) > calcBV(b)
            ? a
            : b,
        line.subs[0]
      )
    : null;
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
                 Executed Element #{lineIndex + 1} 合計: {calcLineTotal(line).toFixed(2)}
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
                  minWidth: isMobileView ? 640 : 980,
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
                    <th style={thStyle}>Others</th>
                    <th style={thStyle}>Delete</th>
                  </tr>
                </thead>
                <tbody>
                 {line.subs.map((sub) => {
                    const bvWithMods = calcBV(sub);
                    const isMax = maxSub ? sub.id === maxSub.id : false;
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
                           onChange={(e) => {
  const found = ALL_ELEMENTS.find(
    (x) => x.name === e.target.value
  );

  if (!found) return;

  updateSub(line.id, sub.id, {
    element: found,
  });
}}
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
  sub.element.name === 'ChSq1' ||
  sub.element.name === 'ChSp1' ? (
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
  {sub.element.type === 'jump' ? (
    <select
      value={sub.underRotation || ''}
      onChange={(e) =>
        updateSub(line.id, sub.id, {
          underRotation:
            e.target.value as
              | ''
              | 'q'
              | '<'
              | '<<',
        })
      }
    >
      <option value="">正常</option>
      <option value="q">q</option>
      <option value="<">&lt;</option>
      <option value="<<">&lt;&lt;</option>
    </select>
  ) : (
    <div style={{ color: '#999' }}>—</div>
  )}
</td>
                     <td style={tdStyle}>
  {(() => {
    // ジャンプ名から種類を取得
    const jumpType = sub.element.name.match(/[A-Za-z]+/)?.[0] || '';

    // F と Lz のみ edge 判定を表示
   const canHaveEdgeCall =
  sub.element.type === 'jump' &&
  (jumpType === 'F' || jumpType === 'Lz');

    if (!canHaveEdgeCall) {
      return <div style={{ color: '#999' }}>—</div>;
    }
    return (
      <select
        value={sub.edge || ''}
        onChange={(e) =>
          updateSub(line.id, sub.id, {
            edge: e.target.value as '' | '!' | 'e',
          })
        }
      >
        <option value="">正常</option>
        <option value="!">!</option>
        <option value="e">e</option>
      </select>
    );
  })()}
</td>
                        <td style={tdStyle}>
  {sub.element.type === 'spin' ? (
    <input
      type="checkbox"
      checked={sub.marks.includes('V')}
      onChange={() =>
        toggleMark(line.id, sub.id, 'V')
      }
    />
  ) : (
    <div style={{ color: '#999' }}>—</div>
  )}
</td>
    <td style={tdStyle}>
  {sub.element.type === 'jump' &&
  line.subs[0].id === sub.id ? (
    <input
      type="checkbox"
      checked={line.subs.every((s) => s.secondHalf)}
      onChange={(e) => {
        const checked = e.target.checked;
        setLines((prev) =>
          prev.map((l) => {
            if (l.id !== line.id) return l;
            return {
              ...l,
              subs: l.subs.map((s) => ({
                ...s,
                secondHalf: checked,
              })),
            };
          })
        );
      }}
    />
  ) : null}
</td>
                       <td style={tdStyle}>
  {sub.element.type === 'jump' ? (
    (
  line.subs.length > 1
    ? ["F", "*", "SEQ", "COMBO"]
    : ["F", "REP", "*", "SEQ", "COMBO"]
).map(
      (mark) => (
        <label
          key={mark}
          style={{
            marginRight: 6,
            display: 'block',
          }}
        >
          <input
            type="checkbox"
            checked={sub.marks.includes(mark)}
            onChange={() =>
              toggleMark(
                line.id,
                sub.id,
                mark
              )
            }
          />
          {mark}
        </label>
      )
    )
  ) : (
     <>
  {["F"].map((mark) => (
        <label
          key={mark}
          style={{
            marginRight: 6,
            display: 'block',
          }}
        >
          <input
            type="checkbox"
            checked={sub.marks.includes(mark)}
            onChange={() =>
              toggleMark(
                line.id,
                sub.id,
                mark
              )
            }
          />
          {mark}
        </label>
      ))}
    </>
  )}
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
 {/* Element Selector Toggle */}
<div
  onClick={() =>
    setIsElementSelectorOpen(!isElementSelectorOpen)
  }
  style={{
    marginBottom: 12,
    padding: 12,
    border: '1px solid #eee',
    borderRadius: 10,
    background: '#fafafa',
    fontWeight: 700,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  }}
>
  <span>Elements</span>
  <button
    style={{
      width: 32,
      height: 32,
      borderRadius: 999,
      border: '1px solid #ccc',
      background: '#fff',
      fontSize: 20,
      cursor: 'pointer',
    }}
  >
    {isElementSelectorOpen ? '−' : '+'}
  </button>
</div>
<div
  style={{
    maxHeight: isElementSelectorOpen ? 3000 : 0,
    overflow: 'hidden',
    transition: '0.25s ease',
  }}
>
  <div
    style={{
      marginBottom: 12,
      padding: 12,
      border: '1px solid #eee',
      borderRadius: 10,
      background: '#fafafa',
    }}
  >
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
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {['JUMP', 'SPIN', 'STEP', 'CHOREO'].map((cat) => (
      <button
        key={cat}
        onClick={() => {
          setSelectedCategory(
  cat as 'JUMP' | 'SPIN' | 'STEP' | 'CHOREO'
);
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
    {selectedJumpType === 'Eu' ? (
      (() => {
        const el = ALL_ELEMENTS.find(
          (x) => x.name === '1Eu'
        );
        if (!el) return null;
        return (
          <button
            key="1Eu"
            onClick={() => addToTemp(el)}
            style={smallBtn}
          >
            1Eu
          </button>
        );
      })()
    ) : (
      ROTATIONS.map((r) => {
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
      })
    )}
  </div>
)}
    </div>
  )}
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
         {['', 'B', '1', '2', '3', '4'].map((lv) => {
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
  key={lv === '' ? selectedSpinType : name}
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
    ＋Add Combo
  </button>
</div>
  {/* temp line */}
  {tempLine.length > 0 && (
    <div style={{ marginTop: 12 }}>
      <div>
        追加予定：
        {tempLine.map((t, i) => (
          <span key={`${t.name}-${i}`}>
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
</div>
<div
  onClick={() => setIsPCSOpen(!isPCSOpen)}
  style={{
    marginTop: 12,
    padding: 12,
    border: '1px solid #eee',
    borderRadius: 10,
    background: '#f7fbff',
    fontWeight: 700,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  }}
>
  <span>Program Component Score</span>
  <button
    style={{
      width: 32,
      height: 32,
      borderRadius: 999,
      border: '1px solid #ccc',
      background: '#fff',
      fontSize: 20,
      cursor: 'pointer',
    }}
  >
    {isPCSOpen ? '−' : '+'}
  </button>
</div>
<div
  style={{
    maxHeight: isPCSOpen ? 1000 : 0,
    overflow: 'hidden',
    transition: '0.25s ease',
  }}
>
  <div
    style={{
      marginTop: 8,
      padding: 12,
      border: '1px solid #eee',
      borderRadius: 10,
      background: '#f7fbff',
    }}
  >
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
        <div style={{ width: 140, fontWeight: 600 }}>
          {label}
        </div>

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
      PCS raw:{' '}
      {(pcs.comp + pcs.pres + pcs.skills).toFixed(2)}
      × multiplier ({PCS_MULTIPLIERS[category]})
      = {pcsfactored.toFixed(2)}
    </div>
  </div>
</div>
<div
  onClick={() => setIsDeductionsOpen(!isDeductionsOpen)}
  style={{
    marginTop: 12,
    padding: 12,
    border: '1px solid #eee',
    borderRadius: 10,
    background: '#fff5f5',
    fontWeight: 700,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
  }}
>
  <span>Deductions</span>
  <button
    style={{
      width: 32,
      height: 32,
      borderRadius: 999,
      border: '1px solid #ccc',
      background: '#fff',
      fontSize: 20,
      cursor: 'pointer',
    }}
  >
    {isDeductionsOpen ? '−' : '+'}
  </button>
</div>
    <div
  style={{
    maxHeight: isDeductionsOpen ? 1000 : 0,
    overflow: 'hidden',
    transition: '0.25s ease',
  }}
>
  {/* Falls */}
  <div
    style={{
      padding: 10,
      borderRadius: 8,
      background: '#ffeaea',
      marginBottom: 12,
    }}
  >
    <div style={{ fontWeight: 700 }}>
      Falls
    </div>
    <div style={{ marginTop: 6 }}>
      Number of Falls : {totalFalls}
    </div>
    <div>
      Fall Deductions : {totalFallPenalty.toFixed(2)}
    </div>
  </div>
  <label style={{ display: 'block', marginBottom: 6 }}>
    <input
      type="checkbox"
      checked={Deductions.programTime}
      onChange={(e) =>
        setDeductions((d) => ({
          ...d,
          programTime: e.target.checked,
        }))
      }
    />
    Program time (-1)
  </label>
  <label style={{ display: 'block', marginBottom: 6 }}>
    <input
      type="checkbox"
      checked={Deductions.illegalElement}
      onChange={(e) =>
        setDeductions((d) => ({
          ...d,
          illegalElement: e.target.checked,
        }))
      }
    />
    Illegal element (-2)
  </label>
  <label style={{ display: 'block', marginBottom: 6 }}>
    <input
      type="checkbox"
      checked={Deductions.illegalMovement}
      onChange={(e) =>
        setDeductions((d) => ({
          ...d,
          illegalMovement: e.target.checked,
        }))
      }
    />
    Illegal movement (-2)
  </label>
  <label style={{ display: 'block', marginBottom: 6 }}>
    <input
      type="checkbox"
      checked={Deductions.costumeProp}
      onChange={(e) =>
        setDeductions((d) => ({
          ...d,
          costumeProp: e.target.checked,
        }))
      }
    />
    Costume and prop violation (-1)
  </label>
  <label style={{ display: 'block', marginBottom: 6 }}>
    <input
      type="checkbox"
      checked={Deductions.costumeFall}
      onChange={(e) =>
        setDeductions((d) => ({
          ...d,
          costumeFall: e.target.checked,
        }))
      }
    />
    Part of costume/decoration falls on ice (-1)
  </label>
  <label style={{ display: 'block', marginBottom: 6 }}>
    <input
      type="checkbox"
      checked={Deductions.lateStart}
      onChange={(e) =>
        setDeductions((d) => ({
          ...d,
          lateStart: e.target.checked,
        }))
      }
    />
    Late start (-1)
  </label>
  <div style={{ marginTop: 10 }}>
    Interruption in performing the program
  </div>
  <select
 value={Deductions.interruption}
    onChange={(e) =>
      setDeductions((d) => ({
        ...d,
        interruption: Number(e.target.value),
      }))
    }
    style={{
      padding: 8,
      borderRadius: 8,
      marginTop: 6,
    }}
  >
    <option value={0}>None</option>
    <option value={-1}>-1</option>
    <option value={-2}>-2</option>
  </select>
  <div
    style={{
      marginTop: 14,
      fontWeight: 700,
      fontSize: 18,
      color: '#c62828',
    }}
  >
    Total Deductions: {totalDeductions.toFixed(2)}
  </div>
</div> 
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
  onClick={downloadProtocol}
  style={{ padding: '10px 12px', borderRadius: 8 }}
>
  Download file
</button>
      </div>
      <div
  style={{
    marginTop: 12,
    padding: 12,
    border: '1px solid #ddd',
    borderRadius: 10,
  }}
>
  <div>
    Technical Element Score :
    {' '}
    {totalTES.toFixed(2)}
  </div>
  <div>
    Program Component Score (factored) :
    {' '}
    {pcsfactored.toFixed(2)}
  </div>
  <div>
    Deductions :
    {' '}
    {totalDeductions.toFixed(2)}
  </div>
  <div
    style={{
      fontWeight: 800,
      marginTop: 6,
      fontSize: 18,
    }}
  >
    Total Segment Score :
    {' '}
    {grandTotal.toFixed(2)}
  </div>
</div>
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
                  {h.pcsfactored} ・ Total: {h.total}
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
function renderProtocolHtml(params: {
  playerName: string;
  country: string;
  competition: string;
  category: string;
  lines: Line[];
  pcs: PCS;
  pcsRaw: number;
  pcsfactored: number;
  totalTES: number;
  grandTotal: number;
  totalDeductions: number;
  Deductions: {
    programTime: boolean;
    illegalElement: boolean;
    illegalMovement: boolean;
    costumeProp: boolean;
    costumeFall: boolean;
    lateStart: boolean;
    interruption: number;
  };
}) {
  const {
    playerName,
    country,
    competition,
    category,
    lines,
    pcs,
    pcsRaw,
    pcsfactored,
    totalTES,
    grandTotal,
    totalDeductions,
    Deductions
  } = params;
  const DeductionsDetails: string[] = [];

if (Deductions.programTime)
  DeductionsDetails.push('Program time violation (-1)');

if (Deductions.illegalElement)
  DeductionsDetails.push('Illegal element (-2)');

if (Deductions.illegalMovement)
  DeductionsDetails.push('Illegal movement (-2)');

if (Deductions.costumeProp)
  DeductionsDetails.push('Costume/Prop violation (-1)');

if (Deductions.costumeFall)
  DeductionsDetails.push('Costume falls on ice (-1)');

if (Deductions.lateStart)
  DeductionsDetails.push('Late start (-1)');

if (Deductions.interruption === -1)
  DeductionsDetails.push('Interruption (-1)');

if (Deductions.interruption === -2)
  DeductionsDetails.push('Interruption (-2)');
  const totalBaseValue = lines
  .reduce(
    (sum, line) =>
      sum +
      line.subs.reduce(
        (s, sub) => s + calcBV(sub),
        0),
    0)
  .toFixed(2);
const totalPanelScore = lines
  .reduce(
    (sum, line) => sum + calcLineTotal(line),
    0)
  .toFixed(2);
  const rowsHtml = lines
    .map((line, idx) => {
   const maxSub =
  line.subs.length > 0
    ? line.subs.reduce((a, b) =>
        calcBV(a) > calcBV(b)
          ? a
          : b
      )
    : null;

const elementText = line.subs
  .map((sub) => {
    let text = sub.element.name;

    // edge を先に
    if (sub.edge) {
      text += sub.edge;
    }

    // rotation は後
    if (sub.underRotation) {
      text += sub.underRotation;
    }

    // V mark
    if (
      sub.marks.includes('V') &&
      sub.element.type === 'spin'
    ) {
      text += 'V';
    }

    // REP
    if (sub.marks.includes('REP')) {
      text += '+REP';
    }

    // *
    if (sub.marks.includes('*')) {
      text += '*';
    }

    // SEQ
    if (sub.marks.includes('SEQ')) {
      text += '+SEQ';
    }

    // COMBO
    if (sub.marks.includes('COMBO')) {
      text += '+COMBO';
    }

    return text;
  })
  .join('+');

const infoText = line.subs
  .map((sub) => {
    const infos: string[] = [];

    if (sub.marks.includes('F')) infos.push('F');
    if (sub.marks.includes('*')) infos.push('*');

    if (sub.edge === '!') infos.push('!');
    if (sub.edge === 'e') infos.push('e');

    if (sub.underRotation === '<') infos.push('<');
    if (sub.underRotation === '<<') infos.push('<<');

    return infos.join(' ');
  })
  .filter(Boolean)
  .join(' + ');
      const hasSecondHalf = line.subs.some(
  (s) => s.secondHalf
);
const bv = line.subs
  .reduce(
    (s, sub) => s + calcBV(sub),
    0
  )
  .toFixed(2);
      const total = calcLineTotal(line).toFixed(2);
     const goeMark =
  maxSub?.goe !== undefined
    ? `${maxSub.goe > 0 ? '+' : ''}${maxSub.goe.toFixed(0)}`
    : '0';
      const goeValue = line.subs.reduce(
  (sum, sub) => sum + calcGOEPoint(sub, maxSub),
  0
).toFixed(2);
      return `
<tr style="border-bottom:1px solid #ddd;">
  <td style="padding:8px;">
    ${idx + 1}
  </td>
  <td style="padding:8px;">
    ${elementText}
  </td>

  <td style="
    border:1px solid #999;
    padding:8px;
    text-align:center;
    font-weight:bold;
    color:#000;
  ">
    ${infoText || '—'}
  </td>

  <td style="
    border:1px solid #999;
    padding:8px;
    text-align:right;
    font-weight:600;
  ">
    ${bv}
    ${hasSecondHalf ? '<span style="font-size:12px;"> x</span>' : ''}
  </td>

  <td style="
    border:1px solid #999;
    padding:8px;
    text-align:right;
  ">
    ${goeValue}
  </td>

  <td style="
    border:1px solid #999;
    padding:8px;
    text-align:right;
  ">
    ${goeMark}
  </td>

  <td style="
    border:1px solid #999;
    padding:8px;
    text-align:right;
  ">
    ${total}
  </td>
</tr>
`;
    })
    .join('');
 return `
<div style="
  border:1px solid #000;
  padding:10px 16px;
  background:white;
  color:black;
  font-family:Arial,sans-serif;
">
<h1 style="
  text-align:center;
  font-size:18px;
  margin:0;
  font-weight:700;
">
${escapeHtml(competition)}
</h1>
<div style="
  text-align:center;
  font-size:20px;
  font-weight:bold;
  margin-bottom:30px;
">
${formatCategory(category)}
</div>
</div>
<table style="
  width:100%;
  border-collapse:collapse;
  margin-bottom:18px;
  border:2px solid #000;
">

<thead>
<tr style="
  border-bottom:1px solid #999;
">
  <th style="padding:8px;text-align:left;font-size:12px;">
    Name
  </th>

  <th style="padding:8px;text-align:left;font-size:12px;">
    Nation
  </th>

  <th style="padding:8px;text-align:right;font-size:12px;">
    Total
  </th>

  <th style="padding:8px;text-align:right;font-size:12px;">
    TES
  </th>

  <th style="padding:8px;text-align:right;font-size:12px;">
    PCS
  </th>

  <th style="padding:8px;text-align:right;font-size:12px;">
    Ded
  </th>
</tr>
</thead>

<tbody>

<tr>
  <td style="
    padding:10px 8px;
    font-weight:700;
  ">
    ${escapeHtml(playerName)}
  </td>

  <td style="padding:10px 8px;">
    ${escapeHtml(country)}
  </td>

  <td style="
    padding:10px 8px;
    text-align:right;
    font-weight:700;
    font-size:22px;
  ">
    ${grandTotal.toFixed(2)}
  </td>

  <td style="
    padding:10px 8px;
    text-align:right;
  ">
    ${totalTES.toFixed(2)}
  </td>
  <td style="
    padding:10px 8px;
    text-align:right;">
    ${pcsfactored.toFixed(2)}
  </td>
  <td style="
    padding:10px 8px;
    text-align:right;">
    ${totalDeductions.toFixed(2)}
  </td>
</tr>
</tbody>
</table>
<div class="protocol-box">
<div style="
  overflow-x:auto;
  -webkit-overflow-scrolling:touch;">
<table style="
  width:100%;
  border-collapse:collapse;
  font-size:14px;
  table-layout:fixed;
  border:1px solid #000;
">
<thead>
<tr style="
  border-bottom:1px solid #000;">
  <th style="width:40px; padding:8px;">
    #
  </th>
  <th style="width:320px; padding:8px;">
  Executed Elements
</th>
<th style="width:100px; padding:8px;">
  Info
</th>
<th style="width:90px; padding:8px;">
  Base Value
</th>
<th style="width:90px; padding:8px;">
  GOE
</th>
<th style="width:90px; padding:8px;">
  GOE Mark
</th>
<th style="width:120px; padding:8px;">
  Scores of Panel
</th>
</tr>
</thead>
<tbody>
${rowsHtml}
</tbody>

<tfoot>
<tr
  style="
    border-top:2px solid #000;
    font-weight:bold;
    background:#f5f5f5;
  "
>
  <td colspan="3" style="padding:8px;text-align:right;">
    Totals
  </td>

  <td
    style="
      padding:8px;
      text-align:right;
      border:1px solid #999;
    "
  >
    ${totalBaseValue}
  </td>

  <td
    style="
      padding:8px;
      text-align:right;
      border:1px solid #999;
    "
  >
    —
  </td>

  <td
    style="
      padding:8px;
      text-align:right;
      border:1px solid #999;
    "
  >
    —
  </td>

  <td
    style="
      padding:8px;
      text-align:right;
      border:1px solid #999;
      font-size:16px;
    "
  >
    ${totalPanelScore}
  </td>
</tr>
</tfoot>
</table>
</div>
<div style="
  margin-top:18px;
  font-size:14px;
">
<div style="
  overflow-x:auto;
  -webkit-overflow-scrolling:touch;">
<table style="
  width:100%;
  border-collapse:collapse;
  font-size:14px;">
<thead>
<tr style="
  border-bottom:1px solid #000;
">
  <th style="
    padding:8px;
    text-align:left;
  ">
    Program Components
  </th>
  <th style="
    padding:8px;
    text-align:right;">
    Factor
  </th>
  <th style="
    padding:8px;
    text-align:right;">
  </th>
</tr>
</thead>
<tbody>
<tr>
  <td style="
    padding:8px;
    text-align:left;
  ">
    Composition
  </td>

  <td style="
    padding:8px;
    text-align:right;
  ">
    ${PCS_MULTIPLIERS[category].toFixed(2)}
  </td>

  <td style="
    padding:8px;
    text-align:right;
  ">
    ${pcs.comp.toFixed(2)}
  </td>
</tr>

<tr>
  <td style="
    padding:8px;
    text-align:left;
  ">
    Presentation
  </td>

  <td style="
    padding:8px;
    text-align:right;
  ">
    ${PCS_MULTIPLIERS[category].toFixed(2)}
  </td>

  <td style="
    padding:8px;
    text-align:right;
  ">
    ${pcs.pres.toFixed(2)}
  </td>
</tr>

<tr>
  <td style="
    padding:8px;
    text-align:left;
  ">
    Skating Skills
  </td>
  <td style="
    padding:8px;
    text-align:right;
  ">
    ${PCS_MULTIPLIERS[category].toFixed(2)}
  </td>

  <td style="
    padding:8px;
    text-align:right;
  ">
    ${pcs.skills.toFixed(2)}
  </td>
</tr>
<tr
  style="
    border-top:2px solid #000;
    font-weight:bold;
    background:#f5f5f5;
  "
>
  <td
    style="
      padding:8px;
      text-align:left;
    "
  >
    Judge Total Program Component Score (factored)
  </td>

  <td
    style="
      padding:8px;
      text-align:right;
    "
  >
    —
  </td>
  <td
    style="
      padding:8px;
      text-align:right;
      font-size:16px;
    "
  >
    ${pcsfactored.toFixed(2)}
  </td>
</tr>
</tbody>
</table>
</div></div>
<div style="
  border-bottom:1px solid #000;
  padding:14px;
  display:flex;
  justify-content:space-between;
  font-size:18px;
">
  <span>Deductions</span>
  <b>${totalDeductions.toFixed(2)}</b>
</div>
</div>
`;
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

function formatCategory(category: string) {
  const map: Record<string, string> = {
    MenSP: 'MEN SHORT PROGRAM',
    MenFS: 'MEN FREE SKATING',
    WomenSP: 'WOMEN SHORT PROGRAM',
    WomenFS: 'WOMEN FREE SKATING',
  };

  return map[category] || category;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
