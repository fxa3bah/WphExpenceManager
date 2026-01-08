'use client'

import Link from 'next/link'

export default function FAB() {
  return (
    <Link href="/expenses/new" className="fab">
      +
    </Link>
  )
}
