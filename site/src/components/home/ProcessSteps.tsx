import type { ProcessStepsContent } from '@/lib/sanity/home'

export default function ProcessSteps({ data }: { data: ProcessStepsContent }) {
  return (
    <section className="py-[88px] px-6 bg-[#0a0c10] border-t border-b border-[rgba(255,255,255,0.05)]">
      <div className="max-w-[1160px] mx-auto">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#3b82f6] mb-3">{data.tag}</p>
        <h2 className="text-[2rem] font-bold text-[#f1f5f9] mb-10">{data.title}</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {data.items.map((item, i) => (
            <div key={item.title} className="bg-[#151820] border border-[rgba(255,255,255,0.07)] rounded-[14px] p-7 flex flex-col gap-3">
              <span className="text-xs font-bold text-[#3b82f6] bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)] rounded-full w-7 h-7 flex items-center justify-center">{i + 1}</span>
              <h3 className="text-base font-semibold text-[#e2e8f0]">{item.title}</h3>
              <p className="text-sm text-[#64748b] leading-[1.7]">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
