'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Link from 'next/link'

interface FAQItem {
  question: string
  answer: React.ReactNode
}

const faqItems: FAQItem[] = [
  {
    question: 'What is NDEx?',
    answer: (
      <>
        NDEx is a software infrastructure that allows you to store, access,
        manage, and visualize different types of network models. NDEx is fully
        integrated with the{' '}
        <a href="https://www.cytoscape.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Cytoscape
        </a>{' '}
        desktop application, can be used via its intuitive web user interface,
        and although it is heavily committed to biological networks, it can
        accommodate any type of network model.
      </>
    ),
  },
  {
    question: 'How do I cite NDEx?',
    answer: (
      <>
        If you use NDEx in your work, please cite the following publications:
        <ul className="mt-2 ml-4 space-y-1 list-disc">
          <li>
            Pillich et al.{' '}
            <a href="https://doi.org/10.1002/cpz1.258" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              NDEx: Accessing Network Models and Streamlining Network Biology Workflows
            </a>
            . <em>Curr Protoc</em>. Sep;1(9):e258 (2021).
          </li>
          <li>
            Pratt et al.{' '}
            <a href="https://doi.org/10.1158/0008-5472.CAN-17-0606" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              NDEx 2.0: A Clearinghouse for Research on Cancer Pathways
            </a>
            . <em>Cancer Res</em>. Nov 1;77(21):e58-e61 (2017).
          </li>
          <li>
            Pillich et al.{' '}
            <a href="https://doi.org/10.1007/978-1-4939-6783-4_13" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              NDEx: A Community Resource for Sharing and Publishing of Biological Networks
            </a>
            . <em>Methods Mol Biol</em>. 1558: 271-301 (2017).
          </li>
          <li>
            Pratt et al.{' '}
            <a href="https://doi.org/10.1016/j.cels.2015.10.001" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
              NDEx, the Network Data Exchange
            </a>
            . <em>Cell Syst</em>. Vol. 1, Issue 4: 302-305 (2015).
          </li>
        </ul>
      </>
    ),
  },
  {
    question: 'Is NDEx free to use?',
    answer: (
      <>
        Absolutely! NDEx is an academic, not-for-profit, open-source project and
        is <strong>100% free</strong>. When you create an NDEx account, you
        receive <strong>10 GB</strong> of free cloud storage for your networks.
      </>
    ),
  },
  {
    question: 'Do I need to create an account to use NDEx?',
    answer: (
      <>
        No — you can always search, query, and download public networks without
        an account. However, with an NDEx account you can also save networks and
        query results, upload your own data, request DOIs, and share networks
        with collaborators. Plus you get 10 GB of free cloud storage.
      </>
    ),
  },
  {
    question: 'How do I search for networks in NDEx?',
    answer: (
      <>
        Just use the <strong>Search</strong> bar at the top of the page! You can
        search for networks, users, and groups all at once. For more details,
        see the{' '}
        <a href="https://home.ndexbio.org/finding-and-querying-networks/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Finding and Querying manual
        </a>
        .
      </>
    ),
  },
  {
    question: 'How do I create an NDEx account?',
    answer: (
      <>
        Visit the{' '}
        <a href="https://www.ndexbio.org" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          NDEx Public Server
        </a>{' '}
        and click the &ldquo;Login&rdquo; button. If you have a Google account,
        you can sign up with Google and your account will be created in seconds.
        For a step-by-step guide, see{' '}
        <a href="https://home.ndexbio.org/create-an-ndex-account/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Creating an Account
        </a>
        .
      </>
    ),
  },
  {
    question: 'How can I load my networks to NDEx?',
    answer: (
      <>
        You can load networks in several ways: through Cytoscape (if you can
        open your network in Cytoscape, you can save it to NDEx), using a custom
        program/script via the API, or through the web UI if your networks are
        in CX format. See the{' '}
        <a href="https://home.ndexbio.org/sharing-and-accessing-networks/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Uploading and Sharing guide
        </a>{' '}
        for details.
      </>
    ),
  },
  {
    question: 'Is my data safe in NDEx?',
    answer: (
      <>
        We take security and privacy seriously. The NDEx Public Server is hosted
        by Amazon Web Services (AWS), and the database is backed up daily. You
        always control who has access to your networks by setting their privacy
        level (Public or Private) and by managing access permissions (read, edit,
        or admin) for other NDEx users and groups.
      </>
    ),
  },
  {
    question: 'Can I share my networks with collaborators?',
    answer: (
      <>
        Yes! You can share networks internally (with other NDEx users and
        groups) or externally by using a network&apos;s <strong>Shareable URL</strong>,
        similar to Dropbox or Google Drive. See the{' '}
        <a href="https://home.ndexbio.org/sharing-and-accessing-networks/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Sharing guide
        </a>{' '}
        for details.
      </>
    ),
  },
  {
    question: 'Can I create my own workgroups?',
    answer: (
      <>
        Yes, you can create as many workgroups as you want and invite other NDEx
        users to join for collaboration. See{' '}
        <a href="https://home.ndexbio.org/creating-and-using-groups/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Creating and Using Groups
        </a>
        .
      </>
    ),
  },
  {
    question: 'Will my networks display the same in NDEx and Cytoscape?',
    answer: (
      <>
        In 99% of cases, yes. In some rare cases there could be slight
        differences — we are actively working to achieve 100% mapping fidelity.
        If you experience differences, please{' '}
        <Link href="/contact" className="text-primary hover:underline">
          contact us
        </Link>
        .
      </>
    ),
  },
  {
    question: 'Can I have an account for my analysis pipelines?',
    answer: (
      <>
        Yes. You can create an account and access it programmatically from your
        scripts and applications using our client libraries. Visit the{' '}
        <a href="https://home.ndexbio.org/readme-developers-best-practices/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Developer&apos;s README
        </a>{' '}
        for more information.
      </>
    ),
  },
  {
    question: 'How many networks can I have in my account?',
    answer: (
      <>
        Anywhere from a few networks to tens of thousands, depending on the size
        and complexity. The larger and more annotated the networks, the fewer
        you&apos;ll be able to store in your 10 GB of allotted space. If you
        need more storage,{' '}
        <Link href="/contact" className="text-primary hover:underline">
          contact us
        </Link>{' '}
        and we&apos;ll be happy to help.
      </>
    ),
  },
  {
    question: 'Can I request a DOI for my networks?',
    answer: (
      <>
        Yes! You can request Digital Object Identifiers (DOIs) for your networks
        to use in peer-reviewed publications, grant proposals, and
        presentations. Requesting a DOI is 100% free. See the{' '}
        <a href="https://home.ndexbio.org/publishing-in-ndex/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          Publishing in NDEx guide
        </a>
        .
      </>
    ),
  },
  {
    question: 'My networks are ready for public distribution — what now?',
    answer: (
      <>
        Once your network is accepted for publication or ready for public
        distribution, make sure it is well annotated (meaningful title, clear
        description, full reference), its visibility is set to PUBLIC, and the
        &ldquo;Read-only&rdquo; checkbox is marked to prevent accidental
        changes.
      </>
    ),
  },
  {
    question: 'Is NDEx recommended by publishers?',
    answer: (
      <>
        Yes. NDEx is officially recommended by Springer Nature, Scientific Data,
        and the PLOS family of journals. NDEx complies with FAIR principles and
        is registered on{' '}
        <a href="https://fairsharing.org/FAIRsharing.8nq9t6" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
          FAIRsharing.org
        </a>
        .
      </>
    ),
  },
]

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(0)

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <div>
      <h1 className="text-3xl font-bold tracking-tight mb-8">
        Frequently Asked Questions
      </h1>
      <div className="space-y-2">
        {faqItems.map((item, index) => (
          <div key={index} className="rounded-lg border bg-card">
            <button
              onClick={() => toggle(index)}
              className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium hover:bg-muted/50 rounded-lg transition-colors"
            >
              <span>{item.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  openIndex === index ? 'rotate-180' : ''
                }`}
              />
            </button>
            {openIndex === index && (
              <div className="px-4 pb-4 text-sm text-muted-foreground leading-relaxed">
                {item.answer}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}