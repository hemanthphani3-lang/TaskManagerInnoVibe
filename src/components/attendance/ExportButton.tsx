"use client";

import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

interface ExportButtonProps {
  records: any[];
  summary: {
    totalStrength: number;
    presentCount: number;
    absentCount: number;
    lateCount: number;
  };
  dateRange: {
    startDate: string;
    endDate: string;
  };
  selectedDate: string;
}

export default function ExportButton({ records, summary, dateRange, selectedDate }: ExportButtonProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const formatFilename = (type: string) => {
    return `Attendance_Report_${dateRange.startDate}_to_${dateRange.endDate}.${type}`;
  };

  const handleExportExcel = () => {
    setDropdownOpen(false);

    // 1. Prepare data for Excel
    const excelData = records.map((r, idx) => ({
      "S.No": idx + 1,
      "Employee Name": r.name,
      "Role": r.role,
      "Department": r.departmentName,
      [`Status (${selectedDate})`]: r.status,
      "First Check-in": r.firstCheckIn || "N/A",
      "Last Check-out": r.lastCheckOut || "N/A",
      "Attendance % (Period)": `${r.attendancePercentage}%`
    }));

    const summaryData = [
      { "Metric": "Report Start Date", "Value": dateRange.startDate },
      { "Metric": "Report End Date", "Value": dateRange.endDate },
      { "Metric": "Selected Date Summary", "Value": selectedDate },
      { "Metric": "Total Strength", "Value": summary.totalStrength },
      { "Metric": "Present Count", "Value": summary.presentCount },
      { "Metric": "Late Count", "Value": summary.lateCount },
      { "Metric": "Absent Count", "Value": summary.absentCount }
    ];

    // 2. Create workbook and worksheets
    const wb = XLSX.utils.book_new();
    const wsDetails = XLSX.utils.json_to_sheet(excelData);
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);

    XLSX.utils.book_append_sheet(wb, wsSummary, "Summary");
    XLSX.utils.book_append_sheet(wb, wsDetails, "Attendance Details");

    // 3. Trigger download
    XLSX.writeFile(wb, formatFilename("xlsx"));
  };

  const handleExportPDF = () => {
    setDropdownOpen(false);

    const doc = new jsPDF();

    // 1. Title & Branding
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(79, 70, 229); // Indigo 600
    doc.text("INNOVIBE TMS", 14, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128); // Gray 500
    doc.text("Attendance Management & Work Session System", 14, 25);

    // 2. Metadata Info
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(31, 41, 55); // Gray 800
    doc.text("ATTENDANCE REPORT", 14, 38);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Report Period: ${dateRange.startDate} to ${dateRange.endDate}`, 14, 44);
    doc.text(`Selected Tracking Date: ${selectedDate}`, 14, 49);
    doc.text(`Generated On: ${new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' })} IST`, 14, 54);

    // 3. Stats Box (drawn using rect)
    doc.setFillColor(249, 250, 251); // Gray 50
    doc.rect(14, 60, 182, 22, "F");
    doc.setDrawColor(229, 231, 235); // Gray 200
    doc.rect(14, 60, 182, 22, "D");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(31, 41, 55);
    doc.text("Total Strength", 20, 68);
    doc.text("Present / Late", 70, 68);
    doc.text("Absent", 130, 68);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(79, 70, 229);
    doc.text(String(summary.totalStrength), 20, 75);
    doc.text(`${summary.presentCount} (${summary.lateCount} Late)`, 70, 75);
    doc.setTextColor(239, 68, 68); // Red
    doc.text(String(summary.absentCount), 130, 75);

    // 4. Detailed Table
    const tableHeaders = [["S.No", "Name", "Role", "Department", `Status (${selectedDate})`, "First Check-in", "Last Check-out", "Attendance %"]];
    const tableRows = records.map((r, idx) => [
      idx + 1,
      r.name,
      r.role,
      r.departmentName,
      r.status,
      r.firstCheckIn || "N/A",
      r.lastCheckOut || "N/A",
      `${r.attendancePercentage}%`
    ]);

    autoTable(doc, {
      head: tableHeaders,
      body: tableRows,
      startY: 90,
      theme: 'striped',
      headStyles: { fillColor: [79, 70, 229] }, // Indigo 600
      styles: { fontSize: 8.5, cellPadding: 2.5 },
      columnStyles: {
        0: { cellWidth: 10 },
        4: { fontStyle: 'bold' }
      }
    });

    // 5. Trigger download
    doc.save(formatFilename("pdf"));
  };

  return (
    <div className="relative inline-block text-left">
      <div>
        <button
          type="button"
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="inline-flex items-center justify-center w-full rounded-xl border border-gray-200 shadow-sm px-4 py-2.5 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-all duration-200"
          id="export-menu-button"
          aria-expanded="true"
          aria-haspopup="true"
        >
          <Download className="w-4 h-4 mr-2 text-gray-500" />
          Export Attendance
          <ChevronDown className="w-4 h-4 ml-2 -mr-1 text-gray-400" />
        </button>
      </div>

      {dropdownOpen && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setDropdownOpen(false)}
          />
          <div
            className="origin-top-left absolute left-0 mt-2 w-48 rounded-xl shadow-xl bg-white ring-1 ring-black ring-opacity-5 z-40 focus:outline-none border border-gray-100 overflow-hidden"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="export-menu-button"
          >
            <div className="py-1" role="none">
              <button
                onClick={handleExportExcel}
                className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                role="menuitem"
              >
                <FileSpreadsheet className="w-4.5 h-4.5 mr-2.5 text-green-600" />
                Export to Excel
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-indigo-600 transition-colors"
                role="menuitem"
              >
                <FileText className="w-4.5 h-4.5 mr-2.5 text-red-500" />
                Export to PDF
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
