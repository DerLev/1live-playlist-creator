'use client'

import useLoginStatus from '@/lib/useLoginStatus'
import { CreateRedirectInput, CreateRedirectOutput } from '@/types/functions'
import { Button, Container, Card, Stack, Text } from '@mantine/core'
import { httpsCallable } from 'firebase/functions'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { FaSpotify } from 'react-icons/fa'
import { useFunctions } from 'reactfire'

const LoginPage = () => {
  const {} = useLoginStatus({ behavior: 'notUser' })
  const functions = useFunctions()
  const router = useRouter()

  const [disabled, setDisabled] = useState(false)

  const loginWithSpotify = async () => {
    setDisabled(true)
    const createRedirect = httpsCallable<
      CreateRedirectInput,
      CreateRedirectOutput
    >(functions, 'createRedirect')

    try {
      const res = await createRedirect({
        local: process.env.NODE_ENV !== 'production',
      })
      router.push(res.data.authUrl)
    } catch (err) {
      /* eslint-disable-next-line no-console */
      console.error(err)
      setDisabled(false)
    }
  }

  return (
    <Container maw={420} w={'100%'}>
      <Card radius="md" padding="lg" shadow="sm">
        <Text size="lg" fw={500}>
          Welcome, login with
        </Text>
        <Stack mt="md">
          <Button
            color="#1f1b1b"
            leftSection={<FaSpotify fill="#25d865" />}
            radius="xl"
            fullWidth
            loading={disabled}
            onClick={() => loginWithSpotify()}
          >
            Login with Spotify
          </Button>
        </Stack>
      </Card>
    </Container>
  )
}

export default LoginPage
