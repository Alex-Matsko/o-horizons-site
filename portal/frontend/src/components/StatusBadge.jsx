const MAP = {
  running:           ['badge-green',  'Работает'],
  provisioning:      ['badge-yellow', 'Создаётся'],
  pending_approval:  ['badge-blue',   'Ожидает одобрения'],
  approved:          ['badge-blue',   'Одобрено'],
  error:             ['badge-red',    'Ошибка'],
  pending:           ['badge-gray',   'Очередь'],
  done:              ['badge-green',  'Готово'],
  failed:            ['badge-red',    'Ошибка'],
  rejected:          ['badge-red',    'Отклонено'],
};
export default function StatusBadge({ status }) {
  const [cls, label] = MAP[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}
