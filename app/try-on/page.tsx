'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function TryOnPage() {
  const router = useRouter()

  useEffect(() => {
    router.push('/try-on/human')
  }, [])

  return null
}