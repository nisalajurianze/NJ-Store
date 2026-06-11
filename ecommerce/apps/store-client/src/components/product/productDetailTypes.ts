export interface ReviewFormState {
  rating: number;
  title: string;
  comment: string;
}

export interface QuestionFormState {
  name: string;
  email: string;
  message: string;
}

export interface StockAlertFormState {
  name: string;
  email: string;
}

export type ReviewSortOption = 'helpful' | 'recent';
