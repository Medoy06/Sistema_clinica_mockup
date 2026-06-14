import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { appointmentsService } from '../../services/appointments.service';
import type { Patient, MedicalRecord, Appointment, Doctor } from '../../services/appointments.service';

interface PatientProfilePageProps {
  patientId: string;
  onBack: () => void;
}

const statusLabels: Record<Appointment['status'], string> = {
  scheduled: 'Programada',
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No asistió',
};

const statusColors: Record<Appointment['status'], string> = {
  scheduled: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-slate-100 text-slate-700',
  no_show: 'bg-amber-100 text-amber-700',
};

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString('es-HN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const calculateAge = (dob?: string) => {
  if (!dob) return null;
  const birth = new Date(dob);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

export const PatientProfilePage = ({ patientId, onBack }: PatientProfilePageProps) => {
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [history, setHistory] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'historial' | 'citas'>('historial');
  const [showNewRecord, setShowNewRecord] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [recordForm, setRecordForm] = useState({
    doctor_id: '',
    diagnosis: '',
    treatment: '',
    prescription: '',
    notes: '',
  });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        setLoading(true);
        const [p, r, h, d] = await Promise.all([
          appointmentsService.getPatient(patientId),
          appointmentsService.getMedicalRecords(patientId),
          appointmentsService.getPatientHistory(patientId),
          appointmentsService.getDoctors(),
        ]);
        setPatient(p);
        setRecords(r);
        setHistory(h);
        setDoctors(d);
      } catch (err) {
        toast.error('Error al cargar el expediente.');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [patientId]);

  const handleCreateRecord = async () => {
    if (!recordForm.doctor_id) {
      toast.error('Seleccione un médico.');
      return;
    }
    if (!recordForm.diagnosis && !recordForm.treatment && !recordForm.notes) {
      toast.error('Ingrese al menos un diagnóstico, tratamiento o nota.');
      return;
    }
    try {
      setSubmitting(true);
      const record = await appointmentsService.createMedicalRecord({
        patient_id: patientId,
        ...recordForm,
      });
      setRecords(prev => [record, ...prev]);
      toast.success('Registro médico guardado.');
      setShowNewRecord(false);
      setRecordForm({ doctor_id: '', diagnosis: '', treatment: '', prescription: '', notes: '' });
    } catch (err) {
      toast.error('Error al guardar el registro médico.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-slate-500">Cargando expediente...</p>
    </div>
  );

  if (!patient) return (
    <div className="flex items-center justify-center h-full">
      <p className="text-red-500">Paciente no encontrado.</p>
    </div>
  );

  const age = calculateAge(patient.date_of_birth);

  return (
    <div className="p-6">
      {/* Back button */}
      <button
        onClick={onBack}
        className="text-sm text-blue-600 hover:text-blue-800 mb-4 flex items-center gap-1"
      >
        ← Volver a Pacientes
      </button>

      {/* Patient header card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              {patient.identity_number && <span>Identidad: {patient.identity_number}</span>}
              {age !== null && <span>Edad: {age} años</span>}
              {patient.gender && <span>{patient.gender}</span>}
              {patient.blood_type && (
                <span className="bg-red-50 text-red-600 px-2 py-0.5 rounded-full text-xs font-medium">
                  {patient.blood_type}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-slate-500">
              {patient.phone && <span>📞 {patient.phone}</span>}
              {patient.email && <span>✉️ {patient.email}</span>}
            </div>
            {patient.allergies && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-800">
                ⚠️ Alergias: {patient.allergies}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('historial')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'historial'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Historial Médico
        </button>
        <button
          onClick={() => setActiveTab('citas')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'citas'
              ? 'border-blue-500 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Historial de Citas
        </button>
      </div>

      {/* Historial Médico tab */}
      {activeTab === 'historial' && (
        <div>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowNewRecord(!showNewRecord)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              + Nuevo Registro
            </button>
          </div>

          {/* New record form */}
          {showNewRecord && (
            <div className="bg-white rounded-lg border border-blue-200 p-6 mb-4">
              <h3 className="text-base font-semibold text-slate-700 mb-4">
                Nuevo Registro Médico
              </h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Médico *</label>
                  <select
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={recordForm.doctor_id}
                    onChange={e => setRecordForm({ ...recordForm, doctor_id: e.target.value })}
                  >
                    <option value="">Seleccionar médico...</option>
                    {doctors.map(d => (
                      <option key={d.id} value={d.id}>{d.full_name} — {d.specialty}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Diagnóstico</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={recordForm.diagnosis}
                    onChange={e => setRecordForm({ ...recordForm, diagnosis: e.target.value })}
                    placeholder="Diagnóstico del paciente..."
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Tratamiento</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={recordForm.treatment}
                    onChange={e => setRecordForm({ ...recordForm, treatment: e.target.value })}
                    placeholder="Tratamiento indicado..."
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Prescripción</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={recordForm.prescription}
                    onChange={e => setRecordForm({ ...recordForm, prescription: e.target.value })}
                    placeholder="Medicamentos prescritos..."
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-600 block mb-1">Notas adicionales</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    value={recordForm.notes}
                    onChange={e => setRecordForm({ ...recordForm, notes: e.target.value })}
                    placeholder="Notas adicionales..."
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <button
                  onClick={handleCreateRecord}
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  {submitting ? 'Guardando...' : 'Guardar Registro'}
                </button>
                <button
                  onClick={() => setShowNewRecord(false)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Records list */}
          {records.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <p className="text-4xl mb-3">📋</p>
              <p className="text-slate-500 font-medium">Sin registros médicos</p>
              <p className="text-slate-400 text-sm mt-1">
                Los diagnósticos y tratamientos aparecerán aquí
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {records.map(record => (
                <div key={record.id} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-medium text-slate-800">
                      Dr. {record.doctor_name} — {record.specialty}
                    </p>
                    <p className="text-xs text-slate-400">
                      {formatDateTime(record.visit_date)}
                    </p>
                  </div>
                  {record.diagnosis && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-medium">Diagnóstico:</span> {record.diagnosis}
                    </p>
                  )}
                  {record.treatment && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-medium">Tratamiento:</span> {record.treatment}
                    </p>
                  )}
                  {record.prescription && (
                    <p className="text-sm text-slate-600 mb-1">
                      <span className="font-medium">Prescripción:</span> {record.prescription}
                    </p>
                  )}
                  {record.notes && (
                    <p className="text-sm text-slate-400 mt-2 italic">{record.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Historial de Citas tab */}
      {activeTab === 'citas' && (
        <div>
          {history.length === 0 ? (
            <div className="bg-white rounded-lg border border-slate-200 p-12 text-center">
              <p className="text-4xl mb-3">📅</p>
              <p className="text-slate-500 font-medium">Sin citas registradas</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.map(appt => (
                <div key={appt.id} className="bg-white rounded-lg border border-slate-200 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-slate-800">
                        {formatDateTime(appt.scheduled_at)}
                      </p>
                      <p className="text-sm text-slate-500">
                        Dr. {appt.doctor_name} — {appt.specialty}
                      </p>
                      {appt.reason && (
                        <p className="text-sm text-slate-400 mt-1">Motivo: {appt.reason}</p>
                      )}
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[appt.status]}`}>
                      {statusLabels[appt.status]}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};