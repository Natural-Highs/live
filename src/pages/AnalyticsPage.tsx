import DateSelect from '@/components/ui/DateSelect';
import { PageContainer } from '@/components/ui';
import GreenCard from '@/components/ui/GreenCard';
import TitleCard from '@/components/ui/TitleCard';
import React, { useRef, useMemo } from 'react';
import GrnButton from '@/components/ui/GrnButton';
import GreyButton from '@/components/ui/GreyButton';
import Chart from "chart.js/auto";
import { CategoryScale } from "chart.js";
import { useState } from "react";
import { Data } from '@/lib/utils/DummyData.js';
import PieChart from '@/components/dataComponents/PieChart';
import type { ChartData } from 'chart.js';
import jsPDF from 'jspdf';
// I decided to not focus on this unless Avani says it's necessary
//import * as XLSX from 'xlsx';

Chart.register(CategoryScale);

// Helper function to aggregate demographic data across events
const aggregateDemographic = (events: typeof Data, demographicKey: 'age' | 'gender' | 'race' | 'sexualOrientation' | 'zipCode' | 'schoolOrProfession') => {
  const aggregated: Record<string, number> = {};
  
  events.forEach(event => {
    const demographic = event[demographicKey];
    if (demographic && typeof demographic === 'object') {
      Object.entries(demographic).forEach(([key, value]) => {
        aggregated[key] = (aggregated[key] || 0) + (value as number);
      });
    }
  });
  
  // Filter out zero values and convert to arrays
  const labels = Object.keys(aggregated).filter(key => aggregated[key] > 0);
  const values = labels.map(key => aggregated[key]);
  
  return { labels, values };
};

// Generate colors for charts
const generateColors = (labels: string[]) => {
  const colors = [
    "#FFCD40",
    "#7D57BA",
    "#344966",
    "#FFF9C6",
    "#FFACE4"
  ];
  
  // Assign red to "No Response" and blue to "Prefer not to say"
  return labels.map((label, i) => {
    if (label === "No Response") {
      return "#e74c3c"; // Red
    }
    else if (label === "Prefer not to say") {
      return "#3498DB" // Blue
    }
    return colors[i % colors.length];
  });
};

// Helper function to parse date string (MM/DD/YYYY) to Date object
const parseDate = (dateString: string): Date => {
  const [month, day, year] = dateString.split('/').map(Number);
  return new Date(year, month - 1, day);
};

// Helper function to check if a date is within range (inclusive)
const isDateInRange = (date: Date, startDate: Date | undefined, endDate: Date | undefined): boolean => {
  if (!startDate && !endDate) return true;
  if (startDate && endDate) {
    return date >= startDate && date <= endDate;
  }
  if (startDate) {
    return date >= startDate;
  }
  if (endDate) {
    return date <= endDate;
  }
  return true;
};

const AnalyticsPage: React.FC = () => {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<string>("All Events");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  
  // Filter data based on selected event and date range
  const filteredData = useMemo(() => {
    let filtered = Data;
    
    // Filter by event type
    if (selectedEvent !== "All Events") {
      filtered = filtered.filter(event => event.eventType === selectedEvent);
    }
    
    // Filter by date range
    if (startDate || endDate) {
      filtered = filtered.filter(event => {
        const eventDate = parseDate(event.date);
        return isDateInRange(eventDate, startDate, endDate);
      });
    }
    
    return filtered;
  }, [selectedEvent, startDate, endDate]);
  
  // Create chart data for each demographic
  const chartDataSets = useMemo(() => {
    const demographics: Array<{ key: 'age' | 'gender' | 'race' | 'sexualOrientation' | 'zipCode' | 'schoolOrProfession', title: string }> = [
      { key: 'age', title: 'Age' },
      { key: 'gender', title: 'Gender' },
      { key: 'race', title: 'Race' },
      { key: 'sexualOrientation', title: 'Sexual Orientation' },
      { key: 'zipCode', title: 'Zip Code' },
      { key: 'schoolOrProfession', title: 'School/Profession' }
    ];
    
    return demographics.map(({ key, title }) => {
      const { labels, values } = aggregateDemographic(filteredData, key);
      const colors = generateColors(labels);
      
      return {
        title,
        chartData: {
          labels,
          datasets: [
            {
              label: title,
              data: values,
              backgroundColor: colors,
              borderColor: "black",
              borderWidth: 2
            }
          ]
        } as ChartData<'pie', number[], unknown>
      };
    });
  }, [filteredData]);

  // Get all aggregated data for export
  const exportData = useMemo(() => {
    const demographics: Array<{ key: 'age' | 'gender' | 'race' | 'sexualOrientation' | 'zipCode' | 'schoolOrProfession', title: string }> = [
      { key: 'age', title: 'Age' },
      { key: 'gender', title: 'Gender' },
      { key: 'race', title: 'Race' },
      { key: 'sexualOrientation', title: 'Sexual Orientation' },
      { key: 'zipCode', title: 'Zip Code' },
      { key: 'schoolOrProfession', title: 'School/Profession' }
    ];

    return demographics.map(({ key, title }) => {
      const { labels, values } = aggregateDemographic(filteredData, key);
      const total = values.reduce((sum, val) => sum + val, 0);
      
      return {
        category: title,
        data: labels.map((label, i) => ({
          label,
          count: values[i],
          percentage: total > 0 ? ((values[i] / total) * 100).toFixed(1) : '0.0'
        }))
      };
    });
  }, [filteredData]);

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF();
    let yPos = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 20;
    const lineHeight = 7;
    // Total space needed for a new section: 7 + 7 + 7 = 21, with buffer = 25
    const minSectionHeight = 25;
    const minRowHeight = lineHeight; //line height

    // Title
    doc.setFontSize(16);
    doc.text(`Demographics Report - ${selectedEvent}`, margin, yPos);
    yPos += 10;

    doc.setFontSize(10);
    const dateRange = (startDate || endDate) 
      ? `${startDate ? startDate.toLocaleDateString() : ' '} - ${endDate ? endDate.toLocaleDateString() : ' '}`
      : 'All';
    doc.text(`Date Range: ${dateRange}`, margin, yPos);
    yPos += 5;
    doc.text(`Total Events: ${filteredData.length}`, margin, yPos);
    yPos += 7;

    // Helper function to export demographics for a given event data
    const exportDemographics = (events: typeof Data) => {
      const demographics: Array<{ key: 'age' | 'gender' | 'race' | 'sexualOrientation' | 'zipCode' | 'schoolOrProfession', title: string }> = [
        { key: 'age', title: 'Age' },
        { key: 'gender', title: 'Gender' },
        { key: 'race', title: 'Race' },
        { key: 'sexualOrientation', title: 'Sexual Orientation' },
        { key: 'zipCode', title: 'Zip Code' },
        { key: 'schoolOrProfession', title: 'School/Profession' }
      ];

      demographics.forEach(({ key, title }) => {
        const { labels, values } = aggregateDemographic(events, key);
        const total = values.reduce((sum, val) => sum + val, 0);
        
        // Check if we need a new page (need space for header + table header + at least one row)
        if (yPos > pageHeight - minSectionHeight) {
          doc.addPage();
          yPos = 20;
        }

        // Category header
        doc.setFontSize(12);
        doc.text(`${title}`, margin, yPos);
        yPos += 2;
        doc.setLineWidth(0.4);
        doc.line(margin, yPos, margin + 150, yPos);
        yPos += 5;

        if (labels.length === 0) {
          doc.setFontSize(10);
          doc.text('No data', margin, yPos)
        }

        // Table header
        doc.setFontSize(10);
        doc.text('Label', margin, yPos);
        doc.text('Count', margin + 80, yPos);
        doc.text('Percentage', margin + 120, yPos);
        yPos += 2;
        // Draw line beneath header
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, margin + 150, yPos);
        yPos += 5;

        // Data rows
        labels.forEach((label, i) => {
          if (yPos > pageHeight - minRowHeight) {
            doc.addPage();
            yPos = 20;
          }
          const count = values[i];
          const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0.0';
          doc.text(label, margin, yPos);
          doc.text(count.toString(), margin + 80, yPos);
          doc.text(`${percentage}%`, margin + 120, yPos);
          yPos += lineHeight;
        });

        yPos += 5; // Space between categories
      });
    };

    // If "All Events" is selected, separate by event type
    if (selectedEvent === "All Events") {
      // Group events by event type
      const eventsByType = filteredData.reduce((acc, event) => {
        const type = event.eventType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(event);
        return acc;
      }, {} as Record<string, typeof Data>);

      // Export demographics for each event type
      Object.entries(eventsByType).forEach(([eventType, events]) => {
        // Check if we need a new page (need space for header + table header + at least one row)
        if (yPos > pageHeight - minSectionHeight) {
          doc.addPage();
          yPos = 20;
        }

        // Event type header
        yPos += 4
        doc.setFontSize(14);
        doc.text(eventType, margin, yPos);
        yPos += 2;
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, margin + 150, yPos);
        yPos += 6;

        // Links to function for space reasons
        exportDemographics(events);
        yPos += 10; // Extra space between event types
      });
    } else {
      // Single event type - use existing exportData
      exportData.forEach(({ category, data }) => {
        // Check if we need a new page (need space for header + table header + at least one row)
        if (yPos > pageHeight - minSectionHeight) {
          doc.addPage();
          yPos = 20;
        }

        // Category header
        doc.setFontSize(12);
        doc.text(category, margin, yPos);
        yPos += 2;
        doc.setLineWidth(0.5);
        doc.line(margin, yPos, margin + 150, yPos);
        yPos += 6;

        // Table header
        doc.setFontSize(10);
        doc.text('Label', margin, yPos);
        doc.text('Count', margin + 80, yPos);
        doc.text('Percentage', margin + 120, yPos);
        yPos += 2;
        doc.setLineWidth(0.3);
        doc.line(margin, yPos, margin + 150, yPos);
        yPos += 5;

        // Data rows
        data.forEach(({ label, count, percentage }) => {
          if (yPos > pageHeight - minRowHeight) {
            doc.addPage();
            yPos = 20;
          }
          doc.text(label, margin, yPos);
          doc.text(count.toString(), margin + 80, yPos);
          doc.text(`${percentage}%`, margin + 120, yPos);
          yPos += lineHeight;
        });

        yPos += 5; // Space between categories
      });
    }

    // Save the PDF
    const fileName = `${selectedEvent.toLowerCase().replace(' ', '_')}_${dateRange.toLowerCase().replace(' ', '').replace('/', '_').replace('-','_to_')}.pdf`;
    doc.save(fileName);
  };

  /*
  // Export to Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();

    // Create summary sheet
    const summaryData = [
      ['Analytics Report'],
      [],
      ['Event', selectedEvent],
      ['Date Range', `${startDate ? startDate.toLocaleDateString() : 'All'} - ${endDate ? endDate.toLocaleDateString() : 'All'}`],
      ['Total Events', filteredData.length],
      []
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    // Create a sheet for each demographic
    exportData.forEach(({ category, data }) => {
      const sheetData: (string | number)[][] = [
        [category],
        [],
        ['Label', 'Count', 'Percentage']
      ];

      data.forEach(({ label, count, percentage }) => {
        sheetData.push([label, count, `${percentage}%`]);
      });

      const sheet = XLSX.utils.aoa_to_sheet(sheetData);
      XLSX.utils.book_append_sheet(workbook, sheet, category);
    });

    // Save the Excel file
    const fileName = `analytics-report-${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };
  */

  return (
    <PageContainer>
      <TitleCard><h1>View Analytics</h1></TitleCard>
      <GreenCard className="gap-3">
        <div>
          <p className="text-[1.2rem] font-inria">Event</p>
          <fieldset className="fieldset">
            <select 
              value={selectedEvent} 
              onChange={(e) => setSelectedEvent(e.target.value)}
              className="select w-full max-w-none text-[1.2rem] font-inria"
            >
              <option className="font-inria">All Events</option>
              <option className="font-inria">Community Presentation</option>
              <option className="font-inria">Student Presentation</option>
              <option className="font-inria">Peer Leader</option>
            </select>
          </fieldset>
        </div>
        <div className="mb-3">
          <p className="text-[1.2rem] font-inria mb-1">Date Range</p>
          <div className="flex flex-row justify-center items-center gap-4">
            <DateSelect value={startDate} onChange={setStartDate}>First Date</DateSelect>
            <p className="text-[1.2rem] font-inria">To</p>
            <DateSelect value={endDate} onChange={setEndDate}>Second Date</DateSelect>
          </div>
        </div>
        {/* Modal UI */}
        <GrnButton onClick={() => dialogRef.current?.showModal()}>View Data</GrnButton>
        <dialog ref={dialogRef} id="data_modal" className="modal modal-bottom sm:modal-middle">
          <div className="modal-box max-w-6xl max-h-[90vh] overflow-y-auto flex flex-col justify-centerr">
            <h2 className="font-bold font-lisu text-[2rem] mb-4">{selectedEvent}</h2>
            <p className="text-[1.2rem] font-inria mb-1">
              Date Range: {(startDate || endDate) 
                ? `${startDate ? startDate.toLocaleDateString() : ' '} - ${endDate ? endDate.toLocaleDateString() : ' '}`
                : 'All'}
            </p>
          <p className="text-[1.2rem] font-inria mb-1">Total Events: {filteredData.length}</p>
            <div className="modal-action">
              <form method="dialog">
                <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
              </form>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
              {chartDataSets.map(({ title, chartData }, index) => (
                <PieChart key={index} chartData={chartData} title={title} />
              ))}
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
        <GreyButton onClick={exportToPDF}>Export PDF</GreyButton>
        {/* <GreyButton onClick={exportToExcel}>Export Excel</GreyButton> */}
      </GreenCard>
    </PageContainer>
  );
};

export default AnalyticsPage;