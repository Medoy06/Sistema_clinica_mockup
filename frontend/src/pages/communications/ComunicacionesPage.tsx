export const ComunicacionesPage = () => {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Comunicaciones</h1>
        <p className="text-slate-500 text-sm mt-1">
          Mensajería interna y notificaciones
        </p>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
        <p className="text-4xl mb-3">✉️</p>
        <p className="text-slate-500 font-medium">Módulo en construcción</p>
        <p className="text-slate-400 text-sm mt-2 max-w-md mx-auto">
          Próximamente: mensajería interna entre el personal, notificaciones
          automáticas a pacientes y comunicación directa entre farmacia y hospital.
        </p>
      </div>
    </div>
  );
};