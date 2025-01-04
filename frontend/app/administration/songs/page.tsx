'use client'

import firestoreConverter from '@/lib/firestoreConverter'
import msToTime from '@/lib/msToTime'
import { ArtistsCollection } from '@/types/firestore/ArtistsCollection'
import { SongsCollection } from '@/types/firestore/SongsCollection'
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  Flex,
  Group,
  Image,
  Modal,
  Stack,
  Table,
  Text,
  TextInput,
  ThemeIcon,
} from '@mantine/core'
import {
  collection,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import { useCallback, useEffect, useState } from 'react'
import { FaSpotify } from 'react-icons/fa'
import {
  HiOutlineArrowPathRoundedSquare,
  HiOutlineClipboard,
  HiOutlineMagnifyingGlass,
} from 'react-icons/hi2'
import { useFirestore } from 'reactfire'
import { useForm } from '@mantine/form'

type SongsCollectionResolved = Omit<SongsCollection, 'artists'> & {
  artists: ArtistsCollection[]
  docId: string
}

const SongsPage = () => {
  const firestore = useFirestore()
  const songsCollection = collection(firestore, 'songs').withConverter(
    firestoreConverter<SongsCollection>(),
  )
  const songsQuery = query(
    songsCollection,
    orderBy('firstSeen', 'desc'),
    limit(30),
  )

  const [songsFetched, setSongsFetched] = useState(false)
  const [songsArray, setSongsArray] = useState<SongsCollectionResolved[]>([])
  const [searchQueryFilter, setSearchQueryFilter] = useState('')
  const [prevSearchQueryFilter, setPrevSearchQueryFilter] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSongIndex, setModalSongIndex] = useState(0)

  const searchQueryFilterFront = searchQueryFilter.slice(
    0,
    searchQueryFilter.length - 1,
  )
  const searchQueryFilterBack = searchQueryFilter.slice(
    searchQueryFilter.length - 1,
    searchQueryFilter.length,
  )
  const searchQueryFilterWithModifiedEnd =
    searchQueryFilterFront +
    String.fromCharCode(searchQueryFilterBack.charCodeAt(0) + 1)

  const songsSearchQuery = query(
    songsCollection,
    where('searchString', '>=', searchQueryFilter),
    where('searchString', '<', searchQueryFilterWithModifiedEnd),
    orderBy('firstSeen', 'desc'),
    limit(30),
  )

  const fetchSongs = useCallback(async () => {
    setSongsFetched(true)
    const finalQuery = searchQueryFilter.length ? songsSearchQuery : songsQuery
    const queryResult = await getDocs(finalQuery)
    const queryResultWithResolvedArtistsPromises = queryResult.docs.map(
      async (doc) => {
        const docData = doc.data()

        const newArtists = (
          await Promise.all(
            docData.artists.map(async (artist) => {
              return (await getDoc(artist)).data()
            }),
          )
        ).filter((element) => element !== undefined)

        return { ...docData, artists: newArtists, docId: doc.id }
      },
    )
    const queryResultWithResolvedArtists = await Promise.all(
      queryResultWithResolvedArtistsPromises,
    )
    setSongsArray(queryResultWithResolvedArtists)
  }, [songsQuery, songsSearchQuery, searchQueryFilter.length])

  useEffect(() => {
    if (!songsFetched) fetchSongs()
  }, [fetchSongs, songsFetched])

  useEffect(() => {
    if (prevSearchQueryFilter !== searchQueryFilter.length) {
      setModalSongIndex(0)
      setPrevSearchQueryFilter(searchQueryFilter.length)
      fetchSongs()
    }
  }, [fetchSongs, prevSearchQueryFilter, searchQueryFilter.length])

  const searchForm = useForm({
    mode: 'uncontrolled',
    initialValues: {
      search: '',
    },
  })

  return (
    <Box>
      {(songsArray.length && (
        <Modal
          opened={modalOpen}
          onClose={() => setModalOpen(false)}
          centered
          withCloseButton={false}
          radius="md"
        >
          <Stack gap={0}>
            <Image
              src={songsArray[modalSongIndex].coverArt[0].url}
              alt={songsArray[modalSongIndex].title + ' Cover Art'}
              radius="md"
              mb="md"
            />
            <Group gap="xs" style={{ rowGap: 0 }}>
              <Text size='xl' fw={700}>{songsArray[modalSongIndex].title}</Text>
              {songsArray[modalSongIndex].explicit && (
                <Badge radius="sm" color='gray'>Explicit</Badge>
              ) || null}
            </Group>
            <Text c="dimmed" mb="md">
              {songsArray[modalSongIndex].artists
                .map((artist) => artist.name)
                .join(', ')}
            </Text>
            <Text>
              Duration: {msToTime(songsArray[modalSongIndex].duration)}
            </Text>
            <Text>
              Released:{' '}
              {songsArray[modalSongIndex].released
                .toDate()
                .toLocaleDateString()}
            </Text>
            <Text mb="md">
              First Seen:{' '}
              {songsArray[modalSongIndex].firstSeen
                .toDate()
                .toLocaleDateString()}
            </Text>
            <Text>
              Spotify Track URI:
            </Text>
            <Group gap={0} mb="md">
              <Code>{songsArray[modalSongIndex].spotifyTrackUri}</Code>
              <ActionIcon size="sm" color='gray' variant='transparent' onClick={() => navigator.clipboard.writeText(songsArray[modalSongIndex].spotifyTrackUri)}>
                <HiOutlineClipboard />
              </ActionIcon>
            </Group>
            <Text>Search String:</Text>
            <Code mb="md">
              {songsArray[modalSongIndex].searchString}
            </Code>
            <Button
              fullWidth
              radius="md"
              color="#1f1b1b"
              component="a"
              href={
                'https://open.spotify.com/track/' +
                songsArray[modalSongIndex].spotifyTrackUri.split(':')[2]
              }
              target="_blank"
              leftSection={<FaSpotify fill="#25d865" />}
            >
              View on Spotify
            </Button>
          </Stack>
        </Modal>
      )) ||
        null}
      <form
        onSubmit={searchForm.onSubmit((v) => setSearchQueryFilter(v.search))}
      >
        <Flex justify="center" align="center" gap="xs" mb="md">
          <TextInput
            radius="xl"
            leftSection={<HiOutlineMagnifyingGlass />}
            leftSectionPointerEvents="none"
            placeholder="Search against search strings"
            w={240}
            {...searchForm.getInputProps('search')}
          ></TextInput>
          <Button radius="xl" variant="default" type="submit">
            Search
          </Button>
        </Flex>
      </form>
      <Table stickyHeader stickyHeaderOffset={60} highlightOnHover>
        <Table.Thead>
          <Table.Tr>
            <Table.Th>Title</Table.Th>
            <Table.Th>Duration</Table.Th>
            <Table.Th>Actions</Table.Th>
          </Table.Tr>
        </Table.Thead>
        <Table.Tbody>
          {songsArray.map((song, index) => {
            const coverArtIndex =
              song.coverArt.length - 2 < 0 ? 0 : song.coverArt.length - 2
            return (
              <Table.Tr
                key={song.docId}
                onClick={() => {
                  setModalSongIndex(index)
                  setModalOpen(true)
                }}
              >
                <Table.Td>
                  <Group wrap="nowrap">
                    <Image
                      src={song.coverArt[coverArtIndex].url}
                      alt={song.title + ' Cover Art'}
                      w={48}
                      h={48}
                      radius="md"
                    />
                    <Stack gap={0}>
                      <Text size="sm">
                        {song.title}
                        {song.explicit && (
                          <>
                            {' '}<ThemeIcon variant='filled' size="xs" color='gray'>E</ThemeIcon>
                          </>
                        ) || null}
                      </Text>
                      <Text c="dimmed" size="sm">
                        {song.artists.map((artist) => artist.name).join(', ')}
                      </Text>
                      {(searchQueryFilter.length && (
                        <Code block>{song.searchString}</Code>
                      )) ||
                        null}
                    </Stack>
                  </Group>
                </Table.Td>
                <Table.Td>{msToTime(song.duration)}</Table.Td>
                <Table.Td>
                  <Group gap="xs">
                    <Button
                      radius="md"
                      size="compact-sm"
                      leftSection={<HiOutlineArrowPathRoundedSquare />}
                      variant="light"
                      // component={Link}
                      // href={'/administration/songs/replace?id=' + song.docId}
                      // onClick={(e) => e.stopPropagation()}
                      disabled
                    >
                      Replace
                    </Button>
                    <ActionIcon
                      radius="md"
                      color="#1f1b1b"
                      component="a"
                      href={
                        'https://open.spotify.com/track/' +
                        song.spotifyTrackUri.split(':')[2]
                      }
                      target="_blank"
                      variant="light"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FaSpotify fill="#25d865" />
                    </ActionIcon>
                  </Group>
                </Table.Td>
              </Table.Tr>
            )
          })}
        </Table.Tbody>
      </Table>
      {(!songsArray.length && (
        <Text ta="center" mt="sm" c="dimmed" fs="italic">
          There is no data to show
        </Text>
      )) ||
        null}
      {/* <Text ta="center" mt="md" c="dimmed" fs="italic">Loading more...</Text> */}
    </Box>
  )
}

export default SongsPage
