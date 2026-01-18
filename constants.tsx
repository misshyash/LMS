
import { Question } from './types';

export interface Module {
  id: number;
  title: string;
  definition: string;
  points: string[];
  quote: string;
  questions: Question[];
}

export const PRE_POST_QUESTIONS: Question[] = [
  { q: "What is customer service in hospitality?", a: "Creating a positive emotional experience", o: ["Completing tasks according to SOP", "Being polite to guests", "Creating a positive emotional experience", "Solving complaints only"] },
  { q: "“The customer is always right” really means:", a: "Guests’ feelings and experience should be respected", o: ["Guests can behave however they want", "Staff must agree with all demands", "Guests’ feelings and experience should be respected", "Staff should never explain policies"] },
  { q: "Which factor most influences guest satisfaction?", a: "Staff behaviour and attitude", o: ["Facilities", "Price", "Staff behaviour and attitude", "Location"] },
  { q: "Self-awareness in service refers to:", a: "Understanding how your behaviour affects guests", o: ["Knowing SOP well", "Understanding how your behaviour affects guests", "Being confident", "Avoiding difficult guests"] },
  { q: "Which action shows warm communication?", a: "Eye contact, calm tone, attentive posture", o: ["Speaking fast", "Using polite words only", "Eye contact, calm tone, attentive posture", "Giving information and walking away"] },
  { q: "Anticipation in RWG 5A means:", a: "Observing cues and acting before guests ask", o: ["Waiting for complaints", "Guessing guest needs", "Observing cues and acting before guests ask", "Offering compensation early"] },
  { q: "Omotenashi is best described as:", a: "Sincere service from the heart", o: ["Luxury service", "Scripted service", "Sincere service from the heart", "Fast service"] },
  { q: "When a guest is upset, the FIRST step is to:", a: "Acknowledge their feelings", o: ["Explain policy", "Defend yourself", "Acknowledge their feelings", "Call a supervisor"] },
  { q: "Why is consistency important in service?", a: "It builds trust and reliability", o: ["It reduces workload", "Guests expect it", "It builds trust and reliability", "It avoids complaints"] },
  { q: "Excellent service culture means guests feel:", a: "Welcomed, respected, and cared for", o: ["Entertained", "Impressed", "Welcomed, respected, and cared for", "Surprised"] }
];

export const MODULES: Module[] = [
  {
    id: 1,
    title: "Service Purpose",
    definition: "Understanding that every interaction creates an emotional impact on guests.",
    points: ["Knowing why your role matters to the guest journey", "Focusing on how guests feel, not just what you do", "Shifting from task completion to experience creation"],
    quote: "Service is not a task, it is a feeling we give to others.",
    questions: [
      { q: "Service purpose focuses mainly on:", a: "Guest emotions and experience", o: ["SOP compliance", "Guest emotions and experience", "Speed of service", "Job scope"] },
      { q: "Guests remember service because of:", a: "How they feel", o: ["Facilities", "Price", "How they feel", "Location"] },
      { q: "Purpose-based service shifts staff from:", a: "Task-focused to guest-focused", o: ["Task-focused to guest-focused", "Rules to discipline", "Speed to accuracy", "Teamwork to independence"] },
      { q: "A positive first interaction helps guests feel:", a: "Relaxed and welcomed", o: ["Entertained", "Relaxed and welcomed", "Curious", "Surprised"] },
      { q: "The main goal of this module is to:", a: "Create mindset shift", o: ["Test knowledge", "Create mindset shift", "Teach rules", "Enforce discipline"] }
    ]
  },
  {
    id: 2,
    title: "Self-Awareness (Johari Window)",
    definition: "Recognising how your behaviour, tone, and emotions affect others.",
    points: ["Understanding your impact on guests", "Identifying blind spots (what others see but you don't)", "Managing emotions professionally"],
    quote: "Awareness is the first step to a warm heart.",
    questions: [
      { q: "Self-awareness helps staff to:", a: "Understand how behaviour affects others", o: ["Control guests", "Understand SOP", "Understand how behaviour affects others", "Avoid interaction"] },
      { q: "A “blind spot” refers to:", a: "What others see but you don’t", o: ["What you hide", "What others see but you don’t", "What you know well", "What guests complain about"] },
      { q: "Guests react most strongly to:", a: "Tone and body language", o: ["Words only", "Policies", "Tone and body language", "Uniform"] },
      { q: "Feedback should focus on:", a: "Observable behaviour", o: ["Personality", "Attitude", "Observable behaviour", "Seniority"] },
      { q: "Good self-awareness improves:", a: "Emotional control", o: ["Speed", "Emotional control", "Rules", "Authority"] }
    ]
  },
  {
    id: 3,
    title: "Service Habits & Assessment",
    definition: "Small, repeated behaviours that guests experience consistently.",
    points: ["Tone of voice and eye contact", "Consistency across shifts", "Using self-assessment to find gaps"],
    quote: "Excellence is not an act, but a habit.",
    questions: [
      { q: "Service habits are:", a: "Repeated daily behaviours", o: ["One-time actions", "Repeated daily behaviours", "Written SOP", "Complaints"] },
      { q: "Guests judge service mostly by:", a: "Consistency", o: ["Mood", "Price", "Consistency", "Staff seniority"] },
      { q: "Which habit builds trust fastest?", a: "Consistent warmth", o: ["Speed", "Discounts", "Consistent warmth", "Apologies"] },
      { q: "Inconsistent service makes guests feel:", a: "Uncertain", o: ["Comfortable", "Excited", "Uncertain", "Entertained"] },
      { q: "Self-assessment helps staff to:", a: "Identify strengths and gaps", o: ["Blame others", "Identify strengths and gaps", "Avoid feedback", "Change departments"] }
    ]
  },
  {
    id: 4,
    title: "Personal Purpose",
    definition: "The internal motivation that keeps you professional even on hard days.",
    points: ["Connecting role to guest experience", "Building emotional ownership", "Strengthening resilience under stress"],
    quote: "Your 'Why' is the heart of your 'How'.",
    questions: [
      { q: "Personal purpose helps staff to:", a: "Stay professional under stress", o: ["Earn more", "Stay professional under stress", "Avoid guests", "Work faster"] },
      { q: "Purpose connects:", a: "Role to guest experience", o: ["Salary to SOP", "Role to guest experience", "Policy to discipline", "Supervisor to staff"] },
      { q: "Guests can sense when staff are:", a: "Sincere and motivated", o: ["Experienced", "Sincere and motivated", "New", "Busy"] },
      { q: "Purpose-based staff usually show:", a: "Emotional ownership", o: ["More complaints", "Emotional ownership", "Less responsibility", "Strict behaviour"] },
      { q: "Purpose statements help staff to:", a: "Connect emotionally to service", o: ["Memorise SOP", "Connect emotionally to service", "Follow orders", "Avoid mistakes"] }
    ]
  },
  {
    id: 5,
    title: "RWG 8 Promises",
    definition: "Behaviour-based commitments that guide how staff act and communicate.",
    points: ["Setting clear service expectations", "Building trust and reliability", "Delivering consistently"],
    quote: "A promise kept is a guest for life.",
    questions: [
      { q: "RWG 8 Promises represent:", a: "Guest expectations", o: ["Marketing slogans", "Guest expectations", "Staff benefits", "Rules"] },
      { q: "Service promises must be:", a: "Delivered consistently", o: ["Memorised", "Displayed", "Delivered consistently", "Explained"] },
      { q: "When promises are broken, guests feel:", a: "Disappointed", o: ["Excited", "Disappointed", "Entertained", "Neutral"] },
      { q: "Consistency means:", a: "Same service across all shifts", o: ["Same service across all shifts", "Same staff daily", "Fast service only", "No complaints"] },
      { q: "Translating promises into actions helps to:", a: "Build guest trust", o: ["Reduce training", "Build guest trust", "Increase workload", "Avoid SOP"] }
    ]
  },
  {
    id: 6,
    title: "RWG 5A Standards",
    definition: "Defining how service feels through five specific behaviours.",
    points: ["Appearance & Attentiveness", "Anticipation (acting early)", "Action & Assurance"],
    quote: "The 5A's turn a transaction into a memory.",
    questions: [
      { q: "The 5A Standards focus on:", a: "Guest feelings", o: ["Rules", "Guest feelings", "Documentation", "KPIs"] },
      { q: "Anticipation means:", a: "Observing cues and acting early", o: ["Guessing needs", "Waiting for complaints", "Observing cues and acting early", "Offering discounts"] },
      { q: "Assurance makes guests feel:", a: "Confident and safe", o: ["Entertained", "Confident and safe", "Rushed", "Curious"] },
      { q: "Attentiveness includes:", a: "Listening actively", o: ["Listening actively", "Speaking fast", "Multitasking", "Explaining policy"] },
      { q: "The 5A Standards should become:", a: "Habits", o: ["Posters", "Habits", "Rules", "Scripts"] }
    ]
  },
  {
    id: 7,
    title: "Omotenashi",
    definition: "Sincere hospitality from the heart, where staff act proactively.",
    points: ["Genuine care without being asked", "Small actions with big emotional impact", "Thoughtful anticipation"],
    quote: "Service from the heart needs no words.",
    questions: [
      { q: "Omotenashi focuses on:", a: "Sincere care", o: ["Luxury", "Speed", "Sincere care", "Scripts"] },
      { q: "Anticipation helps to:", a: "Reduce complaints", o: ["Reduce complaints", "Increase workload", "Slow service", "Avoid interaction"] },
      { q: "Proactive service happens:", a: "Before guests ask", o: ["After complaints", "Before guests ask", "During peak hours", "When instructed"] },
      { q: "Signature moments are:", a: "Small meaningful actions", o: ["Expensive gestures", "Small meaningful actions", "SOP steps", "Rewards"] },
      { q: "Omotenashi requires staff to:", a: "Observe carefully", o: ["React quickly", "Observe carefully", "Follow scripts", "Offer compensation"] }
    ]
  },
  {
    id: 8,
    title: "Communication",
    definition: "Combining words, tone, and body language to resolve issues and build loyalty.",
    points: ["De-escalation of conflict", "Acknowledging emotions first", "30-day action plans for change"],
    quote: "Listen with your heart, respond with your soul.",
    questions: [
      { q: "Warm communication includes:", a: "Words, tone, and body language", o: ["Words only", "Tone only", "Words, tone, and body language", "Speed"] },
      { q: "When a guest is upset, the first step is to:", a: "Acknowledge emotions", o: ["Explain policy", "Defend yourself", "Acknowledge emotions", "Escalate"] },
      { q: "Good problem-solving turns complaints into:", a: "Loyalty-building moments", o: ["Reports", "Escalations", "Loyalty-building moments", "Discipline cases"] },
      { q: "Emotional safety allows staff to:", a: "Speak openly", o: ["Speak openly", "Stay silent", "Avoid teamwork", "Follow orders only"] },
      { q: "The 30-day action plan exists to:", a: "Build behaviour change over time", o: ["Achieve perfection", "Build behaviour change over time", "Reduce training hours", "Avoid accountability"] }
    ]
  }
];

export const QUESTIONS = PRE_POST_QUESTIONS;

export const COLORS = {
  primary: '#66c2bd',
  accent: '#f04434',
  secondary: '#264653',
  danger: '#ef4444'
};
