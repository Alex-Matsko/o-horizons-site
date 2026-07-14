import Navbar from '@/components/layout/Navbar'
import Footer from '@/components/layout/Footer'

export default async function PrivacyPolicyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  return (
    <>
      <Navbar locale={locale} />
      <main className="flex-1 pt-24 pb-20 px-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-[#e2e8f0] mb-8">Политика конфиденциальности</h1>
          <div className="text-[#64748b] space-y-4 text-sm leading-relaxed">
            <p>Содержимое политики конфиденциальности будет добавлено владельцем сайта.</p>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </>
  )
}
