import type { PortableBlock } from '@/lib/sanity/types'

export default function PortableBody({ blocks }: { blocks: PortableBlock[] }) {
  return (
    <div className="prose prose-invert max-w-none">
      {blocks.map(block => {
        const text = block.children?.map(c => c.text).join('') ?? ''
        if (!text) return null
        if (block.style === 'h3') {
          return <h3 key={block._key} className="text-base font-semibold text-[#cbd5e1] mt-7 mb-2">{text}</h3>
        }
        if (block.style === 'h2') {
          return <h2 key={block._key} className="text-lg font-semibold text-[#e2e8f0] mt-8 mb-3">{text}</h2>
        }
        return <p key={block._key} className="text-sm text-[#94a3b8] leading-[1.8] mb-3">{text}</p>
      })}
    </div>
  )
}
