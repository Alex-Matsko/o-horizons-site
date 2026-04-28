import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api.js';
import StatusBadge from '../components/StatusBadge.jsx';
import { Database, Users, HardDrive, Plus, ExternalLink, ChevronRight } from 'lucide-react';

function KpiCard({ label, value, sub, color = 'teal' }) {
  const colors = {
    teal:  'text-teal-400',
    green: 'text-emerald-400',
    amber: 'text-amber-400',
    red:   'text-red-400',
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
          <div className="text-sm font-semibold text-gray-100 truncate mb-1">{db.name}</div>
          <div className="text-xs text-gray-500">{db.config_name || 'Конфигурация'}</div>
        </div>
        <StatusBadge status={db.status} />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 text-xs">
        <div>
          <div className="text-gray-600 mb-0.5">Пользователей</div>
          <div className="text-gray-300 font-medium">{db.users_count ?? '—'}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-0.5">Размер БД</div>
          <div className="text-gray-300 font-medium">
            {db.size_mb ? `${(db.size_mb / 1024).toFixed(1)} ГБ` : '—'}
          </div>
        </div>
        <div>
          <div className="text-gray-600 mb-0.5">Версия платформы</div>
          <div className="text-gray-300 font-medium">{db.onec_version || '—'}</div>
        </div>
        <div>
          <div className="text-gray-600 mb-0.5">Последний бэкап</div>
          <div className="text-gray-300 font-medium">{db.last_backup || '—'}</div>
        </div>
      </div>

      <div className="flex gap-2">
        {isRunning && db.url && (
          <a
            href={db.url} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 flex-1 justify-center bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/20 rounded-lg py-2 text-xs font-medium transition-colors"
          >
            <ExternalLink size={12} />Открыть
          </a>
        )}
        <Link
          to={`/databases/${db.id}/users`}
          className="flex items-center gap-1.5 flex-1 justify-center bg-white/5 hover:bg-white/8 text-gray-400 hover:text-gray-200 rounded-lg py-2 text-xs font-medium transition-colors"
        >
          <Users size={12} />Пользователи
        </Link>
        <Link
          to={`/databases/${db.id}/backups`}
          className="flex items-center gap-1.5 flex-1 justify-center bg-white/5 hover:bg-white/8 text-gray-400 hover:text-gray-200 rounded-lg py-2 text-xs font-medium transition-colors"
        >
          <HardDrive size={12} />Бэкапы
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

  const running    = databases.filter(d => d.status === 'running').length;
  const totalUsers = databases.reduce((s, d) => s + (d.users_count || 0), 0);
  const maxBases   = profile?.tariff?.max_bases ?? '?';
  const allOnline  = databases.length > 0 && running === databases.length;

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-widest text-gray-600 mb-1">ПАНЕЛЬ УПРАВЛЕНИЯ</div>
          <h1 className="text-xl font-bold text-white">Ваша инфраструктура 1С</h1>
          <p className="text-sm text-gray-500 mt-0.5">Управляйте базами, пользователями и резервными копиями</p>
        </div>
        <Link
          to="/databases/request"
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          <Plus size={15} />Заказать базу
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Активных баз"
          value={databases.length}
          sub={`из ${maxBases} доступных по тарифу`}
          color="teal"
        />
        <KpiCard
          label="Статус баз"
          value={allOnline ? 'Online' : `${running} / ${databases.length}`}
          sub={allOnline ? 'Все базы доступны' : 'баз запущено'}
          color={allOnline ? 'green' : 'amber'}
        />
        <KpiCard
          label="Пользователей 1С"
          value={totalUsers}
          sub={`из ${profile?.tariff?.max_users ?? '?'} лицензий`}
          color="teal"
        />
        <KpiCard
          label="Тариф"
          value={profile?.tariff?.name || '—'}
          sub={profile?.tariff?.price ? `${profile.tariff.price}₽/мес` : 'Активен'}
          color="teal"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-300">Базы данных 1С</h2>
          <Link to="/databases" className="flex items-center gap-1 text-xs text-gray-500 hover:text-teal-400 transition-colors">
            Все базы <ChevronRight size={12} />
          </Link>
        </div>

        {databases.length === 0 ? (
          <div className="bg-[#1a1917] border border-dashed border-white/10 rounded-xl p-12 text-center">
            <Database size={32} className="mx-auto text-gray-700 mb-3" />
            <h3 className="text-sm font-medium text-gray-500 mb-1">Нет баз данных</h3>
            <p className="text-xs text-gray-700 mb-4">Закажите первую базу 1С для начала работы</p>
            <Link to="/databases/request" className="text-teal-500 hover:text-teal-400 text-xs font-medium">
              Заказать базу →
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
