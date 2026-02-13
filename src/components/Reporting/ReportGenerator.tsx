import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { ReportDocument } from './ReportDocument';

export function ReportGenerator() {
    // Default to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [loading, setLoading] = useState(false);
    const [startDate, setStartDate] = useState(firstDay);
    const [endDate, setEndDate] = useState(lastDay);
    const [status, setStatus] = useState('');

    // Data state
    const [reportData, setReportData] = useState<any>(null);

    const handleGenerate = async () => {
        setLoading(true);
        setStatus('Consultando Inteligencia Artificial...');
        setReportData(null);

        try {
            // 1. Call the Edge Function with safe parameters
            const { data: result, error } = await supabase.functions.invoke('generate-report', {
                body: {
                    startDate,
                    endDate,
                    distritoId: 6,
                }
            });

            if (error) {
                console.error("Supabase Function Error:", error);
                throw new Error(error.message || "Error desconocido en la función");
            }

            if (!result) throw new Error("No data returned from AI");

            // 2. Set Data to View
            setReportData(result);
            setStatus(''); // Clear status, report is ready

        } catch (err: any) {
            console.error(err);
            setStatus('Error: ' + (err.message || 'Desconocido'));
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="max-w-4xl mx-auto mt-10 space-y-8 print:mt-0 print:w-full">

            {/* Control Panel - Hidden when printing */}
            <div className="bg-white p-6 rounded-lg shadow-md border border-gray-100 print:hidden">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-blue-900 bg-clip-text text-transparent mb-4">
                    Generador de Reportes IA
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Inicio</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700">Fecha Fin</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 p-2 border"
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={handleGenerate}
                            disabled={loading}
                            style={{ backgroundColor: loading ? '#9ca3af' : '#2563eb', color: 'white' }}
                            className={`flex-1 flex justify-center py-2 px-4 rounded-lg shadow-sm text-sm font-medium text-white transition-colors
                            ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                        >
                            {loading ? 'Analizando...' : 'Generar Informe'}
                        </button>
                    </div>
                </div>

                {status && (
                    <div className={`mt-4 p-3 rounded-md text-sm text-center font-medium animate-pulse
                        ${status.includes('Error') ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                        {status}
                    </div>
                )}
            </div>

            {/* Report Preview Aera */}
            {reportData && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex justify-end mb-4 print:hidden">
                        <button
                            onClick={handlePrint}
                            className="flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded hover:bg-black transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
                            Imprimir / Guardar PDF
                        </button>
                    </div>

                    {/* The Actual Document */}
                    <ReportDocument
                        data={reportData}
                        startDate={startDate}
                        endDate={endDate}
                    />
                </div>
            )}
        </div >
    );
}
