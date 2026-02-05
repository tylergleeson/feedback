export type PoemStatus = 'draft' | 'under_review' | 'revised' | 'accepted';
export type FeedbackStatus = 'in_progress' | 'submitted' | 'processed';

export interface Guide {
  content: string;
  version: number;
}

export interface GuideVersion {
  id: number;
  version: number;
  change_summary: string | null;
  created_at: string;
}

export interface Poem {
  id: number;
  prompt: string;
  content: string;
  guide_version: number;
  status: PoemStatus;
  created_at: string;
}

export interface PoemWithFeedback extends Poem {
  feedback_sessions: FeedbackSession[];
}

export interface InlineComment {
  id: number;
  highlighted_text: string;
  start_offset: number;
  end_offset: number;
  comment: string;
  created_at: string;
}

export interface FeedbackSession {
  id: number;
  poem_id: number;
  overall_feedback: string | null;
  rating: number | null;
  status: FeedbackStatus;
  created_at: string;
  comments: InlineComment[];
}

export interface Revision {
  id: number;
  session_id: number;
  original_poem_id: number;
  revised_poem: string;
  proposed_guide_changes: string | null;
  rationale: string | null;
  poem_accepted: number;
  guide_changes_accepted: number;
  created_at: string;
}
