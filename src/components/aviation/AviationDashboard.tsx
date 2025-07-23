import React, { useState } from 'react';
import { Edit3, Eye, Download } from 'lucide-react';

interface AviationData {
  aircraft: string;
  flightsAllocated: number;
  flightsCompleted: number;
  adHocCompleted: number;
  adHocAllocated: number;
  twelveMonthAverage: number;
}

const AviationDashboard: React.FC = () => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [aviationData, setAviationData] = useState<AviationData[]>([
    {
      aircraft: "Argos",
      flightsAllocated: 20,
      flightsCompleted: 13,
      adHocCompleted: 1,
      adHocAllocated: 3,
      twelveMonthAverage: 16
    },
    {
      aircraft: "Atlantis",
      flightsAllocated: 20,
      flightsCompleted: 16,
      adHocCompleted: 0,
      adHocAllocated: 3,
      twelveMonthAverage: 19
    },
    {
      aircraft: "Mad Dog",
      flightsAllocated: 25,
      flightsCompleted: 27,
      adHocCompleted: 2,
      adHocAllocated: 3,
      twelveMonthAverage: 22
    },
    {
      aircraft: "Na Kika",
      flightsAllocated: 20,
      flightsCompleted: 15,
      adHocCompleted: 1,
      adHocAllocated: 3,
      twelveMonthAverage: 16
    },
    {
      aircraft: "ThunderHorse",
      flightsAllocated: 41,
      flightsCompleted: 35,
      adHocCompleted: 1,
      adHocAllocated: 5,
      twelveMonthAverage: 35
    }
  ]);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  });

  const calculateCompletionRate = (completed: number, allocated: number): number => {
    return Math.round((completed / allocated) * 100);
  };

  const calculateCostImpact = (completed: number, allocated: number): number => {
    const difference = allocated - completed;
    return difference * 10000;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.abs(amount));
  };

  const getPerformanceColor = (rate: number): string => {
    if (rate < 100) return "text-green-600 bg-green-50";
    return "text-red-600 bg-red-50";
  };

  const getAdHocPerformanceColor = (actual: number, allocated: number): string => {
    if (actual <= allocated) return "text-green-600 bg-green-50";
    return "text-red-600 bg-red-50";
  };

  const getCostImpactColor = (impact: number): string => {
    if (impact >= 0) return "text-green-700 bg-green-100";
    return "text-red-700 bg-red-100";
  };

  const totalAllocated = aviationData.reduce((sum, item) => sum + item.flightsAllocated, 0);
  const totalCompleted = aviationData.reduce((sum, item) => sum + item.flightsCompleted, 0);
  const totalAdHoc = aviationData.reduce((sum, item) => sum + item.adHocCompleted, 0);
  const totalAdHocAllocated = aviationData.reduce((sum, item) => sum + item.adHocAllocated, 0);
  const overallCompletionRate = calculateCompletionRate(totalCompleted, totalAllocated);

  const rigsWithCostOverage = aviationData.filter(rig => rig.flightsCompleted > rig.flightsAllocated);
  const totalCostImpact = aviationData.reduce((sum, rig) => {
    return sum + calculateCostImpact(rig.flightsCompleted, rig.flightsAllocated);
  }, 0);

  const getTopPerformers = () => {
    return aviationData
      .filter(rig => calculateCostImpact(rig.flightsCompleted, rig.flightsAllocated) > 0)
      .sort((a, b) => calculateCostImpact(b.flightsCompleted, b.flightsAllocated) - calculateCostImpact(a.flightsCompleted, a.flightsAllocated))
      .slice(0, 2);
  };

  const getUnderPerformers = () => {
    return aviationData.filter(rig => rig.flightsCompleted > rig.flightsAllocated);
  };

  const getExcessAdHocRigs = () => {
    return aviationData.filter(rig => rig.adHocCompleted > rig.adHocAllocated);
  };

  const topPerformers = getTopPerformers();
  const underPerformers = getUnderPerformers();
  const excessAdHocRigs = getExcessAdHocRigs();

  const handleDataUpdate = (index: number, field: 'flightsCompleted' | 'adHocCompleted', value: number) => {
    const updatedData = [...aviationData];
    updatedData[index][field] = value;
    setAviationData(updatedData);
  };

  const handlePrint = async () => {
    try {
      // Check if we have the html2canvas library
      const html2canvas = await import('html2canvas');
      
      // Get the dashboard content element
      const element = document.querySelector('.dashboard-content') as HTMLElement;
      if (!element) {
        // Fallback to window.print if element not found
        window.print();
        return;
      }

      // Hide the header for clean capture
      const header = document.querySelector('.print\\:hidden') || 
                    document.querySelector('[class*="print:hidden"]');
      if (header) {
        (header as HTMLElement).style.display = 'none';
      }

      // Calculate dimensions for 16:10 landscape format
      // Standard PowerPoint slide is 10" x 6.25" (16:10 ratio)
      // We'll use high DPI for quality: 1920x1200 pixels
      const targetWidth = 1920;
      const targetHeight = 1200;

      // Configure html2canvas options for landscape 16:10 capture
      const canvas = await html2canvas.default(element, {
        width: targetWidth,
        height: targetHeight,
        useCORS: true,
        allowTaint: false,
        background: '#f8fafc', // Match the background
        x: 0,
        y: 0,
        scrollX: 0,
        scrollY: 0,
        windowWidth: targetWidth,
        windowHeight: targetHeight,
        ignoreElements: (element: any) => {
          // Ignore elements with print:hidden class or navigation elements
          return element.classList?.contains('print:hidden') || 
                 element.closest?.('.print\\:hidden') !== null ||
                 element.tagName === 'HEADER' ||
                 (element.classList?.contains('bg-white') && element.classList?.contains('border-b'));
        },
        onclone: (clonedDoc: any) => {
          // Ensure the cloned document has the right dimensions
          const clonedElement = clonedDoc.querySelector('.dashboard-content') as HTMLElement;
          if (clonedElement) {
            clonedElement.style.width = targetWidth + 'px';
            clonedElement.style.height = targetHeight + 'px';
            clonedElement.style.transform = 'none';
            clonedElement.style.overflow = 'hidden';
          }
        }
      } as any);

      // Create download link
      const link = document.createElement('a');
      link.download = `Aviation-Performance-${currentMonth.replace(' ', '-')}-Landscape.png`;
      link.href = canvas.toDataURL('image/png', 1.0);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Restore header visibility
      if (header) {
        (header as HTMLElement).style.display = '';
      }

      console.log('Screen capture completed in 16:10 landscape format');
      
    } catch (error) {
      console.error('Screen capture failed, falling back to print:', error);
      // Fallback to regular print if screen capture fails
      window.print();
    }
  };

  const toggleMode = () => {
    setIsEditMode(!isEditMode);
  };

  const renderTopPerformerInsight = () => {
    if (topPerformers.length > 0) {
      const names = topPerformers.map(rig => rig.aircraft).join(' and ');
      const impact = topPerformers.length === 1 
        ? ` ${formatCurrency(calculateCostImpact(topPerformers[0].flightsCompleted, topPerformers[0].flightsAllocated))}`
        : ' significant';
      return `${names} delivering${impact} cost avoidance`;
    }
    return 'No facilities currently delivering cost avoidance';
  };

  const renderMiddleInsight = () => {
    if (underPerformers.length > 0) {
      const names = underPerformers.map(rig => rig.aircraft).join(', ');
      return `${names} over allocation - operational review required`;
    }
    if (excessAdHocRigs.length > 0) {
      const names = excessAdHocRigs.map(rig => rig.aircraft).join(', ');
      return `${names} exceeded ad hoc budget - monitor closely`;
    }
    return 'All facilities operating within allocations - excellent performance';
  };

  const getMiddleInsightColor = () => {
    if (underPerformers.length > 0) return "text-red-400";
    if (excessAdHocRigs.length > 0) return "text-yellow-400";
    return "text-green-400";
  };

  if (isEditMode) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Update Aviation Data</h1>
              <p className="text-gray-600 mt-2">Enter completed flights and ad hoc flights for {currentMonth}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={toggleMode}
                className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
              >
                <Eye size={18} />
                View Dashboard
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Month
              </label>
              <input
                type="text"
                value={currentMonth}
                onChange={(e) => setCurrentMonth(e.target.value)}
                className="w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="e.g., June 2025"
              />
            </div>

            <div className="grid gap-6">
              {aviationData.map((facility, index) => (
                <div key={facility.aircraft} className="border border-gray-200 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">{facility.aircraft}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Flights Allocated
                      </label>
                      <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-700">
                        {facility.flightsAllocated}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Flights Completed *
                      </label>
                      <input
                        type="number"
                        value={facility.flightsCompleted}
                        onChange={(e) => handleDataUpdate(index, 'flightsCompleted', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Ad Hoc Allocated
                      </label>
                      <div className="px-3 py-2 bg-gray-100 rounded-md text-gray-700">
                        {facility.adHocAllocated}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        Ad Hoc Completed *
                      </label>
                      <input
                        type="number"
                        value={facility.adHocCompleted}
                        onChange={(e) => handleDataUpdate(index, 'adHocCompleted', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                        min="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Note:</strong> Fields marked with * can be updated. Other values are preset allocations.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border-b shadow-sm p-4 print:hidden">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-900">Aviation Performance Dashboard</h2>
          <div className="flex gap-3">
            <button
              onClick={toggleMode}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Edit3 size={18} />
              Edit Data
            </button>
            <button
              onClick={handlePrint}
              className="flex items-center gap-2 px-4 py-2 bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
            >
              <Download size={18} />
              Export to PowerPoint
            </button>
          </div>
        </div>
      </div>

      <div className="dashboard-content w-full h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col">
        <div className="bg-green-700 text-white py-8 px-12">
          <h1 className="text-4xl font-bold mb-2">{currentMonth} Aviation Performance</h1>
          <p className="text-green-100 text-lg">Aviation Summary - Production Operations</p>
        </div>

        <div className="flex-1 p-12 flex flex-col">
          <div className="grid grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-green-600">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Total Flights</h3>
              <p className="text-3xl font-bold text-slate-800 mt-2">{totalCompleted}</p>
              <p className="text-sm text-slate-500 mt-1">of {totalAllocated} allocated</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Utilization Rate</h3>
              <p className={`text-3xl font-bold mt-2 ${overallCompletionRate < 100 ? 'text-green-600' : 'text-red-600'}`}>
                {overallCompletionRate}%
              </p>
              <p className="text-sm text-slate-500 mt-1">target &lt;100%</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Cost Impact</h3>
              <p className={`text-3xl font-bold mt-2 ${totalCostImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalCostImpact >= 0 ? '+' : ''}{formatCurrency(totalCostImpact)}
              </p>
              <p className="text-sm text-slate-500 mt-1">{totalCostImpact >= 0 ? 'cost avoidance' : 'cost overage'}</p>
            </div>
            
            <div className="bg-white rounded-lg shadow-lg p-6 border-l-4 border-yellow-500">
              <h3 className="text-sm font-semibold text-slate-600 uppercase tracking-wide">Rigs Over Allocation</h3>
              <p className={`text-3xl font-bold mt-2 ${rigsWithCostOverage.length === 0 ? 'text-green-600' : 'text-red-600'}`}>
                {rigsWithCostOverage.length}
              </p>
              <p className="text-sm text-slate-500 mt-1">require attention</p>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden flex-1">
            <div className="bg-slate-100 px-6 py-4 border-b">
              <h2 className="text-xl font-bold text-slate-800">Aircraft Performance Breakdown</h2>
              <p className="text-sm text-slate-600 mt-1">Target: &lt;100% utilization rate • Ad Hoc Allocation: 3 flights/month (5 for ThunderHorse)</p>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Production Facility
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Flights Allocated
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Flights Completed
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Utilization Rate
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Ad Hoc Allocated
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Ad Hoc Completed
                    </th>
                    <th className="px-6 py-4 text-center text-sm font-semibold text-slate-700 uppercase tracking-wide">
                      Cost Impact
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {aviationData.map((aircraft, index) => {
                    const completionRate = calculateCompletionRate(aircraft.flightsCompleted, aircraft.flightsAllocated);
                    const costImpact = calculateCostImpact(aircraft.flightsCompleted, aircraft.flightsAllocated);
                    
                    return (
                      <tr key={aircraft.aircraft} className="hover:bg-slate-50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 text-lg">{aircraft.aircraft}</div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-slate-700 font-medium text-lg">{aircraft.flightsAllocated}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-slate-900 font-bold text-lg">{aircraft.flightsCompleted}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getPerformanceColor(completionRate)}`}>
                            {completionRate}%
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-slate-600 font-medium text-lg">{aircraft.adHocAllocated}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getAdHocPerformanceColor(aircraft.adHocCompleted, aircraft.adHocAllocated)}`}>
                            {aircraft.adHocCompleted}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getCostImpactColor(costImpact)}`}>
                            {costImpact >= 0 ? '+' : ''}{formatCurrency(costImpact)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-6 bg-green-700 text-white rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">Key Insights & Action Items</h3>
            <div className="grid grid-cols-3 gap-6 text-sm">
              <div>
                <span className="text-yellow-400 font-medium">■</span> {renderTopPerformerInsight()}
              </div>
              <div>
                <span className={`${getMiddleInsightColor()} font-medium`}>■</span> {renderMiddleInsight()}
              </div>
              <div>
                <span className={`${totalCostImpact >= 0 ? "text-yellow-400" : "text-red-400"} font-medium`}>■</span> 
                Fleet generating net {totalCostImpact >= 0 ? '+' : ''}{formatCurrency(totalCostImpact)} 
                {totalCostImpact >= 0 ? ' cost avoidance' : ' cost overage'}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
          @media print {
            body { margin: 0; padding: 0; }
            .dashboard-content {
              width: 16in !important;
              height: 10in !important;
              transform-origin: top left;
              transform: scale(0.625);
            }
            @page {
              size: 16in 10in;
              margin: 0;
            }
          }
        `
      }} />
    </div>
  );
};

export default AviationDashboard;