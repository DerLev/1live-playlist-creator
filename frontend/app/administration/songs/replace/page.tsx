'use client'

import firestoreConverter from '@/lib/firestoreConverter'
import { ApiKeyDocument } from '@/types/firestore/ApiKeyDocument'
import { SongsCollection } from '@/types/firestore/SongsCollection'
import {
  ActionIcon,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  TextInput,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import { collection, doc, getDoc } from 'firebase/firestore'
import Link from 'next/link'
import { redirect, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import {
  HiOutlineArrowPathRoundedSquare,
  HiOutlineLink,
  HiOutlineXMark,
} from 'react-icons/hi2'
import { useFirestore } from 'reactfire'

const SongsReplacePage = () => {
  const queryparams = useSearchParams()
  const docId = queryparams.get('id') || ''

  const firestore = useFirestore()
  const songsCollection = collection(firestore, 'songs').withConverter(
    firestoreConverter<SongsCollection>(),
  )

  const [currentSong, setCurrentSong] = useState<SongsCollection>()
  const [songFetched, setSongFetched] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [apiKeyFetched, setApiKeyFetched] = useState(false)
  const [working, setWorking] = useState(false)

  const fetchSong = useCallback(async () => {
    setSongFetched(true)
    const docRef = doc(songsCollection, docId)
    const docSnap = await getDoc(docRef)
    setCurrentSong(docSnap.data())
  }, [docId, songsCollection])

  const fetchApiKey = useCallback(async () => {
    setApiKeyFetched(true)
    const projectCollection = collection(firestore, 'project')
    const apiKeyDoc = doc(projectCollection, 'apiKey').withConverter(
      firestoreConverter<ApiKeyDocument>(),
    )
    const apiKeySnap = await getDoc(apiKeyDoc)
    const apiKeyData = apiKeySnap.data()
    if (!apiKeyData) throw new Error('ApiKey Doc is empty/non-existent')
    setApiKey(apiKeyData.invocationsKey)
  }, [firestore])

  const executeReplacement = useCallback(
    async (input: { newUri: string }) => {
      setWorking(true)
      const matchedInput = input.newUri.match(
        /((https:\/\/open\.spotify\.com\/track\/)|(spotify:track:)|())[\w\d]{22}(\/)?/,
      )
      if (!matchedInput) throw new Error('Could not match RegEx to Input')
      const id = matchedInput[0]
        .trim()
        .replace(
          /((https:\/\/open\.spotify\.com\/track\/)|(spotify:track:)|())(\/)?/g,
          '',
        )
      await fetch(
        `https://fixsongmismatch-twiavfpdza-ew.a.run.app/?uid=${docId}&newTrackUri=spotify:track:${id}`,
        {
          method: 'PATCH',
          headers: [['Authorization', `Bearer ${apiKey}`]],
        },
      )
      redirect('/administration/songs')
    },
    [apiKey, docId],
  )

  useEffect(() => {
    if (!docId.length) {
      redirect('/administration/songs')
    } else if (!songFetched) {
      fetchSong()
    }
  }, [docId, fetchSong, songFetched])

  useEffect(() => {
    if (!apiKeyFetched) fetchApiKey()
  }, [apiKeyFetched, fetchApiKey])

  const replaceForm = useForm({
    mode: 'uncontrolled',
    initialValues: {
      newUri: '',
    },
    validate: {
      newUri: (value) =>
        value.match(
          /((https:\/\/open\.spotify\.com\/track\/)|(spotify:track:)|())[\w\d]{22}(\/)?/,
        )
          ? null
          : 'Invalid URI',
    },
  })

  if (docId) {
    return (
      <Container maw={420} w={'100%'}>
        <Card p="xl" radius="md">
          <Stack>
            <Group gap="xs" justify="space-between">
              <Text size="lg" fw={800}>
                Replace Song URI
              </Text>
              <ActionIcon
                variant="subtle"
                color="gray"
                radius="xl"
                component={Link}
                href="/administration/songs"
              >
                <HiOutlineXMark />
              </ActionIcon>
            </Group>
            <Text fw={600}>{currentSong?.title}</Text>
            <Text>Current URI: {currentSong?.spotifyTrackUri}</Text>
            <form onSubmit={replaceForm.onSubmit((v) => executeReplacement(v))}>
              <TextInput
                placeholder="New URI"
                variant="filled"
                leftSection={<HiOutlineLink />}
                leftSectionPointerEvents="none"
                radius="md"
                mb="md"
                disabled={working}
                {...replaceForm.getInputProps('newUri')}
              ></TextInput>
              <Button
                fullWidth
                radius="md"
                leftSection={<HiOutlineArrowPathRoundedSquare />}
                type="submit"
                loading={working}
              >
                Replace
              </Button>
            </form>
          </Stack>
        </Card>
      </Container>
    )
  } else {
    return <></>
  }
}

export default SongsReplacePage
