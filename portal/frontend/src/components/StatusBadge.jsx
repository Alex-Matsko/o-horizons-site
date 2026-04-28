export default function StatusBadge({ status }) {
  const map = {
    running:      { label: 'ONLINE',      cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
    stopped:      { label: 'ОСТАНОВЛЕНА', cls: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
    updating:     { label: 'ОБНОВЛЕНИЕ',  cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
    provisioning: { label: 'СОЗДАЁТСЯ',   cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
    error:        { label: 'ОШИБКА',      cls: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  };
  const s = map[status] || map.stopped;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${s.cls}`}>
      {status === 'running' && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {s.label}
    </span>
  );
}
