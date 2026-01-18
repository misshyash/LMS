
export interface Question {
  q: string;
  a: string;
  o: string[];
}

export interface Participant {
  id: string;
  name: string;
  dept: string;
  journey: string;
  preScore: number | null;
  postScore: number | null;
  status: 'In Progress' | 'Certified';
}

export type ViewType = 'login' | 'hr' | 'profile' | 'dashboard' | 'quiz' | 'certificate' | 'modular-menu' | 'module-lesson';
