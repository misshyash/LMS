// DEMO-ONLY placeholder question bank.
//
// This is intentionally NOT the real CAIWP MQA question bank. The real
// questions (and their answer key) live server-side only, inside
// functions/src/data/questionBank.ts, and are never bundled into client
// JavaScript. This file exists purely so "Demo Mode" can be exercised
// end-to-end (candidate flow + admin flow) without a configured Firebase
// project, using obviously-fake sample content, and with an answer key
// that has zero relation to the real assessment.

export interface DemoQuestion {
  id: string;
  order: number;
  module: number;
  moduleTitle: string;
  text: string;
  options: string[];
  correct: number;
  rationale: string;
}

const MODULE_TITLES: Record<number, string> = {
  1: 'AI Foundations, Ethics & Responsible Use',
  2: 'Prompt Engineering & Advanced Techniques',
  3: 'AI for Communication, Research & Knowledge',
  4: 'Data, Visuals & Workflow Automation',
};

function moduleForOrder(order: number): number {
  if (order <= 10) return 1;
  if (order <= 17) return 2;
  if (order <= 24) return 3;
  return 4;
}

export const DEMO_QUESTIONS: DemoQuestion[] = Array.from({ length: 30 }, (_, i) => {
  const order = i + 1;
  const module = moduleForOrder(order);
  return {
    id: `demo-q${order}`,
    order,
    module,
    moduleTitle: MODULE_TITLES[module],
    text: `[Sample Question ${order}] This is placeholder demo content standing in for a Module ${module} question.`,
    options: ['Sample option A', 'Sample option B (correct)', 'Sample option C', 'Sample option D'],
    correct: 1,
    rationale: 'This is a demo rationale shown only in Demo Mode sample data.',
  };
});
