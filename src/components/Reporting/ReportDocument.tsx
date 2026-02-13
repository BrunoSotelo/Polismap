


interface ReportData {
    resumen_ejecutivo: string;
    temas_recurrentes: string[];
}

interface ReportDocumentProps {
    data: ReportData;
    startDate: string;
    endDate: string;
}

export function ReportDocument({ data, startDate, endDate }: ReportDocumentProps) {
    return (
        <div className="bg-white text-gray-900 mx-auto print:mx-0 print:w-full max-w-[210mm] min-h-[297mm] p-[20mm] shadow-lg print:shadow-none mb-10 print:mb-0 border print:border-none">
            {/* Header */}
            <header className="border-b-2 border-blue-900 pb-6 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-extrabold text-blue-900 uppercase tracking-widest">
                        Informe Operativo
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 uppercase tracking-wide">
                        Resumen de Actividades Territoriales
                    </p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-bold text-gray-400 uppercase">Periodo</p>
                    <p className="text-lg font-medium text-blue-800">
                        {startDate} <span className="text-gray-400 mx-1">/</span> {endDate}
                    </p>
                </div>
            </header>

            {/* Content */}
            <div className="space-y-10">

                {/* Section 1: Executive Summary */}
                <section>
                    <h2 className="text-xl font-bold text-gray-800 mb-3 border-l-4 border-blue-600 pl-3 uppercase">
                        1. Resumen Ejecutivo
                    </h2>
                    <div className="prose prose-blue text-justify text-gray-700 leading-relaxed whitespace-pre-line">
                        {data.resumen_ejecutivo}
                    </div>
                </section>

                {/* Section 2: Recurring Themes */}
                <section>
                    <h2 className="text-xl font-bold text-gray-800 mb-3 border-l-4 border-gray-600 pl-3 uppercase">
                        2. Temas Recurrentes
                    </h2>
                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-200">
                        {data.temas_recurrentes && data.temas_recurrentes.length > 0 ? (
                            <ul className="grid grid-cols-1 gap-3">
                                {data.temas_recurrentes.map((tema, idx) => (
                                    <li key={idx} className="flex items-start gap-3 text-gray-700">
                                        <span className="mt-1.5 w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></span>
                                        <span className="capitalize font-medium">{tema}</span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-gray-400 italic">No se identificaron temas recurrentes específicos.</p>
                        )}
                    </div>
                </section>

            </div>

            {/* Footer */}
            <footer className="mt-20 pt-6 border-t border-gray-200 text-center text-xs text-gray-400 flex justify-between print:fixed print:bottom-0 print:left-0 print:w-full print:bg-white print:p-8">
                <div>Generado por Sistema de Gestión Territorial QRO</div>
                <div>Confidencial / Uso Interno</div>
                <div>{new Date().toLocaleDateString()}</div>
            </footer>
        </div>
    );
}
