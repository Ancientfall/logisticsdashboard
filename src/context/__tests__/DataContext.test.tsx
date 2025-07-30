/**
 * Data Context Tests
 * Tests the data context provider and hooks
 */

import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import { DataProvider, useData } from '../DataContext';

// Mock IndexedDB operations
jest.mock('../../services/indexedDBService', () => ({
  saveToIndexedDB: jest.fn().mockResolvedValue(true),
  loadFromIndexedDB: jest.fn().mockResolvedValue(null),
  clearIndexedDB: jest.fn().mockResolvedValue(true),
}));

// Test component that uses the data context
const TestComponent: React.FC = () => {
  const {
    voyageEvents,
    vesselManifests,
    costAllocation,
    bulkActions,
    voyageList,
    isDataReady,
    isLoading,
    error,
    setVoyageEvents,
    setVesselManifests,
    clearAllData
  } = useData();

  return (
    <div>
      <div data-testid="voyage-events-count">{voyageEvents.length}</div>
      <div data-testid="vessel-manifests-count">{vesselManifests.length}</div>
      <div data-testid="cost-allocation-count">{costAllocation.length}</div>
      <div data-testid="bulk-actions-count">{bulkActions.length}</div>
      <div data-testid="voyage-list-count">{voyageList.length}</div>
      <div data-testid="is-data-ready">{isDataReady.toString()}</div>
      <div data-testid="is-loading">{isLoading.toString()}</div>
      <div data-testid="error">{error || 'null'}</div>
      
      <button onClick={() => setVoyageEvents([{ id: '1', vesselName: 'Test' } as any])}>
        Set Voyage Events
      </button>
      <button onClick={() => setVesselManifests([{ id: '1', manifestNumber: 'M001' } as any])}>
        Set Manifests
      </button>
      <button onClick={clearAllData}>
        Clear Data
      </button>
    </div>
  );
};

describe('DataContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should provide initial empty state', () => {
    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    expect(screen.getByTestId('voyage-events-count')).toHaveTextContent('0');
    expect(screen.getByTestId('vessel-manifests-count')).toHaveTextContent('0');
    expect(screen.getByTestId('cost-allocation-count')).toHaveTextContent('0');
    expect(screen.getByTestId('bulk-actions-count')).toHaveTextContent('0');
    expect(screen.getByTestId('voyage-list-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-data-ready')).toHaveTextContent('false');
    expect(screen.getByTestId('is-loading')).toHaveTextContent('false');
    expect(screen.getByTestId('error')).toHaveTextContent('null');
  });

  test('should update voyage events state', async () => {
    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    const setVoyageEventsButton = screen.getByText('Set Voyage Events');
    
    await act(async () => {
      setVoyageEventsButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('voyage-events-count')).toHaveTextContent('1');
    });
  });

  test('should update vessel manifests state', async () => {
    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    const setManifestsButton = screen.getByText('Set Manifests');
    
    await act(async () => {
      setManifestsButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('vessel-manifests-count')).toHaveTextContent('1');
    });
  });

  test('should clear all data', async () => {
    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    // First set some data
    const setVoyageEventsButton = screen.getByText('Set Voyage Events');
    const setManifestsButton = screen.getByText('Set Manifests');
    
    await act(async () => {
      setVoyageEventsButton.click();
      setManifestsButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('voyage-events-count')).toHaveTextContent('1');
      expect(screen.getByTestId('vessel-manifests-count')).toHaveTextContent('1');
    });

    // Then clear all data
    const clearDataButton = screen.getByText('Clear Data');
    
    await act(async () => {
      clearDataButton.click();
    });

    await waitFor(() => {
      expect(screen.getByTestId('voyage-events-count')).toHaveTextContent('0');
      expect(screen.getByTestId('vessel-manifests-count')).toHaveTextContent('0');
    });
  });

  test('should calculate isDataReady correctly', async () => {
    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    expect(screen.getByTestId('is-data-ready')).toHaveTextContent('false');

    // Set some data
    const setVoyageEventsButton = screen.getByText('Set Voyage Events');
    const setManifestsButton = screen.getByText('Set Manifests');
    
    await act(async () => {
      setVoyageEventsButton.click();
      setManifestsButton.click();
    });

    await waitFor(() => {
      // isDataReady should be true when we have voyage events and manifests
      expect(screen.getByTestId('is-data-ready')).toHaveTextContent('true');
    });
  });

  test('should handle data loading from IndexedDB on mount', async () => {
    const mockLoadFromIndexedDB = require('../../services/indexedDBService').loadFromIndexedDB;
    mockLoadFromIndexedDB.mockResolvedValueOnce({
      voyageEvents: [{ id: '1', vesselName: 'Loaded Vessel' }],
      vesselManifests: [{ id: '1', manifestNumber: 'M001' }],
      costAllocation: [],
      bulkActions: [],
      voyageList: []
    });

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId('voyage-events-count')).toHaveTextContent('1');
      expect(screen.getByTestId('vessel-manifests-count')).toHaveTextContent('1');
      expect(screen.getByTestId('is-data-ready')).toHaveTextContent('true');
    });
  });

  test('should handle IndexedDB loading errors gracefully', async () => {
    const mockLoadFromIndexedDB = require('../../services/indexedDBService').loadFromIndexedDB;
    mockLoadFromIndexedDB.mockRejectedValueOnce(new Error('IndexedDB error'));

    render(
      <DataProvider>
        <TestComponent />
      </DataProvider>
    );

    // Should still render without crashing
    expect(screen.getByTestId('voyage-events-count')).toHaveTextContent('0');
    expect(screen.getByTestId('is-data-ready')).toHaveTextContent('false');
  });

  test('should throw error when useData is used outside provider', () => {
    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useData must be used within a DataProvider');

    consoleSpy.mockRestore();
  });
});