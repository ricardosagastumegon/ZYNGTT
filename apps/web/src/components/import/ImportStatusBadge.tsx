import React from 'react';

type ExpedienteStatus =
  | 'CFDI_PENDIENTE'
  | 'DOCS_GENERADOS'
  | 'SIGIE_SOLICITADO'
  | 'SIGIE_APROBADO'
  | 'DUCA_LISTA'
  | 'DUCA_TRANSMITIDA'
  | 'SEMAFORO_VERDE'
  | 'SEMAFORO_ROJO'
  | 'LIBERADA'
  | 'RECHAZADA';

interface Config {
  label: string;
  bg: string;
  color: string;
  pulse?: boolean;
  icon?: string;
}

const STATUS_CONFIG: Record<ExpedienteStatus, Config> = {
  CFDI_PENDIENTE:   { label: 'CFDI Pendiente',     bg: '#F1F3F5', color: '#6C757D' },
  DOCS_GENERADOS:   { label: 'Docs Generados',      bg: '#E0E9FF', color: '#4338CA' },
  SIGIE_SOLICITADO: { label: 'SIGIE Solicitado',    bg: '#FEF9C3', color: '#854D0E', pulse: true },
  SIGIE_APROBADO:   { label: 'MAGA Aprobado',       bg: '#DCFCE7', color: '#166534' },
  DUCA_LISTA:       { label: 'Lista para DUCA',     bg: '#DCFCE7', color: '#15803D' },
  DUCA_TRANSMITIDA: { label: 'DUCA Transmitida',    bg: '#FEF9C3', color: '#CA8A04', pulse: true },
  SEMAFORO_VERDE:   { label: 'Semáforo Verde',      bg: '#BBF7D0', color: '#14532D' },
  SEMAFORO_ROJO:    { label: 'Semáforo Rojo',       bg: '#FEE2E2', color: '#991B1B' },
  LIBERADA:         { label: 'Liberada ✓',          bg: '#A7F3D0', color: '#064E3B', icon: '✓' },
  RECHAZADA:        { label: 'Rechazada',            bg: '#FEE2E2', color: '#7F1D1D' },
};

interface Props {
  status: ExpedienteStatus | string;
  size?: 'sm' | 'md';
}

export function ImportStatusBadge({ status, size = 'md' }: Props) {
  const config = STATUS_CONFIG[status as ExpedienteStatus] ?? {
    label: status,
    bg: '#F1F3F5',
    color: '#6C757D',
  };

  const padding = size === 'sm' ? '2px 8px' : '4px 12px';
  const fontSize = size === 'sm' ? '11px' : '12px';

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding,
      borderRadius: '9999px',
      background: config.bg,
      color: config.color,
      fontSize,
      fontWeight: 500,
      fontFamily: "'DM Sans', sans-serif",
      whiteSpace: 'nowrap',
    }}>
      {config.pulse && (
        <span style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          background: config.color,
          display: 'inline-block',
          animation: 'pulse-dot 1.5s ease-in-out infinite',
        }} />
      )}
      {config.label}
    </span>
  );
}

export default ImportStatusBadge;
