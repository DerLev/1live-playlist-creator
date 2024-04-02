'use client'

import useLoginStatus from '@/lib/useLoginStatus'
import { Title } from '@mantine/core'
import { useEffect } from 'react'
import { useAuth } from 'reactfire'

const LogoutPage = () => {
  const {} = useLoginStatus({ behavior: 'onlyUser' })
  const auth = useAuth()

  useEffect(() => {
    auth.signOut()
  }, [auth])

  return (
    <Title ta="center" c="dark.2" fw={800}>
      Logging you out...
    </Title>
  )
}

export default LogoutPage
