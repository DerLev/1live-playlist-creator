'use client'

import useLoginStatus from '@/lib/useLoginStatus'
import type { PropsWithChildren } from 'react'

const AdministrationLayout = ({ children }: PropsWithChildren) => {
  const { status, hasRequiredClaims } = useLoginStatus({
    requiredClaims: { isAdmin: true },
    behavior: 'onlyUser',
  })

  if (status === 'success' && hasRequiredClaims === true) {
    return children
  } else {
    return <></>
  }
}

export default AdministrationLayout
