import type { SlaGuaranteeContent } from '@/lib/sanity/home'

export default function SlaGuarantee({ data }: { data: SlaGuaranteeContent }) {
  return (
    <section className="py-[88px] px-6">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{data.tag}</p>
        <h2 className="text-[2rem] font-bold text-[#f1f5f9] mb-4">{data.title}</h2>
        <p className="text-[#64748b] mb-10 max-w-2xl leading-[1.7]">{data.sub}</p>
        <div className="grid sm:grid-cols-2 gap-5">
          {data.items.map(item => (
            <div key={item.title} className="bg-[#151820] border border-[rgba(255,255,255,0.07)] rounded-[12px] p-6 flex flex-col gap-2.5">
              <h3 className="text-[0.95rem] font-semibold text-[#e2e8f0]">{item.title}</h3>
              <p className="text-[0.87rem] text-[#64748b] leading-[1.65]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
