import { useState, useEffect } from 'react';
import { appointmentsService } from '../../services/appointments.service';
import type { Patient } from '../../services/appointments.service';

interface PatientsPageProps {
  onSelectPatient: (id: string) => void;
}

export const PatientsPage = ({ onSelectPatient }: PatientsPageProps) => {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const data = await appointmentsService.getPatients();
        setPatients(data);
      } catch (err) {
        // handled by empty state
      } finally {
        setLoading(false);
      }
    };
    fetchPatients();
  }, []);

  const filtered = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
    p.identity_number?.includes(search)
  );

  const calculateAge = (dob?: string) => {
    if (!dob) return '—';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-500">Cargando pacientes...</p>
    </div>
  );

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pacientes</h1>
        <p className="text-slate-500 text-sm mt-1">
          {patients.length} paciente(s) registrados
        </p>
      </div>

      <div className="mb-4">
        <input
          className="w-full max-w-sm border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Buscar por nombre o identidad..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Nombre</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Identidad</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Edad</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Teléfono</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium">Tipo de sangre</th>
              <th className="text-left px-4 py-3 text-slate-600 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-400">
                  No se encontraron pacientes
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr
                  key={p.id}
                  className="border-b border-slate-100 hover:bg-slate-50 transition-colors cursor-pointer"
                  onClick={() => onSelectPatient(p.id)}
                >
                  <td className="px-4 py-3 font-medium text-slate-800">
                    {p.first_name} {p.last_name}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{p.identity_number || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{calculateAge(p.date_of_birth)}</td>
                  <td className="px-4 py-3 text-slate-600">{p.phone || '—'}</td>
                  <td className="px-4 py-3 text-slate-600">{p.blood_type || '—'}</td>
                  <td className="px-4 py-3 text-blue-500 text-xs">Ver expediente →</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};