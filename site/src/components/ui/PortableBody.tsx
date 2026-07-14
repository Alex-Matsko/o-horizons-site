import type { ArticleBlock } from '@/lib/sanity/types'

export default function PortableBody({ blocks }: { blocks: ArticleBlock[] }) {
  const nodes: React.ReactNode[] = []
  let listItems: { key: string; text: string }[] = []

  const flushList = () => {
    if (listItems.length === 0) return
    nodes.push(
      <ul key={`list-${listItems[0].key}`} className="list-disc pl-5 space-y-1.5 mb-4">
        {listItems.map(item => (
          <li key={item.key} className="text-sm text-[#94a3b8] leading-[1.8]">{item.text}</li>
        ))}
      </ul>
    )
    listItems = []
  }

  for (const block of blocks) {
    if (block._type === 'statRow') {
      flushList()
      nodes.push(
        <div key={block._key} className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6">
          {block.items.map((s, i) => (
            <div key={i} className="bg-[#151820] border border-[rgba(255,255,255,0.07)] rounded-xl px-3 py-4 text-center">
              <span className="block text-[1.35rem] leading-none font-bold text-[#3b82f6]">{s.value}</span>
              <p className="text-xs text-[#64748b] mt-1.5">{s.label}</p>
            </div>
          ))}
        </div>
      )
      continue
    }

    if (block._type === 'callout') {
      flushList()
      nodes.push(
        <div key={block._key} className="bg-[#3b82f6]/10 border border-[#3b82f6]/30 rounded-xl p-5 my-6">
          {block.title && <p className="text-sm font-semibold text-[#e2e8f0] mb-1.5">{block.title}</p>}
          <p className="text-[0.9rem] text-[#cbd5e1] leading-[1.8]">{block.text}</p>
        </div>
      )
      continue
    }

    if (block._type === 'compareTable') {
      flushList()
      nodes.push(
        <div key={block._key} className="overflow-x-auto my-6 rounded-xl border border-[rgba(255,255,255,0.07)]">
          <table className="w-full text-sm border-collapse">
            {block.headers && block.headers.length > 0 && (
              <thead>
                <tr className="bg-[#151820]">
                  {block.headers.map((h, i) => (
                    <th key={i} className="text-left font-semibold text-[#e2e8f0] px-4 py-3 border-b border-[rgba(255,255,255,0.07)]">{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {block.rows.map((row, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-[#10131a]' : 'bg-[#151820]'}>
                  <td className="px-4 py-3 text-[#94a3b8] align-top border-b border-[rgba(255,255,255,0.05)]">{row.a}</td>
                  <td className="px-4 py-3 text-[#94a3b8] align-top border-b border-[rgba(255,255,255,0.05)]">{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      continue
    }

    const text = block.children?.map(c => c.text).join('') ?? ''
    if (!text) continue
    if (block.listItem) {
      listItems.push({ key: block._key, text })
      continue
    }
    flushList()
    if (block.style === 'h3') {
      nodes.push(<h3 key={block._key} className="text-base font-semibold text-[#cbd5e1] mt-7 mb-2">{text}</h3>)
    } else if (block.style === 'h2') {
      nodes.push(<h2 key={block._key} className="text-lg font-semibold text-[#e2e8f0] mt-8 mb-3">{text}</h2>)
    } else {
      nodes.push(<p key={block._key} className="text-sm text-[#94a3b8] leading-[1.8] mb-3">{text}</p>)
    }
  }
  flushList()

  return <div className="prose prose-invert max-w-none">{nodes}</div>
}
