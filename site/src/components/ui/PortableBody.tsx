import type { PortableBlock } from '@/lib/sanity/types'

export default function PortableBody({ blocks }: { blocks: PortableBlock[] }) {
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
