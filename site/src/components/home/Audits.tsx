import type { AuditsContent } from '@/lib/sanity/home'

export default function Audits({ data }: { data: AuditsContent }) {
  return (
    <section id="audits" className="py-[88px] px-6 bg-[#0a0c10] border-t border-b border-[rgba(255,255,255,0.05)]">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{data.tag}</p>
        <h2 className="text-[2rem] font-bold text-[#f1f5f9] mb-4">{data.title}</h2>
        <p className="text-[#64748b] mb-10 max-w-2xl leading-[1.7]">{data.sub}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.items.map(item => (
            <div key={item.title} className="bg-[#151820] border border-[rgba(255,255,255,0.07)] rounded-[12px] p-6 flex flex-col gap-2.5 hover:border-[rgba(59,130,246,0.3)] transition-colors h-full">
              <h3 className="text-[0.95rem] font-semibold text-[#e2e8f0]">{item.title}</h3>
              <p className="text-[0.83rem] text-[#64748b] leading-[1.6] flex-1">{item.description}</p>
              <p className="text-sm font-bold text-[#3b82f6] mt-1">{item.price}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
