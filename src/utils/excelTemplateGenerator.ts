import * as XLSX from 'xlsx';

// Template data structures matching the user's Excel format
interface CostAllocationTemplate {
  'LC Number': string;
  'Description': string;
  'Cost Element': string;
  'Month-Year': string;
  'Mission': string;
  'Project': string;
  'Project Type': string;
  'Date': string;
  'Amount': number;
  'Cost per Hour'?: number;
  'Allocated Days'?: number;
  'Location Reference'?: string;
  'Rig Location'?: string;
  'Rig Type'?: string;
  'Water Depth'?: number;
}

/**
 * Generate a Cost Allocation Excel template with sample data
 */
export const generateCostAllocationTemplate = (): XLSX.WorkBook => {
  // Sample data that matches the user's Excel format
  const sampleData: CostAllocationTemplate[] = [
    {
      'LC Number': '9360',
      'Description': 'Thunder Horse Production',
      'Cost Element': 'Vessel Operations',
      'Month-Year': 'Jan-24',
      'Mission': 'Production',
      'Project': 'Thunder Horse Prod',
      'Project Type': 'Production',
      'Date': '2024-01-15',
      'Amount': 17193,
      'Cost per Hour': 715.54,
      'Allocated Days': 24,
      'Location Reference': 'Thunder Horse',
      'Rig Location': 'Thunder Horse PDQ',
      'Rig Type': 'Semi-submersible',
      'Water Depth': 6050
    },
    {
      'LC Number': '9955',
      'Description': 'Thunder Horse Drilling',
      'Cost Element': 'Drilling Support',
      'Month-Year': 'Jan-24',
      'Mission': 'Drilling',
      'Project': 'Thunder Horse Drilling',
      'Project Type': 'Drilling',
      'Date': '2024-01-20',
      'Amount': 16431,
      'Cost per Hour': 685.46,
      'Allocated Days': 24,
      'Location Reference': 'Thunder Horse',
      'Rig Location': 'Thunder Horse PDQ',
      'Rig Type': 'Semi-submersible',
      'Water Depth': 6050
    },
    {
      'LC Number': '9978',
      'Description': 'Stena Ice Max Operations',
      'Cost Element': 'Vessel Support',
      'Month-Year': 'Jan-24',
      'Mission': 'Drilling',
      'Project': 'Stena IceMAX',
      'Project Type': 'Drilling',
      'Date': '2024-01-25',
      'Amount': 13177,
      'Cost per Hour': 549.04,
      'Allocated Days': 24,
      'Location Reference': 'Stena Ice Max',
      'Rig Location': 'Stena IceMAX',
      'Rig Type': 'Drillship',
      'Water Depth': 7200
    },
    {
      'LC Number': '9982',
      'Description': 'Ocean BlackHorn Drilling',
      'Cost Element': 'Drilling Operations',
      'Month-Year': 'Jan-24',
      'Mission': 'Drilling',
      'Project': 'Ocean BlackHorn',
      'Project Type': 'Drilling',
      'Date': '2024-01-30',
      'Amount': 24976,
      'Cost per Hour': 1040.67,
      'Allocated Days': 24,
      'Location Reference': 'Ocean BlackHorn',
      'Rig Location': 'Ocean BlackHorn',
      'Rig Type': 'Semi-submersible',
      'Water Depth': 5800
    },
    {
      'LC Number': '9589',
      'Description': 'Auriga Logistics Support',
      'Cost Element': 'Logistics',
      'Month-Year': 'Jan-24',
      'Mission': 'Logistics',
      'Project': 'Auriga',
      'Project Type': 'Production',
      'Date': '2024-01-10',
      'Amount': 42223,
      'Cost per Hour': 1759.29,
      'Allocated Days': 24,
      'Location Reference': 'Auriga',
      'Rig Location': 'Auriga Platform',
      'Rig Type': 'Production Platform',
      'Water Depth': 4200
    },
    {
      'LC Number': '9987',
      'Description': 'Mad Dog Completion Operations',
      'Cost Element': 'Completion Support',
      'Month-Year': 'Feb-24',
      'Mission': 'Completion',
      'Project': 'Mad Dog Completions',
      'Project Type': 'Completions',
      'Date': '2024-02-15',
      'Amount': 19450,
      'Cost per Hour': 810.42,
      'Allocated Days': 24,
      'Location Reference': 'Mad Dog',
      'Rig Location': 'Mad Dog Platform',
      'Rig Type': 'Semi-submersible',
      'Water Depth': 4500
    },
    {
      'LC Number': '9876',
      'Description': 'Platform Maintenance Support',
      'Cost Element': 'Maintenance Operations',
      'Month-Year': 'Mar-24',
      'Mission': 'Maintenance',
      'Project': 'Platform Maintenance',
      'Project Type': 'Maintenance',
      'Date': '2024-03-10',
      'Amount': 15680,
      'Cost per Hour': 653.33,
      'Allocated Days': 24,
      'Location Reference': 'Atlantis',
      'Rig Location': 'Atlantis PQ',
      'Rig Type': 'Production Platform',
      'Water Depth': 7070
    },
    {
      'LC Number': '9999',
      'Description': 'Joint Venture Operations',
      'Cost Element': 'Shared Operations',
      'Month-Year': 'Apr-24',
      'Mission': 'Joint Operation',
      'Project': 'Operator Sharing',
      'Project Type': 'Operator Sharing',
      'Date': '2024-04-05',
      'Amount': 12350,
      'Cost per Hour': 514.58,
      'Allocated Days': 24,
      'Location Reference': 'Na Kika',
      'Rig Location': 'Na Kika Platform',
      'Rig Type': 'Production Platform',
      'Water Depth': 6340
    }
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(sampleData);

  // Add column widths for better formatting
  const columnWidths = [
    { wch: 12 }, // LC Number
    { wch: 30 }, // Description
    { wch: 20 }, // Cost Element
    { wch: 12 }, // Month-Year
    { wch: 15 }, // Mission
    { wch: 20 }, // Project
    { wch: 15 }, // Project Type
    { wch: 12 }, // Date
    { wch: 15 }, // Amount
    { wch: 15 }, // Cost per Hour
    { wch: 15 }, // Allocated Days
    { wch: 20 }, // Location Reference
    { wch: 20 }, // Rig Location
    { wch: 18 }, // Rig Type
    { wch: 12 }  // Water Depth
  ];
  worksheet['!cols'] = columnWidths;

  // Add the worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Allocation');

  return workbook;
};

/**
 * Generate a blank Cost Allocation template
 */
export const generateBlankCostAllocationTemplate = (): XLSX.WorkBook => {
  // Headers only
  const headers = [
    'LC Number',
    'Description', 
    'Cost Element',
    'Month-Year',
    'Mission',
    'Project',
    'Project Type',
    'Date',
    'Amount',
    'Cost per Hour',
    'Allocated Days',
    'Location Reference',
    'Rig Location',
    'Rig Type',
    'Water Depth'
  ];

  // Create workbook and worksheet with headers only
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet([headers]);

  // Add column widths
  const columnWidths = [
    { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, 
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, 
    { wch: 18 }, { wch: 12 }
  ];
  worksheet['!cols'] = columnWidths;

  // Style the header row
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' } },
    fill: { fgColor: { rgb: '366092' } },
    alignment: { horizontal: 'center' }
  };

  // Apply header styling (simplified for XLSX compatibility)
  for (let i = 0; i < headers.length; i++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: i });
    if (!worksheet[cellRef]) worksheet[cellRef] = { t: 's', v: headers[i] };
    worksheet[cellRef].s = headerStyle;
  }

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Allocation Template');

  return workbook;
};

/**
 * Export workbook as Excel file
 */
export const downloadExcelFile = (workbook: XLSX.WorkBook, filename: string): void => {
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
};

/**
 * Export current cost allocation data to Excel
 */
export const exportCostAllocationData = (costAllocations: any[], filename?: string): void => {
  if (!costAllocations || costAllocations.length === 0) {
    alert('No cost allocation data available to export');
    return;
  }

  // Transform the data to match Excel format
  const excelData = costAllocations.map(allocation => ({
    'LC Number': allocation.lcNumber || '',
    'Description': allocation.description || '',
    'Cost Element': allocation.costElement || '',
    'Month-Year': allocation.monthYear || '',
    'Mission': allocation.mission || '',
    'Project': allocation.department || '',
    'Project Type': allocation.projectType || '',
    'Date': allocation.monthYear ? `${allocation.year || new Date().getFullYear()}-${String(allocation.month || 1).padStart(2, '0')}-01` : '',
    'Amount': allocation.totalCost || 0,
    'Cost per Hour': allocation.costPerHour || 0,
    'Allocated Days': allocation.totalAllocatedDays || 0,
    'Location Reference': allocation.locationReference || '',
    'Rig Location': allocation.rigLocation || '',
    'Rig Type': allocation.rigType || '',
    'Water Depth': allocation.waterDepth || 0
  }));

  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.json_to_sheet(excelData);

  // Add column widths
  const columnWidths = [
    { wch: 12 }, { wch: 30 }, { wch: 20 }, { wch: 12 }, { wch: 15 }, { wch: 20 }, 
    { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }, { wch: 20 }, 
    { wch: 18 }, { wch: 12 }
  ];
  worksheet['!cols'] = columnWidths;

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Cost Allocation Data');

  const exportFilename = filename || `cost-allocation-export-${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadExcelFile(workbook, exportFilename);
};

/**
 * Generate cost allocation summary report
 */
export const generateCostAllocationSummary = (costAllocations: any[]): XLSX.WorkBook => {
  // Summary by Department
  const departmentSummary = costAllocations.reduce((acc, allocation) => {
    const dept = allocation.department || 'Unknown';
    if (!acc[dept]) {
      acc[dept] = {
        'Department': dept,
        'Total Cost': 0,
        'Total Days': 0,
        'Avg Cost per Day': 0,
        'Count': 0
      };
    }
    acc[dept]['Total Cost'] += allocation.totalCost || 0;
    acc[dept]['Total Days'] += allocation.totalAllocatedDays || 0;
    acc[dept]['Count'] += 1;
    return acc;
  }, {} as Record<string, any>);

  // Calculate averages
  Object.values(departmentSummary).forEach((summary: any) => {
    summary['Avg Cost per Day'] = summary['Total Days'] > 0 ? summary['Total Cost'] / summary['Total Days'] : 0;
  });

  // Summary by Rig Location
  const rigLocationSummary = costAllocations
    .filter(allocation => allocation.rigLocation)
    .reduce((acc, allocation) => {
      const rig = allocation.rigLocation;
      if (!acc[rig]) {
        acc[rig] = {
          'Rig Location': rig,
          'Rig Type': allocation.rigType || 'Unknown',
          'Water Depth': allocation.waterDepth || 0,
          'Total Cost': 0,
          'Total Days': 0,
          'Avg Cost per Day': 0,
          'Count': 0
        };
      }
      acc[rig]['Total Cost'] += allocation.totalCost || 0;
      acc[rig]['Total Days'] += allocation.totalAllocatedDays || 0;
      acc[rig]['Count'] += 1;
      return acc;
    }, {} as Record<string, any>);

  // Calculate averages for rig locations
  Object.values(rigLocationSummary).forEach((summary: any) => {
    summary['Avg Cost per Day'] = summary['Total Days'] > 0 ? summary['Total Cost'] / summary['Total Days'] : 0;
  });

  // Create workbook with multiple sheets
  const workbook = XLSX.utils.book_new();
  
  // Add Department Summary sheet
  const deptSheet = XLSX.utils.json_to_sheet(Object.values(departmentSummary));
  XLSX.utils.book_append_sheet(workbook, deptSheet, 'Department Summary');
  
  // Add Rig Location Summary sheet
  const rigSheet = XLSX.utils.json_to_sheet(Object.values(rigLocationSummary));
  XLSX.utils.book_append_sheet(workbook, rigSheet, 'Rig Location Summary');

  // Add overall summary
  const overallSummary = [{
    'Metric': 'Total Cost Allocations',
    'Value': costAllocations.length,
    'Unit': 'records'
  }, {
    'Metric': 'Total Cost',
    'Value': costAllocations.reduce((sum, a) => sum + (a.totalCost || 0), 0),
    'Unit': 'USD'
  }, {
    'Metric': 'Total Allocated Days',
    'Value': costAllocations.reduce((sum, a) => sum + (a.totalAllocatedDays || 0), 0),
    'Unit': 'days'
  }, {
    'Metric': 'Average Cost per Day',
    'Value': costAllocations.reduce((sum, a) => sum + (a.totalCost || 0), 0) / Math.max(1, costAllocations.reduce((sum, a) => sum + (a.totalAllocatedDays || 0), 0)),
    'Unit': 'USD/day'
  }];

  const overallSheet = XLSX.utils.json_to_sheet(overallSummary);
  XLSX.utils.book_append_sheet(workbook, overallSheet, 'Overall Summary');

  return workbook;
}; 