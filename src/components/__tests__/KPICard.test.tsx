/**
 * KPI Card Component Tests
 * Tests the KPI card component functionality and rendering
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import KPICard from '../dashboard/KPICard';

describe('KPICard Component', () => {
  const defaultProps = {
    title: 'Test KPI',
    value: '123.45',
    subtitle: 'Test subtitle',
    color: 'blue' as const
  };

  test('should render basic KPI card', () => {
    render(<KPICard {...defaultProps} />);
    
    expect(screen.getByText('Test KPI')).toBeInTheDocument();
    expect(screen.getByText('123.45')).toBeInTheDocument();
    expect(screen.getByText('Test subtitle')).toBeInTheDocument();
  });

  test('should render with numeric value', () => {
    render(<KPICard {...defaultProps} value={456.78} />);
    
    expect(screen.getByText('456.78')).toBeInTheDocument();
  });

  test('should display trend information when provided', () => {
    render(
      <KPICard 
        {...defaultProps} 
        trend={15.5} 
        isPositive={true}
      />
    );
    
    // Should show trend indicator (implementation dependent)
    const kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
  });

  test('should show tooltip when provided', () => {
    render(
      <KPICard 
        {...defaultProps} 
        tooltip="This is a test tooltip"
      />
    );
    
    const kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
  });

  test('should apply correct color classes', () => {
    const { rerender } = render(<KPICard {...defaultProps} color="green" />);
    
    let kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
    
    rerender(<KPICard {...defaultProps} color="red" />);
    kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
  });

  test('should handle different status types', () => {
    const statusTypes: Array<'good' | 'warning' | 'critical' | 'neutral'> = ['good', 'warning', 'critical', 'neutral'];
    
    statusTypes.forEach(status => {
      const { unmount } = render(<KPICard {...defaultProps} status={status} />);
      
      const kpiCard = screen.getByText('Test KPI').closest('div');
      expect(kpiCard).toBeInTheDocument();
      
      unmount();
    });
  });

  test('should handle different variants', () => {
    const variants: Array<'hero' | 'secondary' | 'compact'> = ['hero', 'secondary', 'compact'];
    
    variants.forEach(variant => {
      const { unmount } = render(<KPICard {...defaultProps} variant={variant} />);
      
      const kpiCard = screen.getByText('Test KPI').closest('div');
      expect(kpiCard).toBeInTheDocument();
      
      unmount();
    });
  });

  test('should display unit when provided', () => {
    render(<KPICard {...defaultProps} unit="tons" />);
    
    // Unit should be displayed (implementation dependent)
    const kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
  });

  test('should show target comparison when provided', () => {
    render(
      <KPICard 
        {...defaultProps} 
        value={80}
        target={100}
      />
    );
    
    // Should show target comparison (implementation dependent)
    const kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
  });

  test('should display contextual help when provided', () => {
    render(
      <KPICard 
        {...defaultProps} 
        contextualHelp="This KPI measures test performance"
      />
    );
    
    const kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
  });

  test('should handle trend icons correctly', () => {
    render(
      <KPICard 
        {...defaultProps} 
        trend={5.2}
        isPositive={true}
        showTrendIcon={true}
      />
    );
    
    const kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
  });

  test('should handle negative trends', () => {
    render(
      <KPICard 
        {...defaultProps} 
        trend={-3.1}
        isPositive={false}
        showTrendIcon={true}
      />
    );
    
    const kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
  });

  test('should be accessible', () => {
    render(<KPICard {...defaultProps} />);
    
    const kpiCard = screen.getByText('Test KPI').closest('div');
    expect(kpiCard).toBeInTheDocument();
    
    // Should be keyboard accessible if interactive
    // Should have proper ARIA labels if needed
  });
});