import { notFound } from 'next/navigation'

import CreateAccount from '../content/create-an-ndex-account'
import Finding from '../content/finding-and-querying'
import Sharing from '../content/sharing-and-accessing'
import Publishing from '../content/publishing'
import Practices from '../content/developers-best-practices'
import NdexApi from '../content/using-the-ndex-api'
import Model from '../content/data-model'

const DOCS: Record<string, React.FC> = {
  'create-an-ndex-account': CreateAccount,
  'finding-and-querying': Finding,
  'sharing-and-accessing': Sharing,
  'publishing': Publishing,
  'developers-best-practices': Practices,
  'using-the-ndex-api': NdexApi,
  'data-model': Model
}
export function generateStaticParams() {
  return Object.keys(DOCS).map((slug) => ({ slug }))
}
export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params   // ✅ no React.use needed

  const Page = DOCS[slug]

  if (!Page) return notFound()

  return <Page />
}