// CAIWP MQA Assessment — real question bank + answer key.
//
// This file lives ONLY inside the Cloud Functions codebase and is never
// bundled into client JavaScript. `seedAssessment()` in index.ts splits it
// into a public `questions` collection (text + options, no answers) and a
// server-only `answer_keys` collection (correct index + rationale), used
// exclusively by submitAttempt() for grading.

export interface BankQuestion {
  id: string;
  order: number;
  module: number;
  moduleTitle: string;
  text: string;
  options: string[];
  correct: number; // index into options
  rationale: string;
}

const MODULE_TITLES: Record<number, string> = {
  1: 'AI Foundations, Ethics & Responsible Use',
  2: 'Prompt Engineering & Advanced Techniques',
  3: 'AI for Communication, Research & Knowledge',
  4: 'Data, Visuals & Workflow Automation',
};

// options are stored in the exact order shown in the source assessment;
// `correct` is the 0-indexed position (A=0, B=1, C=2, D=3).
const RAW: Omit<BankQuestion, 'moduleTitle'>[] = [
  { id: 'q1', order: 1, module: 1, text: "When was 'Artificial Intelligence' officially coined at Dartmouth College?", options: ['1943 by Warren McCulloch & Walter Pitts', '1956 by John McCarthy', '1968 by Marvin Minsky', '1984 by John Hopfield'], correct: 1, rationale: 'John McCarthy coined the term in 1956 at the Dartmouth workshop, founding AI as an academic field.' },
  { id: 'q2', order: 2, module: 1, text: "Which AI level characterizes today's mainstream enterprise tools (ChatGPT, Gemini, Copilot)?", options: ['Artificial General Intelligence (AGI)', 'Artificial Narrow Intelligence (ANI)', 'Artificial Super Intelligence (ASI)', 'Autonomous Agentic Consciousness (AAC)'], correct: 1, rationale: 'Current tools are ANI; they execute specific tasks without general consciousness.' },
  { id: 'q3', order: 3, module: 1, text: 'What main capability distinguishes Agentic AI from standard Generative AI chatbots?', options: ['Generating multi-lingual poetry', 'Autonomous execution of multi-step workflows and sub-tasks', 'Zero cloud infrastructure needs', 'Exclusive use in physical robotics'], correct: 1, rationale: 'Agentic AI autonomously executes multi-step workflows, whereas standard GenAI uses single-turn prompts.' },
  { id: 'q4', order: 4, module: 1, text: "In the P.T.O. prompt framework, what does 'O' (Outcome) define?", options: ['Operational cloud token costs', 'Output format, audience, length, and success criteria', 'Origin server IP address', 'Team organizational chart hierarchy'], correct: 1, rationale: 'Outcome specifies formatting, audience, length, and success standards for the response.' },
  { id: 'q5', order: 5, module: 1, text: 'Why are ChatGPT Custom Instructions or System Prompts useful for workplace productivity?', options: ['Disables token usage limits', 'Retains persistent role, context, and preferred formats across chats', 'Accesses private corporate intranet servers', 'Automatically bypasses corporate firewalls'], correct: 1, rationale: 'They establish persistent contextual preferences across all new chat sessions.' },
  { id: 'q6', order: 6, module: 1, text: 'Which feature helps maintain persistent departmental context and documents in ChatGPT?', options: ['ChatGPT Projects', 'Public Web Browsing', 'Temporary Shared Links', 'Consumer Voice Mode'], correct: 0, rationale: 'ChatGPT Projects creates shared workspaces with persistent prompts and uploaded context files.' },
  { id: 'q7', order: 7, module: 1, text: "Under the CAIWP Ethical AI framework, which action is a strict workplace 'DON'T'?", options: ['Using structured prompt templates', 'Pasting unredacted client names, NRICs, or financial data into public AI', 'Setting up human-in-the-loop review checkpoints', 'Replacing sensitive identifiers with tokens like [Client A]'], correct: 1, rationale: 'Sharing unredacted PII in public tools violates data protection laws and privacy standards.' },
  { id: 'q8', order: 8, module: 1, text: "Under Malaysia's PDPA 2024 Amendment, what is the mandatory data breach notification window?", options: ['24 hours', '48 hours', '72 hours', '7 working days'], correct: 2, rationale: 'Authorities must be notified of data breaches within 72 hours.' },
  { id: 'q9', order: 9, module: 1, text: "What is 'Voice Cloning' (Vishing) in AI social engineering threats?", options: ['Real-time voice-to-text translation', "Synthesizing a person's exact voice from audio samples to deceive people", 'Upgrading office VoIP hardware', 'Automating interactive voice response menus'], correct: 1, rationale: 'Voice cloning mimics target voices from brief samples to carry out impersonation fraud.' },
  { id: 'q10', order: 10, module: 1, text: 'What protocol should be followed upon receiving an urgent AI-generated voice or email fund request?', options: ['Transfer funds immediately', '3-Step Rule: PAUSE, VERIFY (out-of-band), and REPORT', 'Forward to social media', 'Reply asking if the sender is an AI'], correct: 1, rationale: 'Pause execution, verify through a trusted direct channel, and report to security.' },

  { id: 'q11', order: 11, module: 2, text: 'In the CTOF prompt framework, which part prevents hallucinations and ensures compliance?', options: ['Context', 'Task', 'Constraints', 'Output Format'], correct: 2, rationale: 'Constraints serve as guardrails to prevent unsafe, inaccurate, or off-target outputs.' },
  { id: 'q12', order: 12, module: 2, text: 'Which technique provides 2–3 input-output examples in a prompt to set tone and format?', options: ['Zero-shot prompting', 'Few-shot prompting', 'Self-reflective recursion', 'Direct kernel injection'], correct: 1, rationale: 'Few-shot prompting includes concrete examples to anchor expected outputs.' },
  { id: 'q13', order: 13, module: 2, text: "When should analysts use 'Chain-of-Thought' (CoT) prompting?", options: ['Translating short slang phrases', 'Complex tasks requiring step-by-step reasoning before a conclusion', 'Generating images in Canva', 'Increasing physical typing speed'], correct: 1, rationale: 'CoT forces the AI to show sequential logical steps prior to providing a final answer.' },
  { id: 'q14', order: 14, module: 2, text: 'What is the main benefit of Role-Based Prompting?', options: ['Removes token usage limits', 'Sets domain expertise, terminology, and elevates response quality', 'Grants legal immunity from audits', 'Enables browsing behind password-protected portals'], correct: 1, rationale: 'It establishes specific professional perspective and vocabulary for higher quality answers.' },
  { id: 'q15', order: 15, module: 2, text: "How does 'Prompt Chaining' improve large deliverables?", options: ['Sends 50 identical prompts at once', 'Breaks complex tasks into sequential prompts where each builds on the previous output', 'Locks prompt windows', 'Connects hardware cables for faster speed'], correct: 1, rationale: 'It breaks large tasks into manageable linked steps with intermediate human checks.' },
  { id: 'q16', order: 16, module: 2, text: 'In the CAIWP 5-Point Prompt Framework, what does a score below 5 out of 15 indicate?', options: ['Ready for client distribution', 'Missing core structure and must be rebuilt using CTOF', 'AI server downtime', 'Trade secret status'], correct: 1, rationale: 'Low scores reflect missing basic structure, requiring complete rebuilding using CTOF.' },
  { id: 'q17', order: 17, module: 2, text: "What is the purpose of a shared enterprise 'Team Prompt Library'?", options: ['Granting unauthorized database access', 'Standardizing vetted, compliance-checked prompts for routine tasks', 'Removing the need for job knowledge', 'Training external AI models'], correct: 1, rationale: 'It standardizes effective, safe prompts for recurring team tasks.' },

  { id: 'q18', order: 18, module: 3, text: "Which three primary 'levers' calibrate AI communication for different stakeholders?", options: ['Tone, Audience, and Format', 'Grammar, Font Size, and Spacing', 'Color, Resolution, and Frame Rate', 'Bandwidth, Latency, and IP Address'], correct: 0, rationale: 'Tone, Audience, and Format control the style and delivery of messaging.' },
  { id: 'q19', order: 19, module: 3, text: 'What quality step is mandatory when using AI to batch-draft customer emails?', options: ['Auto-sending drafts without review', 'Spot-checking at least 10% of outputs for accuracy and tone', 'Pasting client PINs into prompts', 'Translating emails to 10 languages'], correct: 1, rationale: 'Sampling outputs ensures consistency, correctness, and proper tone.' },
  { id: 'q20', order: 20, module: 3, text: "In the S.A.F.E. framework, what occurs during the 'A' step?", options: ['Accelerate generation rates', 'Anonymise sensitive identifiers, names, and confidential numbers', 'Authenticate ad trackers', 'Archive documents without reading'], correct: 1, rationale: 'Sensitive data must be anonymized before pasting into public tools.' },
  { id: 'q21', order: 21, module: 3, text: 'Why is Google NotebookLM well-suited for regulatory research compared to standard chatbots?', options: ['Generates animated summaries', 'Grounds responses strictly in uploaded sources with exact citations', 'Needs no web browser', 'Executes automated stock trades'], correct: 1, rationale: 'NotebookLM answers solely from uploaded documents and provides clear citations.' },
  { id: 'q22', order: 22, module: 3, text: 'Why is pasting confidential audit reports into free public AI tools a compliance violation?', options: ['Tools limit inputs to 10 words', 'Data may be retained to train public models, risking exposure', 'Tools alert law enforcement automatically', 'Text converts to binary code'], correct: 1, rationale: 'Public AI tiers retain data for model training, creating data leak risks.' },
  { id: 'q23', order: 23, module: 3, text: "In the R.E.A.D. framework, what happens during the 'E' (Extract) step?", options: ['Emailing unverified files externally', 'Extracting targeted key info (deadlines, duties, owners) via specific queries', 'Erasing local drives', 'Evaluating animation quality'], correct: 1, rationale: 'Specific prompts pull out actionable facts, obligations, and key dates.' },
  { id: 'q24', order: 24, module: 3, text: "How does 'Summarise this document' differ from 'Extract all obligations'?", options: ['Summarizing creates action tables with assigned owners', "'Summarise' gives a high-level overview, while 'Extract' yields actionable tasks and dates", "'Extract' causes mathematical errors", 'There is no difference'], correct: 1, rationale: 'Summaries overview content, whereas extractions highlight actionable duties and deadlines.' },

  { id: 'q25', order: 25, module: 4, text: "In Canva's C.R.E.A.T.E. framework, what does 'A' (Adapt) involve?", options: ['Applying for trademark licenses', 'Using Magic Resize to adapt designs across platform layouts', 'Adding audio to print posters', 'Checking printer toner'], correct: 1, rationale: 'Adapt means converting existing assets into multiple sizes and layouts quickly.' },
  { id: 'q26', order: 26, module: 4, text: 'Why set up a corporate Brand Kit (colors, fonts, logos) in design AI tools?', options: ['Prevents access to external sites', 'Ensures AI-generated graphics match brand guidelines automatically', 'Limits presentations to 3 slides', 'Forces black-and-white outputs'], correct: 1, rationale: 'Pre-set visual elements ensure all generated graphics stay on-brand.' },
  { id: 'q27', order: 27, module: 4, text: "In the D.A.T.A. framework, what happens during the 'A' (Analyse) phase?", options: ['Entering manual ledger lines', 'Prompting AI with cleaned data to uncover trends and anomalies', 'Approving balance sheets without checks', 'Archiving paper records'], correct: 1, rationale: 'Cleaned data is analyzed via AI prompts to spot trends, outliers, and insights.' },
  { id: 'q28', order: 28, module: 4, text: "What role does 'Human-in-the-Loop' (HITL) play in automated AI workflows?", options: ['Eliminates human operational reviews', 'Serves as mandatory review checkpoints for approvals and escalations', 'Replaces AI for all numerical tasks', 'Monitors physical cables only'], correct: 1, rationale: 'Humans manage oversight, exceptions, and high-stakes approvals in automated workflows.' },
  { id: 'q29', order: 29, module: 4, text: 'What is the best practice for handling confidential numbers when drafting reports with public AI?', options: ['Upload full client financial statements', 'Use placeholders (e.g., [Amount A]) and add real numbers back locally', 'Convert numbers into Roman numerals', 'Multiply all figures by 10'], correct: 1, rationale: 'Placeholder abstraction protects sensitive values until final local editing.' },
  { id: 'q30', order: 30, module: 4, text: 'What mandatory step must precede final distribution of AI-generated content?', options: ['Automatic distribution without checks', 'Human verification for factual accuracy, policies, and sign-off', 'Crowdsourcing feedback on social media', 'Deleting source files'], correct: 1, rationale: 'Professional human sign-off is required to verify facts, compliance, and quality.' },
];

export const QUESTION_BANK: BankQuestion[] = RAW.map((q) => ({ ...q, moduleTitle: MODULE_TITLES[q.module] }));

export const MODULE_TITLES_MAP = MODULE_TITLES;
