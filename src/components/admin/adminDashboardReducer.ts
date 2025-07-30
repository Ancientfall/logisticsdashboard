/**
 * Admin Dashboard State Management with useReducer
 * Consolidates multiple useState calls for better performance
 */

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'viewer';
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
}

export interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    byRole: {
      admin: number;
      manager: number;
      viewer: number;
    };
  };
  uploads: {
    total: number;
    recent: number;
  };
  recentUsers: User[];
}

export interface EditForm {
  role: string;
  isActive: boolean;
}

export interface Announcement {
  type: 'dashboard-enhancement';
  title: string;
  message: string;
  priority: 'info' | 'warning' | 'error';
}

export interface AdminDashboardState {
  // Data
  users: User[];
  stats: SystemStats | null;
  
  // Loading states
  isLoading: boolean;
  isUpdating: boolean;
  
  // Filters and pagination
  searchQuery: string;
  roleFilter: string;
  statusFilter: string;
  currentPage: number;
  totalPages: number;
  
  // Modal and form state
  selectedUser: User | null;
  isEditModalOpen: boolean;
  editForm: EditForm;
  
  // UI state
  activeTab: 'users' | 'files' | 'reference';
  announcement: Announcement;
}

export type AdminDashboardAction =
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_UPDATING'; payload: boolean }
  | { type: 'SET_USERS'; payload: User[] }
  | { type: 'SET_STATS'; payload: SystemStats }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_ROLE_FILTER'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'SET_TOTAL_PAGES'; payload: number }
  | { type: 'SET_SELECTED_USER'; payload: User | null }
  | { type: 'SET_EDIT_MODAL_OPEN'; payload: boolean }
  | { type: 'SET_EDIT_FORM'; payload: Partial<EditForm> }
  | { type: 'RESET_EDIT_FORM' }
  | { type: 'SET_ACTIVE_TAB'; payload: 'users' | 'files' | 'reference' }
  | { type: 'SET_ANNOUNCEMENT'; payload: Partial<Announcement> }
  | { type: 'UPDATE_USER'; payload: { userId: string; updates: Partial<User> } }
  | { type: 'RESET_FILTERS' }
  | { type: 'RESET_STATE' };

export const initialAdminDashboardState: AdminDashboardState = {
  users: [],
  stats: null,
  isLoading: true,
  isUpdating: false,
  searchQuery: '',
  roleFilter: '',
  statusFilter: '',
  currentPage: 1,
  totalPages: 1,
  selectedUser: null,
  isEditModalOpen: false,
  editForm: {
    role: '',
    isActive: true
  },
  activeTab: 'users',
  announcement: {
    type: 'dashboard-enhancement',
    title: '',
    message: '',
    priority: 'info'
  }
};

export function adminDashboardReducer(
  state: AdminDashboardState,
  action: AdminDashboardAction
): AdminDashboardState {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
      
    case 'SET_UPDATING':
      return { ...state, isUpdating: action.payload };
      
    case 'SET_USERS':
      return { ...state, users: action.payload, isLoading: false };
      
    case 'SET_STATS':
      return { ...state, stats: action.payload };
      
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload, currentPage: 1 };
      
    case 'SET_ROLE_FILTER':
      return { ...state, roleFilter: action.payload, currentPage: 1 };
      
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload, currentPage: 1 };
      
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
      
    case 'SET_TOTAL_PAGES':
      return { ...state, totalPages: action.payload };
      
    case 'SET_SELECTED_USER':
      return { ...state, selectedUser: action.payload };
      
    case 'SET_EDIT_MODAL_OPEN':
      return { ...state, isEditModalOpen: action.payload };
      
    case 'SET_EDIT_FORM':
      return { 
        ...state, 
        editForm: { ...state.editForm, ...action.payload }
      };
      
    case 'RESET_EDIT_FORM':
      return {
        ...state,
        editForm: initialAdminDashboardState.editForm,
        selectedUser: null,
        isEditModalOpen: false
      };
      
    case 'SET_ACTIVE_TAB':
      return { ...state, activeTab: action.payload };
      
    case 'SET_ANNOUNCEMENT':
      return {
        ...state,
        announcement: { ...state.announcement, ...action.payload }
      };
      
    case 'UPDATE_USER':
      return {
        ...state,
        users: state.users.map(user =>
          user.id === action.payload.userId
            ? { ...user, ...action.payload.updates }
            : user
        ),
        isUpdating: false
      };
      
    case 'RESET_FILTERS':
      return {
        ...state,
        searchQuery: '',
        roleFilter: '',
        statusFilter: '',
        currentPage: 1
      };
      
    case 'RESET_STATE':
      return initialAdminDashboardState;
      
    default:
      return state;
  }
}