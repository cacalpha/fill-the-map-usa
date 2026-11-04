// Saldo, fase da casa e salário de cada pessoa, a partir do registro (ledger). Usado pelo site e pela apuração.
import { LEVELS, levelOf, PHASE_PRICE, SALARY, OFFICE_ROLE } from './game.js';

export const emptyLedger = () => ({ v: 1, base: {}, bought: {}, spent: {}, salary: {}, bonus: {}, holders: {}, elections: {}, elected: null, log: [] });

// base = fase da casa no dia em que a economia nova começou (mantida de graça); o saldo inicial é TODO o que a pessoa já ganhou (n0 = 0)
export function makeBase(houses) { const b = {}; for (const o of houses) { const lvl0 = levelOf(o.n); b[o.h] = { lvl0, n0: 0 }; } return b; }

export function phaseOf(h, led) { const b = led.base?.[h]; return Math.max(b?.lvl0 ?? 0, led.bought?.[h] ?? 0); }

// salário que ainda está correndo (cargo eleito, até a próxima apuração)
export function liveSalary(h, led, now = Date.now(), until = Infinity) {
  const hd = led.holders?.[h]; if (!hd) return 0; const end = Math.min(now, until), hours = Math.max(0, (end - hd.since) / 3600e3);
  return hours * (SALARY[hd.office] ?? 0);
}
export function balanceOf(o, led, now = Date.now(), until = Infinity) {
  const b = led.base?.[o.h], n0 = b?.n0 ?? 0, earned = Math.max(0, o.n - n0), spent = led.spent?.[o.h] ?? 0, sal = (led.salary?.[o.h] ?? 0) + liveSalary(o.h, led, now, until), bonus = led.bonus?.[o.h] ?? 0;
  return Math.floor(earned - spent + sal + bonus);
}
export const nextPrice = lvl => PHASE_PRICE[lvl] ?? null;   // quanto custa ir da fase `lvl` (0-based) para a próxima
export const officeRole = office => OFFICE_ROLE[office];
