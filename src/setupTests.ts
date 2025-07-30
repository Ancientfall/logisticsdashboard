// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock IndexedDB for tests
const mockIDBDatabase = {
  transaction: jest.fn(() => ({
    objectStore: jest.fn(() => ({
      add: jest.fn(),
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      getAll: jest.fn(() => Promise.resolve([])),
      clear: jest.fn()
    }))
  }))
};

const mockIDB = {
  open: jest.fn(() => Promise.resolve(mockIDBDatabase)),
  deleteDatabase: jest.fn(() => Promise.resolve())
};

// @ts-ignore
global.indexedDB = mockIDB;

// Mock window.ResizeObserver for NextUI components
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock window.matchMedia for responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock framer-motion for animation components
jest.mock('framer-motion', () => ({
  motion: {
    div: 'div',
    span: 'span',
    button: 'button',
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => children,
}));

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Activity: () => 'Activity',
  AlertTriangle: () => 'AlertTriangle',
  BarChart3: () => 'BarChart3',
  CheckCircle: () => 'CheckCircle',
  Clock: () => 'Clock',
  Download: () => 'Download',
  FileText: () => 'FileText',
  HelpCircle: () => 'HelpCircle',
  Home: () => 'Home',
  Info: () => 'Info',
  Ship: () => 'Ship',
  TrendingUp: () => 'TrendingUp',
  TrendingDown: () => 'TrendingDown',
  Upload: () => 'Upload',
  Users: () => 'Users',
  Zap: () => 'Zap',
}));

// Increase timeout for tests that might involve data processing
jest.setTimeout(10000);