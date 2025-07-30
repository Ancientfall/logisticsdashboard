/**
 * AccessibleTable - WCAG 2.1 AA Compliant Data Table Component
 * Provides comprehensive accessibility features for tabular data
 */

import React, { useState, useRef, useEffect } from 'react';
import { ChevronUp, ChevronDown, Search, Filter, Download } from 'lucide-react';
import { useKeyboardNavigation, semanticHelpers, ariaBuilder, useAriaLiveRegion } from '../../utils/accessibility';

type SortDirection = 'asc' | 'desc' | 'none';

interface Column {
  key: string;
  header: string;
  sortable?: boolean;
  searchable?: boolean;
  type?: 'text' | 'number' | 'date' | 'currency' | 'percentage';
  formatter?: (value: any) => string;
  description?: string;
  width?: string;
}

interface AccessibleTableProps {
  data: Record<string, any>[];
  columns: Column[];
  caption: string;
  summary?: string;
  sortable?: boolean;
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
  pageSize?: number;
  onRowSelect?: (row: Record<string, any>, index: number) => void;
  onExport?: () => void;
  className?: string;
  emptyStateMessage?: string;
  loading?: boolean;
}

const AccessibleTable: React.FC<AccessibleTableProps> = ({
  data,
  columns,
  caption,
  summary,
  sortable = true,
  searchable = true,
  filterable = false,
  exportable = false,
  pageSize = 10,
  onRowSelect,
  onExport,
  className = '',
  emptyStateMessage = 'No data available',
  loading = false
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>('none');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  const tableRef = useRef<HTMLTableElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { announce } = useAriaLiveRegion();
  
  const tableId = semanticHelpers.generateId('accessible-table');
  const captionId = semanticHelpers.generateId('table-caption');
  const summaryId = semanticHelpers.generateId('table-summary');
  const searchId = semanticHelpers.generateId('table-search');

  // Filter and sort data
  const processedData = React.useMemo(() => {
    let filtered = data;

    // Apply search filter
    if (searchTerm && searchable) {
      const searchableColumns = columns.filter(col => col.searchable !== false);
      filtered = data.filter(row =>
        searchableColumns.some(col =>
          String(row[col.key] || '').toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    // Apply sorting
    if (sortColumn && sortDirection !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortColumn];
        const bVal = b[sortColumn];
        
        const column = columns.find(col => col.key === sortColumn);
        const isNumeric = column?.type === 'number' || column?.type === 'currency' || column?.type === 'percentage';
        
        let comparison = 0;
        if (isNumeric) {
          comparison = (Number(aVal) || 0) - (Number(bVal) || 0);
        } else if (column?.type === 'date') {
          comparison = new Date(aVal).getTime() - new Date(bVal).getTime();
        } else {
          comparison = String(aVal || '').localeCompare(String(bVal || ''));
        }
        
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return filtered;
  }, [data, columns, searchTerm, sortColumn, sortDirection, searchable]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedData = processedData.slice(startIndex, startIndex + pageSize);

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable && !sortable) return;

    let newDirection: SortDirection = 'asc';
    
    if (sortColumn === columnKey) {
      newDirection = sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? 'none' : 'asc';
    }
    
    setSortColumn(newDirection === 'none' ? null : columnKey);
    setSortDirection(newDirection);
    
    const sortLabel = newDirection === 'none' ? 'cleared' : `${newDirection}ending`;
    announce(`Table sorted by ${column?.header} in ${sortLabel} order`);
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    setCurrentPage(1);
    
    if (term) {
      announce(`Filtered table to show ${processedData.length} of ${data.length} rows`);
    } else {
      announce(`Showing all ${data.length} rows`);
    }
  };

  const handleRowSelect = (row: Record<string, any>, index: number) => {
    const globalIndex = startIndex + index;
    const newSelected = new Set(selectedRows);
    
    if (newSelected.has(globalIndex)) {
      newSelected.delete(globalIndex);
    } else {
      newSelected.add(globalIndex);
    }
    
    setSelectedRows(newSelected);
    onRowSelect?.(row, globalIndex);
    
    announce(`Row ${index + 1} ${newSelected.has(globalIndex) ? 'selected' : 'deselected'}`);
  };

  const formatCellValue = (value: any, column: Column): string => {
    if (column.formatter) {
      return column.formatter(value);
    }
    
    if (value == null) return '';
    
    switch (column.type) {
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD'
        }).format(Number(value) || 0);
      case 'percentage':
        return `${(Number(value) || 0).toFixed(1)}%`;
      case 'number':
        return (Number(value) || 0).toLocaleString();
      case 'date':
        return new Date(value).toLocaleDateString();
      default:
        return String(value);
    }
  };

  const getSortAriaLabel = (column: Column): string => {
    if (!column.sortable && !sortable) return '';
    
    if (sortColumn === column.key) {
      return `Sort by ${column.header} ${sortDirection === 'asc' ? 'descending' : 'ascending'}`;
    }
    return `Sort by ${column.header}`;
  };

  const getSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return null;
    
    return sortDirection === 'asc' ? (
      <ChevronUp className="w-4 h-4" aria-hidden="true" />
    ) : (
      <ChevronDown className="w-4 h-4" aria-hidden="true" />
    );
  };

  if (loading) {
    return (
      <div 
        className="flex items-center justify-center p-8"
        role="status"
        aria-live="polite"
        aria-label="Loading table data"
      >
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading data...</span>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow ${className}`}>
      {/* Table Controls */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Search */}
          {searchable && (
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                Search table data
              </label>
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <input
                ref={searchInputRef}
                id={searchId}
                type="text"
                placeholder="Search table..."
                value={searchTerm}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                aria-describedby={`${searchId}-desc`}
              />
              <div id={`${searchId}-desc`} className="sr-only">
                Search across all searchable columns in the table
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2">
            {filterable && (
              <button
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Open table filters"
              >
                <Filter className="w-4 h-4" aria-hidden="true" />
                Filter
              </button>
            )}
            
            {exportable && (
              <button
                onClick={onExport}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                aria-label="Export table data"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                Export
              </button>
            )}
          </div>
        </div>

        {/* Results Summary */}
        <div className="mt-2 text-sm text-gray-600" aria-live="polite">
          Showing {paginatedData.length} of {processedData.length} rows
          {searchTerm && ` (filtered from ${data.length} total)`}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table
          ref={tableRef}
          id={tableId}
          className="min-w-full divide-y divide-gray-200 accessible-table"
          role="table"
          aria-labelledby={captionId}
          aria-describedby={summary ? summaryId : undefined}
          aria-rowcount={processedData.length + 1} // +1 for header
          aria-colcount={columns.length + (onRowSelect ? 1 : 0)}
        >
          {/* Caption */}
          <caption id={captionId} className="sr-only">
            {caption}
          </caption>

          {/* Summary */}
          {summary && (
            <caption id={summaryId} className="sr-only">
              {summary}
            </caption>
          )}

          {/* Header */}
          <thead className="bg-gray-50">
            <tr role="row">
              {onRowSelect && (
                <th
                  scope="col"
                  className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  role="columnheader"
                >
                  <span className="sr-only">Select row</span>
                </th>
              )}
              
              {columns.map((column, index) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider ${
                    (column.sortable || sortable) ? 'cursor-pointer hover:bg-gray-100' : ''
                  }`}
                  style={{ width: column.width }}
                  role="columnheader"
                  aria-colindex={index + 1 + (onRowSelect ? 1 : 0)}
                  aria-sort={
                    sortColumn === column.key
                      ? sortDirection === 'asc'
                        ? 'ascending'
                        : 'descending'
                      : column.sortable || sortable
                      ? 'none'
                      : undefined
                  }
                  onClick={() => handleSort(column.key)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleSort(column.key);
                    }
                  }}
                  tabIndex={(column.sortable || sortable) ? 0 : -1}
                  aria-label={getSortAriaLabel(column)}
                  aria-describedby={column.description ? `${column.key}-desc` : undefined}
                >
                  <div className="flex items-center gap-2">
                    {column.header}
                    {getSortIcon(column.key)}
                  </div>
                  
                  {column.description && (
                    <div id={`${column.key}-desc`} className="sr-only">
                      {column.description}
                    </div>
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="bg-white divide-y divide-gray-200">
            {paginatedData.length === 0 ? (
              <tr role="row">
                <td
                  colSpan={columns.length + (onRowSelect ? 1 : 0)}
                  className="px-6 py-8 text-center text-gray-500"
                  role="cell"
                >
                  {emptyStateMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, rowIndex) => {
                const globalIndex = startIndex + rowIndex;
                const isSelected = selectedRows.has(globalIndex);
                
                return (
                  <tr
                    key={globalIndex}
                    role="row"
                    aria-rowindex={rowIndex + 2} // +2 for header row
                    className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}
                    aria-selected={onRowSelect ? isSelected : undefined}
                  >
                    {onRowSelect && (
                      <td className="w-12 px-4 py-4" role="cell">
                        <button
                          onClick={() => handleRowSelect(row, rowIndex)}
                          className="w-4 h-4 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                          aria-label={`${isSelected ? 'Deselect' : 'Select'} row ${rowIndex + 1}`}
                          aria-pressed={isSelected}
                        >
                          {isSelected && (
                            <span className="block w-2 h-2 bg-blue-600 rounded-sm m-auto" aria-hidden="true" />
                          )}
                        </button>
                      </td>
                    )}
                    
                    {columns.map((column, colIndex) => (
                      <td
                        key={column.key}
                        className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                        role="cell"
                        aria-colindex={colIndex + 1 + (onRowSelect ? 1 : 0)}
                      >
                        {formatCellValue(row[column.key], column)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Page {currentPage} of {totalPages}
            </div>
            
            <nav className="flex items-center gap-2" aria-label="Table pagination">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Go to previous page"
              >
                Previous
              </button>
              
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Go to next page"
              >
                Next
              </button>
            </nav>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccessibleTable;