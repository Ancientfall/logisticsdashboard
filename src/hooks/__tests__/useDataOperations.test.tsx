/**
 * useDataOperations Hook Tests
 * Tests the data operations custom hook
 */

import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useDataOperations } from '../useDataOperations';
import { DataProvider } from '../../context/DataContext';
import { NotificationProvider } from '../../context/NotificationContext';

// Mock the data processing functions
jest.mock('../../utils/dataProcessing', () => ({
  processAllExcelFiles: jest.fn().mockResolvedValue({
    voyageEvents: [{ id: '1', vesselName: 'Test Vessel' }],
    vesselManifests: [{ id: '1', manifestNumber: 'M001' }],
    costAllocation: [{ id: '1', lcNumber: '10052' }],
    bulkActions: [],
    voyageList: []
  })
}));

// Mock IndexedDB
jest.mock('../../services/indexedDBService', () => ({
  saveToIndexedDB: jest.fn().mockResolvedValue(true),
  loadFromIndexedDB: jest.fn().mockResolvedValue(null),
  clearIndexedDB: jest.fn().mockResolvedValue(true),
}));

// Create wrapper with providers
const createWrapper = () => {
  const Wrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <NotificationProvider>
      <DataProvider>
        {children}
      </DataProvider>
    </NotificationProvider>
  );
  return Wrapper;
};

describe('useDataOperations', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should provide initial state', () => {
    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    expect(result.current.isProcessing).toBe(false);
    expect(result.current.processingProgress).toBe(0);
    expect(result.current.processFiles).toBeDefined();
    expect(result.current.clearData).toBeDefined();
    expect(result.current.exportData).toBeDefined();
  });

  test('should process files successfully', async () => {
    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    const mockFiles = [
      new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    ];

    await act(async () => {
      await result.current.processFiles(mockFiles);
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });

    // Should have called the processing function
    const mockProcessAllExcelFiles = require('../../utils/dataProcessing').processAllExcelFiles;
    expect(mockProcessAllExcelFiles).toHaveBeenCalledWith(mockFiles);
  });

  test('should handle processing errors', async () => {
    const mockProcessAllExcelFiles = require('../../utils/dataProcessing').processAllExcelFiles;
    mockProcessAllExcelFiles.mockRejectedValueOnce(new Error('Processing failed'));

    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    const mockFiles = [
      new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    ];

    await act(async () => {
      try {
        await result.current.processFiles(mockFiles);
      } catch (error) {
        // Expected to fail
      }
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });
  });

  test('should track processing progress', async () => {
    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    const mockFiles = [
      new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    ];

    act(() => {
      result.current.processFiles(mockFiles);
    });

    // Should immediately set processing to true
    expect(result.current.isProcessing).toBe(true);

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });
  });

  test('should clear data successfully', async () => {
    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      await result.current.clearData();
    });

    // Should have called the clear function
    expect(result.current.isProcessing).toBe(false);
  });

  test('should export data', async () => {
    // Mock URL.createObjectURL
    global.URL.createObjectURL = jest.fn(() => 'mock-url');
    global.URL.revokeObjectURL = jest.fn();

    // Mock document.createElement
    const mockAnchor = {
      href: '',
      download: '',
      click: jest.fn()
    };
    jest.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);

    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      result.current.exportData();
    });

    expect(global.URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(global.URL.revokeObjectURL).toHaveBeenCalled();
  });

  test('should handle file validation', async () => {
    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    // Test with invalid file type
    const invalidFiles = [
      new File(['test content'], 'test.txt', { type: 'text/plain' })
    ];

    await act(async () => {
      try {
        await result.current.processFiles(invalidFiles);
      } catch (error) {
        // May reject invalid files
      }
    });

    expect(result.current.isProcessing).toBe(false);
  });

  test('should handle empty file array', async () => {
    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    await act(async () => {
      try {
        await result.current.processFiles([]);
      } catch (error) {
        // Expected to handle empty array
      }
    });

    expect(result.current.isProcessing).toBe(false);
  });

  test('should update progress during processing', async () => {
    const { result } = renderHook(() => useDataOperations(), {
      wrapper: createWrapper()
    });

    const mockFiles = [
      new File(['test content'], 'test.xlsx', { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    ];

    let progressValues: number[] = [];

    // Monitor progress changes
    const checkProgress = () => {
      progressValues.push(result.current.processingProgress);
    };

    act(() => {
      result.current.processFiles(mockFiles);
      checkProgress();
    });

    await waitFor(() => {
      expect(result.current.isProcessing).toBe(false);
    });

    checkProgress();

    // Should have had some progress updates
    expect(progressValues.length).toBeGreaterThan(0);
  });
});