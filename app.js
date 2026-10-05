const equationInput = document.getElementById('equation');
const solveBtn = document.getElementById('solveBtn');
const errorEl = document.getElementById('error');
const answerSection = document.getElementById('answerSection');
const prettyEquation = document.getElementById('prettyEquation');
const stepsEl = document.getElementById('steps');
const bestAnswer = document.getElementById('bestAnswer');
const examplesAnswer = document.getElementById('examplesAnswer');
const practiceBtn = document.getElementById('practiceBtn');
const practiceActions = document.getElementById('practiceActions');
const checkBtn = document.getElementById('checkBtn');
const resetOrderBtn = document.getElementById('resetOrderBtn');
const orderMessage = document.getElementById('orderMessage');
const stepTemplate = document.getElementById('stepTemplate');

let currentSteps = [];
let dragEl = null;

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) [a, b] = [b, a % b];
  return a;
}

function mod(a, n) {
  return ((a % n) + n) % n;
}

function extendedGcd(a, b) {
  if (b === 0) return [Math.abs(a), a < 0 ? -1 : 1, 0];
  const [g, x1, y1] = extendedGcd(b, a % b);
  return [g, y1, x1 - Math.trunc(a / b) * y1];
}

function inverseMod(a, n) {
  const [g, x] = extendedGcd(a, n);
  if (g !== 1) return null;
  return mod(x, n);
}

function parseEquation(raw) {
  const cleaned = raw
    .trim()
    .replace(/−/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/\(\s*mod\s+/ig, ' mod ')
    .replace(/\)\s*$/, '')
    .trim();

  const match = cleaned.match(/^([+-]?\d*)\s*x\s*(?:≡|=)\s*([+-]?\d+)\s+mod\s+([+-]?\d+)$/i);
  if (!match) throw new Error('Dili nako mabasa ang format. Sulayi: 9x ≡ 21 mod 30');

  const aText = match[1];
  const a = aText === '' || aText === '+' ? 1 : aText === '-' ? -1 : Number(aText);
  const b = Number(match[2]);
  const n = Math.abs(Number(match[3]));

  if (!Number.isInteger(a) || !Number.isInteger(b) || !Number.isInteger(n) || n === 0) {
    throw new Error('Gamita lang integer numbers, ug ang modulus dili mahimong 0.');
  }
  return { a, b, n };
}

function solveCongruence(a, b, n) {
  const d = gcd(a, n);
  if (b % d !== 0) return { hasSolution: false, d };

  const ar = a / d;
  const br = b / d;
  const nr = n / d;
  const inv = inverseMod(mod(ar, nr), nr);
  const x0 = mod(inv * br, nr);
  return { hasSolution: true, d, ar, br, nr, x0 };
}

function formatCoeff(a) {
  if (a === 1) return '';
  if (a === -1) return '-';
  return String(a);
}

function mathEq(a, b, n) {
  return `${formatCoeff(a)}x ≡ ${b} (mod ${n})`;
}

function buildSteps(a, b, n, result) {
  if (!result.hasSolution) {
    return [
      {
        title: 'Step 1 — Tan-awa ang common factor',
        main: `gcd(${Math.abs(a)}, ${n}) = ${result.d}`,
        note: `Ang ${result.d} kinahanglan maka-divide usab sa ${b}.`
      },
      {
        title: 'Step 2 — Check',
        main: `${b} ÷ ${result.d} dili whole number`,
        note: 'Busa walay integer x nga makasatisfy sa equation.'
      }
    ];
  }

  const steps = [];
  steps.push({
    title: 'Step 1 — Pangitaa ang common factor',
    main: `gcd(${Math.abs(a)}, ${n}) = ${result.d}`,
    note: result.d === 1
      ? 'Walay kinahanglan i-divide. Diretso ta sa equation.'
      : `Common factor nila kay ${result.d}. Kay ma-divide pud ang ${b} sa ${result.d}, pwede nato pasayonon.`
  });

  if (result.d > 1) {
    steps.push({
      title: `Step 2 — Divide tanan by ${result.d}`,
      main: mathEq(result.ar, result.br, result.nr),
      note: 'Mas gamay na ang numbers, pero pareho gihapon ang solution set.'
    });
  } else {
    steps.push({
      title: 'Step 2 — Keep the equation',
      main: mathEq(result.ar, result.br, result.nr),
      note: 'Simplified na daan ang equation.'
    });
  }

  const product = result.ar * result.x0;
  const remainder = mod(product, result.nr);
  steps.push({
    title: 'Step 3 — Pangitaa ang pinakagamay nga x',
    main: `Sulayi ang x = 0, 1, 2… → x = ${result.x0} works`,
    note: `${result.ar}(${result.x0}) = ${product}; kung divide by ${result.nr}, ang remainder kay ${remainder}, mao ang kinahanglan nga ${mod(result.br, result.nr)}.`
  });

  steps.push({
    title: 'Step 4 — Himoa nga general answer',
    main: `x = ${result.nr}k + ${result.x0}`,
    note: `Magdugang o magminus lang ug ${result.nr}. Mao nang ang k mahimong bisan unsang integer.`
  });

  return steps;
}

function renderStep(step, order) {
  const node = stepTemplate.content.firstElementChild.cloneNode(true);
  node.dataset.order = order;
  node.querySelector('.step-title').textContent = step.title;
  node.querySelector('.step-main').textContent = step.main;
  node.querySelector('.step-note').textContent = step.note;

  node.addEventListener('dragstart', () => {
    dragEl = node;
    node.classList.add('dragging');
  });
  node.addEventListener('dragend', () => {
    node.classList.remove('dragging');
    dragEl = null;
  });
  node.addEventListener('dragover', (e) => {
    e.preventDefault();
    if (!dragEl || dragEl === node) return;
    const rect = node.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    stepsEl.insertBefore(dragEl, after ? node.nextSibling : node);
  });

  node.querySelector('.move-up').addEventListener('click', () => {
    const prev = node.previousElementSibling;
    if (prev) stepsEl.insertBefore(node, prev);
  });
  node.querySelector('.move-down').addEventListener('click', () => {
    const next = node.nextElementSibling;
    if (next) stepsEl.insertBefore(next, node);
  });
  return node;
}

function renderSteps(steps, shuffle = false) {
  stepsEl.innerHTML = '';
  const ordered = steps.map((s, i) => ({ ...s, originalOrder: i }));
  if (shuffle) {
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }
    if (ordered.every((s, i) => s.originalOrder === i) && ordered.length > 1) {
      [ordered[0], ordered[1]] = [ordered[1], ordered[0]];
    }
  }
  ordered.forEach(s => stepsEl.appendChild(renderStep(s, s.originalOrder)));
}

function solve() {
  errorEl.hidden = true;
  orderMessage.textContent = '';
  try {
    const { a, b, n } = parseEquation(equationInput.value);
    const result = solveCongruence(a, b, n);
    prettyEquation.textContent = mathEq(a, b, n);
    currentSteps = buildSteps(a, b, n, result);
    renderSteps(currentSteps, false);

    if (result.hasSolution) {
      bestAnswer.textContent = `x = ${result.nr}k + ${result.x0}`;
      const vals = [0,1,2,3].map(k => result.x0 + result.nr * k);
      examplesAnswer.textContent = `x = ${vals.join(', ')}, …`;
      document.getElementById('kMeaning').hidden = false;
    } else {
      bestAnswer.textContent = 'Walay integer solution';
      examplesAnswer.textContent = 'No solution';
      document.getElementById('kMeaning').hidden = true;
    }

    practiceActions.hidden = true;
    practiceBtn.textContent = '🎯 Practice: Shuffle Steps';
    answerSection.hidden = false;
    answerSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
    answerSection.hidden = true;
  }
}

solveBtn.addEventListener('click', solve);
equationInput.addEventListener('keydown', e => { if (e.key === 'Enter') solve(); });

document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', () => {
    equationInput.value = btn.dataset.eq;
    solve();
  });
});

practiceBtn.addEventListener('click', () => {
  renderSteps(currentSteps, true);
  practiceActions.hidden = false;
  orderMessage.textContent = 'I-drag ang cards sa sakto nga order.';
});

checkBtn.addEventListener('click', () => {
  const cards = [...stepsEl.children];
  const correct = cards.every((c, i) => Number(c.dataset.order) === i);
  orderMessage.textContent = correct ? '✅ Sakto! Perfect ang order.' : '❌ Dili pa. Sulayi balik.';
  orderMessage.style.color = correct ? '#0c7a43' : '#a11f1f';
});

resetOrderBtn.addEventListener('click', () => {
  renderSteps(currentSteps, false);
  orderMessage.textContent = 'Mao ni ang sakto nga order.';
  orderMessage.style.color = '#0c7a43';
});

solve();