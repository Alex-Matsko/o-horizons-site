import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { Database, Users, HardDrive, Activity, Plus, ExternalLink, ChevronRight } from 'lucide-react';

function KpiCard({ label, value, sub, color = 'teal' }) {
  const colors = {
    teal:   'text-teal-400',
    green:  'text-emerald-400',
    amber:  'text-amber-400',
    red:    'text-red-400',
  };
  return (
    <div className="bg-[#1a1917] border border-white/8 rounded-xl p-5">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-2">{label}</div>
      <div className={`text-2xl font-bold ${colors[color]} leading-none mb-1`}>{value}</div>
      {sub && <div className="text-xs text-gray-600 mt-1">{sub}</div>}
    </div>
  );
}

function DbCard({ db }) {
  const isRunning = db.status === 'running';
  return (
    <div className="bg-[#1a1917] border border-white/8 rounded-xl p-5 hover:border-white/15 transition-colors">
      <div className="flex items-start justify-between mb-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-semibold text-gray-100 truncate">{db.name}</span>
          </div>
          <div className="text-xs text-gray-500">{db.config_name || '\u041a\u043e\u043d\u0444\u0438\u0433\u0443\u0440\u0430\u0446\u0438\u044f'}</div>
        </div>
        <StatusBadge status={db.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div>
          <div className="text-gray-600 mb-0.5">\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439</div>
          <div className="text-gray-300 font-medium">{db.users_count ?? '\u2014'}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-0.5">\u0420\u0430\u0437\u043c\u0435\u0440 \u0411\u0414</div>
          <div className="text-gray-300 font-medium">
            {db.size_mb ? `${(db.size_mb / 1024).toFixed(1)} \u0413\u0411` : '\u2014'}
          </div>
        </div>
        <div>
          <div className="text-gray-600 mb-0.5">\u0412\u0435\u0440\u0441\u0438\u044f \u043f\u043b\u0430\u0442\u0444\u043e\u0440\u043c\u044b</div>
          <div className="text-gray-300 font-medium">{db.onec_version || '\u2014'}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-0.5">\u041f\u043e\u0441\u043b\u0435\u0434\u043d\u0438\u0439 \u0431\u044d\u043a\u0430\u043f</div>
          <div className="text-gray-300 font-medium">{db.last_backup || '\u2014'}</div>
        </div>
      </div>

      <div className="flex gap-2">
        {isRunning && db.url && (
          <a
            href={db.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 flex-1 justify-center bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            <ExternalLink size={12} />\u041e\u0442\u043a\u0440\u044b\u0442\u044c
          </a>
        )}
        <Link
          to={`/databases/${db.id}/users`}
          className="flex items-center gap-1.5 flex-1 justify-center bg-white/5 hover:bg-white/8 text-gray-400 hover:text-gray-200 rounded-lg py-2 text-xs font-medium transition-colors"
        >
          <Users size={12} />\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0438
        </Link>
        <Link
          to={`/databases/${db.id}/backups`}
          className="flex items-center gap-1.5 flex-1 justify-center bg-white/5 hover:bg-white/8 text-gray-400 hover:text-gray-200 rounded-lg py-2 text-xs font-medium transition-colors"
        >
          <HardDrive size={12} />\u0411\u044d\u043a\u0430\u043f\u044b
        </Link>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [databases, setDatabases] = useState([]);
  const [profile,   setProfile]   = useState(null);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    Promise.all([api.databases.list(), api.me.get()])
      .then(([dbs, me]) => {
        setDatabases(dbs.databases || []);
        setProfile(me);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
    </div>
  );

  const running = databases.filter(d => d.status === 'running').length;
  const totalUsers = databases.reduce((s, d) => s + (d.users_count || 0), 0);
  const maxBases = profile?.tariff?.max_bases ?? '?';

  return (
    <div className="space-y-6 max-w-6xl">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1">\u041f\u0410\u041d\u0415\u041b\u042c \u0423\u041f\u0420\u0410\u0412\u041b\u0415\u041d\u0418\u042f</div>
          <h1 className="text-xl font-bold text-white">\u0412\u0430\u0448\u0430 \u0438\u043d\u0444\u0440\u0430\u0441\u0442\u0440\u0443\u043a\u0442\u0443\u0440\u0430 1\u0421</h1>
          <p className="text-sm text-gray-500 mt-0.5">\u0423\u043f\u0440\u0430\u0432\u043b\u044f\u0439\u0442\u0435 \u0431\u0430\u0437\u0430\u043c\u0438, \u043f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u044f\u043c\u0438 \u0438 \u0440\u0435\u0437\u0435\u0440\u0432\u043d\u044b\u043c\u0438 \u043a\u043e\u043f\u0438\u044f\u043c\u0438 \u0432 \u043e\u0434\u043d\u043e\u043c \u043c\u0435\u0441\u0442\u0435</p>
        </div>
        <Link
          to="/databases/new"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} />\u0417\u0430\u043a\u0430\u0437\u0430\u0442\u044c \u0431\u0430\u0437\u0443
        </Link>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="\u0410\u043a\u0442\u0438\u0432\u043d\u044b\u0445 \u0431\u0430\u0437"
          value={databases.length}
          sub={`\u0438\u0437 ${maxBases} \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b\u0445 \u043f\u043e \u0442\u0430\u0440\u0438\u0444\u0443`}
          color="teal"
        />
        <KpiCard
          label="\u0421\u0442\u0430\u0442\u0443\u0441 \u0431\u0430\u0437"
          value={running === databases.length && databases.length > 0 ? 'Online' : `${running} / ${databases.length}`}
          sub={running === databases.length && databases.length > 0 ? '\u0412\u0441\u0435 \u0431\u0430\u0437\u044b \u0434\u043e\u0441\u0442\u0443\u043f\u043d\u044b' : '\u0431\u0430\u0437 \u0437\u0430\u043f\u0443\u0449\u0435\u043d\u043e'}
          color={running === databases.length && databases.length > 0 ? 'green' : 'amber'}
        />
        <KpiCard
          label="\u041f\u043e\u043b\u044c\u0437\u043e\u0432\u0430\u0442\u0435\u043b\u0435\u0439 1\u0421"
          value={totalUsers}
          sub={`\u0438\u0437 ${profile?.tariff?.max_users ?? '?'} \u043b\u0438\u0446\u0435\u043d\u0437\u0438\u0439`}
          color="teal"
        />
        <KpiCard
          label="\u0422\u0430\u0440\u0438\u0444"
          value={profile?.tariff?.name || '\u2014'}
          sub={profile?.tariff?.price ? `${profile.tariff.price}\u20bd/\u043c\u0435\u0441` : '\u0410\u043a\u0442\u0438\u0432\u0435\u043d'}
          color="teal"
        />
      </div>

      {/* Databases */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300">\u0411\u0430\u0437\u044b \u0434\u0430\u043d\u043d\u044b\u0445 1\u0421</h2>
          <Link to="/databases" className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-400 transition-colors">
            \u0412\u0441\u0435 \u0431\u0430\u0437\u044b <ChevronRight size={12} />
          </Link>
        </div>

        {databases.length === 0 ? (
          <div className="bg-[#1a1917] border border-dashed border-white/10 rounded-xl p-12 text-center">
            <Database size={32} className="mx-auto text-gray-700 mb-3" />
            <h3 className="text-sm font-medium text-gray-500 mb-1">\u041d\u0435\u0442 \u0431\u0430\u0437 \u0434\u0430\u043d\u043d\u044b\u0445</h3>
            <p className="text-xs text-gray-700 mb-4">\u0417\u0430\u043a\u0430\u0436\u0438\u0442\u0435 \u043f\u0435\u0440\u0432\u0443\u044e \u0431\u0430\u0437\u0443 1\u0421 \u0434\u043b\u044f \u043d\u0430\u0447\u0430\u043b\u0430 \u0440\u0430\u0431\u043e\u0442\u044b</p>
            <Link to="/databases/new" className="text-teal-500 hover:text-teal-400 text-xs font-medium">
              \u0417\u0430\u043a\u0430\u0437\u0430\u0442\u044c \u0431\u0430\u0437\u0443 \u2192
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {databases.map(db => <DbCard key={db.id} db={db} />)}
          </div>
        )}
      </div>
    </div>
  );
}
