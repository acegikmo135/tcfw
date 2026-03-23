export interface Transaction {
  id: string;
  title: string;
  amount: number;
  type: 'income' | 'expense';
  category: string;
  date: string;
  status: 'completed' | 'pending';
  description?: string;
  createdBy?: string;
  creatorUid: string;
}

export interface Notice {
  id: string;
  title: string;
  content: string;
  type: 'info' | 'warning' | 'success';
  date: string;
  author: string;
  authorUid: string;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  icon?: string;
}

export interface Comment {
  id: string;
  targetId: string; // ID of the notice or transaction
  targetType: 'notice' | 'transaction';
  content: string;
  author: string;
  authorUid: string;
  date: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'resident';
  photoURL?: string;
}
