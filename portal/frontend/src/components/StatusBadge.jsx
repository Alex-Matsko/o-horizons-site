export default function StatusBadge({ status }) {
  const map = {
    running:     { label: 'ONLINE',      cls: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
    stopped:     { label: '\u041e\u0421\u0422\u0410\u041d\u041e\u0412\u041b\u0415\u041d\u0410', cls: 'bg-gray-500/15 text-gray-400 border border-gray-500/20' },
    updating:    { label: '\u041e\u0411\u041d\u041e\u0412\u041b\u0415\u041d\u0418\u0415',  cls: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
    provisioning:{ label: '\u0421\u041e\u0417\u0414\u0410\u0415\u0422\u0421\u042f',   cls: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
    error:       { label: '\u041e\u0428\u0418\u0411\u041a\u0410',       cls: 'bg-red-500/15 text-red-400 border border-red-500/20' },
  };
  const s = map[status] || map.stopped;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider ${s.cls}`}>
      {(status === 'running') && (
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
      )}
      {s.label}
    </span>
  );
}
