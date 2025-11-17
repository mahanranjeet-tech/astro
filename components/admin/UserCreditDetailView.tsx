import React, { useState, useMemo } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ArrowLeft, Download, Filter, Calendar, AppWindow, FileText } from 'lucide-react';
import type { UserProfile, AppDefinition, CreditLog } from '../../types.ts';
import { formatTimestamp } from '../../utils/date.ts';

interface UserCreditDetailViewProps {
    user: UserProfile;
    logs: CreditLog[];
    apps: AppDefinition[];
    onBack: () => void;
}

const UserCreditDetailView: React.FC<UserCreditDetailViewProps> = ({ user, logs, apps, onBack }) => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [selectedAppId, setSelectedAppId] = useState('all');

    const filteredLogs = useMemo(() => {
        return logs.filter(log => {
            const logDate = log.timestamp?.toDate();
            if (!logDate) return false;

            const isAppMatch = selectedAppId === 'all' || log.appId === selectedAppId;
            
            const isDateMatch = (() => {
                if (!startDate && !endDate) return true; // Lifetime
                const start = startDate ? new Date(startDate) : null;
                const end = endDate ? new Date(endDate) : null;
                
                if (start) start.setHours(0, 0, 0, 0);
                if (end) end.setHours(23, 59, 59, 999);

                if (start && end) return logDate >= start && logDate <= end;
                if (start) return logDate >= start;
                if (end) return logDate <= end;
                return true;
            })();

            return isAppMatch && isDateMatch;
        });
    }, [logs, startDate, endDate, selectedAppId]);

    const handleDownloadPdf = () => {
        const doc = new jsPDF();
        const tableColumn = ["Date & Time", "Application Name", "Credits Deducted"];
        const tableRows: (string | number)[][] = [];

        filteredLogs.forEach(log => {
            const logData = [
                formatTimestamp(log.timestamp),
                log.appName,
                log.creditsDeducted,
            ];
            tableRows.push(logData);
        });

        // Header
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        doc.setFontSize(20).setFont(undefined, 'bold');
        doc.text("Powerful Tools", pageWidth / 2, 15, { align: 'center' });
        
        doc.setFontSize(12).setFont(undefined, 'normal');
        doc.text(`Credit Usage Report for ${user.name}`, pageWidth / 2, 23, { align: 'center' });
        
        const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: '2-digit' }).replace(/\//g, '-');
        doc.text(currentDate, pageWidth - 15, 15, { align: 'right' });
        
        // Table
        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 35,
            theme: 'striped',
            headStyles: { fillColor: [37, 99, 235] }, // Blue-600
        });

        // Footer
        const footerText = "Contact @ 7891474105";
        doc.setFontSize(10);
        doc.text(footerText, pageWidth / 2, pageHeight - 10, { align: 'center' });

        // Save
        const dateStr = new Date().toISOString().split('T')[0];
        doc.save(`Credit_Report_${user.name.replace(/ /g, '_')}_${dateStr}.pdf`);
    };

    return (
        <div className="space-y-6">
            <button onClick={onBack} className="flex items-center gap-2 text-blue-600 font-semibold hover:underline">
                <ArrowLeft size={18} />
                Back to All Users
            </button>

            <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
                <div className="border-b pb-4 mb-4">
                    <h2 className="text-2xl font-bold text-gray-800">Credit Usage Log</h2>
                    <p className="text-gray-500 mt-1">Showing records for <span className="font-medium text-gray-700">{user.name}</span></p>
                </div>
                
                {/* Filters */}
                <div className="p-4 bg-gray-50 rounded-lg border space-y-4">
                    <div className="flex items-center gap-2 font-semibold text-gray-700">
                        <Filter size={16} />
                        <span>Filter Report</span>
                    </div>
                     <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="relative">
                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                             <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} max={endDate || today} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500 transition"/>
                        </div>
                        <div className="relative">
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min={startDate} max={today} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500 transition"/>
                        </div>
                        <div className="relative">
                            <AppWindow className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16}/>
                            <select value={selectedAppId} onChange={e => setSelectedAppId(e.target.value)} className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 appearance-none focus:ring-blue-500 focus:border-blue-500 transition">
                                <option value="all">All Applications</option>
                                {apps.map(app => <option key={app.id} value={app.id}>{app.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                 <div className="flex justify-end mt-4">
                    <button onClick={handleDownloadPdf} disabled={filteredLogs.length === 0} className="flex items-center justify-center bg-green-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
                        <Download size={18} className="mr-2" />
                        Download PDF
                    </button>
                </div>

                {/* Log Table */}
                <div className="mt-6 overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th className="px-6 py-3">Date & Time</th>
                                <th className="px-6 py-3">Application</th>
                                <th className="px-6 py-3 text-right">Credits Used</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map(log => (
                                <tr key={log.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">{formatTimestamp(log.timestamp)}</td>
                                    <td className="px-6 py-4 font-medium text-gray-900">{log.appName}</td>
                                    <td className="px-6 py-4 text-right font-mono font-semibold text-red-600">-{log.creditsDeducted}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                     {filteredLogs.length === 0 && (
                        <div className="text-center py-12 text-gray-500">
                             <FileText size={32} className="mx-auto text-gray-300 mb-2" />
                            <p>No credit usage records found for the selected filters.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserCreditDetailView;