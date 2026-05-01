import Link from 'next/link'

export default function DocsFooter() {
  return (
    <footer className="mt-16 pt-6 border-t text-sm text-muted-foreground flex flex-wrap gap-x-6 gap-y-2">
    <a
        href="https://www.ndexbio.org"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >
        NDEx Public Server
      </a>
      <a
        href="https://github.com/ndexbio"
        target="_blank"
        rel="noopener noreferrer"
        className="hover:text-foreground transition-colors"
      >
        GitHub
      </a>
      <Link href="/contact" className="hover:text-foreground transition-colors">
        Contact
      </Link>
    </footer>
  )
}