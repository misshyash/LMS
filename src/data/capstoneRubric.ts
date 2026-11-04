// CAIWP Group Capstone rubric — transcribed from the
// "CAIWP Day 5 Marking Scheme" (Group Capstone + Theory Exam).
//
// Raw score: 100 marks, group assessment, final contribution 60 marks.
// Each sub-item is awarded from 0 to its maximum in 0.5-mark steps.

export interface RubricItem {
  id: string;
  label: string;
  evidence: string;
  max: number;
}

/**
 * Free-mark sub-items: every team is automatically awarded full marks and
 * judges do not score them. Per the coach's instruction, "AI workflow
 * evidence" (criterion 2) is a free mark. Edit this list to change it.
 */
export const FREE_MARK_ITEM_IDS: string[] = ['c2_workflow'];

export const isFreeMark = (itemId: string) => FREE_MARK_ITEM_IDS.includes(itemId);

export interface RubricCriterion {
  id: number;
  title: string;
  max: number;
  items: RubricItem[];
}

export const CAPSTONE_RUBRIC: RubricCriterion[] = [
  {
    id: 1,
    title: 'Problem, objectives & solution',
    max: 15,
    items: [
      { id: 'c1_problem', label: 'Problem and audience', evidence: 'Clearly defines the problem, intended users and why it matters.', max: 5 },
      { id: 'c1_objectives', label: 'Objectives and success', evidence: 'States specific objectives and measurable success indicators.', max: 5 },
      { id: 'c1_solution', label: 'Proposed solution and value', evidence: 'Explains the solution, differentiation, benefits and intended human impact.', max: 5 },
    ],
  },
  {
    id: 2,
    title: 'Research & responsible AI use',
    max: 10,
    items: [
      { id: 'c2_evidence', label: 'Evidence and accuracy', evidence: 'Uses relevant credible sources; checks key facts, dates and assumptions.', max: 4 },
      { id: 'c2_workflow', label: 'AI workflow evidence', evidence: 'Names tools; shows prompts, outputs and meaningful human revisions.', max: 3 },
      { id: 'c2_responsible', label: 'Responsible use', evidence: 'Explains limitations, attribution and privacy safeguards; labels estimates and synthetic data.', max: 3 },
    ],
  },
  {
    id: 3,
    title: 'Implementation, resources & budget',
    max: 15,
    items: [
      { id: 'c3_plan', label: 'Delivery plan', evidence: 'Realistic phases, timeline, owners and dependencies.', max: 5 },
      { id: 'c3_cost', label: 'Cost and resources', evidence: 'Itemised costs, assumptions and totals reconcile; includes people, tools and other resources.', max: 5 },
      { id: 'c3_feasibility', label: 'Feasibility and value', evidence: 'Justifies choices and expected value; considers adoption and maintenance.', max: 5 },
    ],
  },
  {
    id: 4,
    title: 'Experience, process & outcomes',
    max: 10,
    items: [
      { id: 'c4_journey', label: 'User or process journey', evidence: 'Clear end-to-end journey, workflow, programme or service design.', max: 4 },
      { id: 'c4_activities', label: 'Activities and outputs', evidence: 'Demonstrates relevant tasks, activities or deliverables linked to objectives.', max: 3 },
      { id: 'c4_measurement', label: 'Measurement and inclusion', evidence: 'Explains how outcomes will be measured and how different users can participate.', max: 3 },
    ],
  },
  {
    id: 5,
    title: 'Risk management & challenge response',
    max: 10,
    items: [
      { id: 'c5_risks', label: 'Risks and safeguards', evidence: 'Identifies relevant operational, safety, data, ethical or quality risks with mitigations.', max: 4 },
      { id: 'c5_change', label: 'Change response', evidence: 'Responds to the facilitator challenge with specific feasible changes and explains trade-offs.', max: 4 },
      { id: 'c5_essentials', label: 'Protected essentials', evidence: 'Retains critical outcomes and safeguards; states contingency and escalation arrangements.', max: 2 },
    ],
  },
  {
    id: 6,
    title: 'Slides, structure & visual communication',
    max: 10,
    items: [
      { id: 'c6_content', label: 'Complete slide content', evidence: 'Covers the checklist in a logical narrative.', max: 4 },
      { id: 'c6_readability', label: 'Readability and consistency', evidence: 'Legible text, clear layout, consistent branding and correct spelling.', max: 3 },
      { id: 'c6_visual', label: 'Useful visual', evidence: 'Includes a relevant infographic, mindmap, process map or other explanatory visual.', max: 3 },
    ],
  },
  {
    id: 7,
    title: 'Video deliverable',
    max: 10,
    items: [
      { id: 'c7_message', label: 'Message and storytelling', evidence: 'Clear purpose, audience, message and call to action or takeaway.', max: 3 },
      { id: 'c7_relevance', label: 'Relevance and coherence', evidence: 'Shows the proposed idea or outcome through a coherent scene sequence.', max: 3 },
      { id: 'c7_production', label: 'Production quality', evidence: 'Readable captions/text, intelligible audio where used and appropriate pacing.', max: 2 },
      { id: 'c7_responsible', label: 'Responsible production', evidence: 'Identifies AI-generated content and asset sources; avoids misleading claims or exposed personal data.', max: 2 },
    ],
  },
  {
    id: 8,
    title: 'AI agent / chatbot prototype',
    max: 10,
    items: [
      { id: 'c8_purpose', label: 'Purpose and configuration', evidence: 'Defined user, task and scope; suitable instructions and source/context setup.', max: 3 },
      { id: 'c8_demo', label: 'Working demonstration', evidence: 'Runs a representative user request and shows a useful, relevant response or workflow.', max: 3 },
      { id: 'c8_testing', label: 'Testing and boundaries', evidence: 'Shows normal, out-of-scope and unknown-information tests; handles uncertainty and privacy appropriately.', max: 3 },
      { id: 'c8_access', label: 'Access or reproducibility', evidence: 'Provides an accessible prototype or sufficient configuration and evidence to reproduce it.', max: 1 },
    ],
  },
  {
    id: 9,
    title: 'Presentation, teamwork & questions',
    max: 5,
    items: [
      { id: 'c9_delivery', label: 'Delivery and timing', evidence: 'Clear, engaging delivery within the announced time.', max: 2 },
      { id: 'c9_contribution', label: 'Contribution', evidence: 'All members have a documented role and can explain their own contribution.', max: 1 },
      { id: 'c9_questions', label: 'Questions and reflection', evidence: 'Answers with evidence; acknowledges gaps and explains lessons or next steps.', max: 2 },
    ],
  },
  {
    id: 10,
    title: 'Feedback & improvement',
    max: 5,
    items: [
      { id: 'c10_collection', label: 'Feedback collection', evidence: 'Uses a short form with clear questions and at least 5 audience/user responses.', max: 2 },
      { id: 'c10_interpretation', label: 'Interpretation', evidence: 'Summarises results accurately and identifies useful patterns.', max: 1 },
      { id: 'c10_improvement', label: 'Improvement decision', evidence: 'Explains a specific change made or planned because of feedback.', max: 2 },
    ],
  },
];

export const ALL_RUBRIC_ITEMS: RubricItem[] = CAPSTONE_RUBRIC.flatMap((c) => c.items);

/** Tie-break order for capstone ranking (marking rule 5): criterion 1, then 3, then 8. */
export const TIE_BREAK_CRITERIA = [1, 3, 8];

/** Capstone weighting constants from the marking scheme. */
export const CAPSTONE_RAW_MAX = 100;
export const CAPSTONE_WEIGHT = 0.6; // raw × 0.60 → /60
export const THEORY_CONTRIBUTION_MAX = 40; // (correct ÷ 30) × 40
export const COMBINED_PASS_MARK = 75;

/** "Win the Board – Island Takeover Pitch" scenario preset. */
export const ISLAND_TAKEOVER_TEAMS = [
  { name: 'Group 1', project: 'Langkawi – Luxury + Fun Combo' },
  { name: 'Group 2', project: 'Redang – Crystal Clear Paradise' },
  { name: 'Group 3', project: 'Tioman – Adventure + Exploration' },
  { name: 'Group 4', project: 'Perhentian – Youth Vibes + Budget Friendly' },
];

/**
 * The 7 mandatory pitch elements from the Island Takeover brief. Recorded as
 * evidence only — the marking scheme (rule 3) says missing outputs score 0
 * only in the affected sub-items, with no second blanket penalty.
 */
export const MANDATORY_PITCH_ELEMENTS = [
  { id: 'anthem', label: 'Trip Anthem (song + why it fits)' },
  { id: 'usp', label: 'USP statement backed by a fact' },
  { id: 'interestForm', label: 'Client Interest Form (≥ 5 responses)' },
  { id: 'foods', label: '3 Favourite Local Foods' },
  { id: 'aiChatbot', label: 'AI Chatbot usage evidence' },
  { id: 'thingsToDo', label: '3 Best Things To Do' },
  { id: 'packages', label: '3 Trip Packages (Budget / Standard / Premium)' },
];

/** Submission check from page 4 of the marking scheme. */
export const SUBMISSION_CHECKS = [
  { id: 'deckOpens', label: 'Deck/PDF opens' },
  { id: 'videoPlays', label: 'Video plays' },
  { id: 'prototypeWorks', label: 'Prototype access/demo works' },
  { id: 'aiEvidence', label: 'AI evidence and sources included' },
  { id: 'feedbackSummary', label: 'Feedback summary included' },
  { id: 'budgetChecked', label: 'Budget/totals checked' },
  { id: 'rolesRecorded', label: 'Team roles recorded' },
  { id: 'linksTested', label: 'Links tested' },
];

/** Demonstration & challenge record checkboxes (score sheet). */
export const DEMO_CHECKS = [
  { id: 'chatNormal', label: 'Chatbot test: normal request' },
  { id: 'chatOutOfScope', label: 'Chatbot test: out-of-scope' },
  { id: 'chatUnknown', label: 'Chatbot test: unknown information' },
  { id: 'videoPlayed', label: 'Video played' },
];
