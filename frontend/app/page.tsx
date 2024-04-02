'use client'

import useLoginStatus from '@/lib/useLoginStatus'
import { Box, Title } from '@mantine/core'

const HomePage = () => {
  const authStatus = useLoginStatus()

  return (
    <>
      <Title>Hello World!</Title>
      <Box maw={'100%'} style={{ overflow: 'hidden' }}>
        <pre>{JSON.stringify(authStatus, null, 2)}</pre>
      </Box>
    </>
  )
}

export default HomePage
