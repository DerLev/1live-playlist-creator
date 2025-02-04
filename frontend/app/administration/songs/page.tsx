'use client'

import firestoreConverter from '@/lib/firestoreConverter'
import { ArtistsCollection } from '@/types/firestore/ArtistsCollection'
import { SongsCollection } from '@/types/firestore/SongsCollection'
import {
  ActionIcon,
  Anchor,
  Badge,
  Box,
  Button,
  Checkbox,
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
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  QueryDocumentSnapshot,
  startAfter,
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
import Link from 'next/link'
import { numberFormatter, msToTime } from '@/lib/formatters'

type SongsCollectionResolved = Omit<SongsCollection, 'artists'> & {
  artists: ArtistsCollection[]
  docId: string
}

const PAGE_SIZE = 30

const SongsPage = () => {
  const firestore = useFirestore()
  const songsCollection = collection(firestore, 'songs').withConverter(
    firestoreConverter<SongsCollection>(),
  )
  const songsQuery = query(
    songsCollection,
    orderBy('firstSeen', 'desc'),
    limit(PAGE_SIZE),
  )

  const [initialFetch, setInitialFetch] = useState(false)
  const [songsArray, setSongsArray] = useState<SongsCollectionResolved[]>([])
  const [searchQueryFilter, setSearchQueryFilter] = useState('')
  const [prevSearchQueryFilter, setPrevSearchQueryFilter] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [modalSongIndex, setModalSongIndex] = useState(0)
  const [showSearchStrings, setShowSearchStrings] = useState(false)
  const [totalSongsCount, setTotalSongsCount] = useState(0)
  const [querySongsCount, setQuerySongsCount] = useState(0)
  const [lastDocSnapshot, setLastDocSnapshot] =
    useState<QueryDocumentSnapshot<SongsCollection>>()

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

  const spotifyUriRegex =
    /((https:\/\/open\.spotify\.com\/track\/)|(spotify:track:))[\w\d]{22}(\/)?/
  const searchQueryMatchesSpotifyUri = searchQueryFilter.match(spotifyUriRegex)

  const songsSearchQuery = searchQueryMatchesSpotifyUri
    ? query(
        songsCollection,
        where(
          'spotifyTrackUri',
          '==',
          'spotify:track:' +
            searchQueryMatchesSpotifyUri[0]
              .trim()
              .replace(
                /((https:\/\/open\.spotify\.com\/track\/)|(spotify:track:)|())(\/)?/g,
                '',
              ),
        ),
        orderBy('firstSeen', 'desc'),
      )
    : query(
        songsCollection,
        where('searchString', '>=', searchQueryFilter),
        where('searchString', '<', searchQueryFilterWithModifiedEnd),
        orderBy('firstSeen', 'desc'),
      )

  /**
   * Fetches the next page of songs
   * @param {Boolean} [refetch=false] Replace the current array of songs
   * @returns {Promise<void>}
   */
  const fetchSongs = useCallback(
    async (refetch = false) => {
      const finalQuery = searchQueryFilter.length
        ? query(songsSearchQuery, limit(PAGE_SIZE))
        : songsQuery
      const queryResult = await getDocs(
        refetch ? finalQuery : query(finalQuery, startAfter(lastDocSnapshot)),
      )
      const queryResultWithResolvedArtistsPromises = queryResult.docs.map(
        async (doc, index) => {
          if (index === queryResult.docs.length - 1) {
            setLastDocSnapshot(doc)
          }

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
      if (searchQueryFilter.length) {
        const queryCount = await getCountFromServer(songsSearchQuery)
        setQuerySongsCount(queryCount.data().count)
      }
      if (refetch) {
        setSongsArray(queryResultWithResolvedArtists)
      } else {
        setSongsArray((arr) => [...arr, ...queryResultWithResolvedArtists])
      }
    },
    [songsQuery, songsSearchQuery, searchQueryFilter.length, lastDocSnapshot],
  )

  /**
   * Gets the count of all songs in the database
   * @returns {Promise<void>}
   */
  const countSongs = useCallback(async () => {
    const count = await getCountFromServer(songsCollection)
    setTotalSongsCount(count.data().count)
  }, [songsCollection])

  useEffect(() => {
    if (!initialFetch) {
      setInitialFetch(true)
      fetchSongs(true)
      countSongs()
    }
  }, [fetchSongs, initialFetch, countSongs])

  useEffect(() => {
    if (prevSearchQueryFilter !== searchQueryFilter.length) {
      setModalSongIndex(0)
      setPrevSearchQueryFilter(searchQueryFilter.length)
      fetchSongs(true)
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
              <Text size="xl" fw={700}>
                {songsArray[modalSongIndex].title}
              </Text>
              {(songsArray[modalSongIndex].explicit && (
                <Badge radius="sm" color="gray">
                  Explicit
                </Badge>
              )) ||
                null}
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
            <Text>Spotify Track URI:</Text>
            <Group gap={0} mb="md">
              <Code>{songsArray[modalSongIndex].spotifyTrackUri}</Code>
              <ActionIcon
                size="sm"
                color="gray"
                variant="transparent"
                onClick={() =>
                  navigator.clipboard.writeText(
                    songsArray[modalSongIndex].spotifyTrackUri,
                  )
                }
              >
                <HiOutlineClipboard />
              </ActionIcon>
            </Group>
            <Text>Search String:</Text>
            <Code mb="md">{songsArray[modalSongIndex].searchString}</Code>
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
      <Group justify="center" mb="md">
        <form
          onSubmit={searchForm.onSubmit((v) => setSearchQueryFilter(v.search))}
        >
          <Flex justify="center" align="center" gap="xs">
            <TextInput
              radius="xl"
              leftSection={<HiOutlineMagnifyingGlass />}
              leftSectionPointerEvents="none"
              placeholder="Search songs"
              w={240}
              {...searchForm.getInputProps('search')}
            ></TextInput>
            <Button radius="xl" variant="default" type="submit">
              Search
            </Button>
          </Flex>
        </form>
        <Checkbox
          label="Show Search Strings"
          disabled={!!searchQueryFilter.length}
          checked={showSearchStrings || !!searchQueryFilter.length}
          onChange={() => setShowSearchStrings((v) => !v)}
        />
      </Group>
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
                        {(song.explicit && (
                          <>
                            {' '}
                            <ThemeIcon variant="filled" size="xs" color="gray">
                              E
                            </ThemeIcon>
                          </>
                        )) ||
                          null}
                      </Text>
                      <Text c="dimmed" size="sm">
                        {song.artists.map((artist) => artist.name).join(', ')}
                      </Text>
                      {((searchQueryFilter.length || showSearchStrings) && (
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
                      component={Link}
                      href={'/administration/songs/replace?id=' + song.docId}
                      onClick={(e) => e.stopPropagation()}
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
      <Group mt="md" justify="center" gap="lg">
        <Text c="dimmed" fs="italic">
          Showing {numberFormatter(songsArray.length)} of{' '}
          {numberFormatter(
            searchQueryFilter.length ? querySongsCount : totalSongsCount,
          )}{' '}
          Songs
        </Text>
        {!(songsArray.length % PAGE_SIZE) && songsArray.length && (
          <Anchor component="button" fs="italic" onClick={() => fetchSongs()}>
            Load more
          </Anchor>
        )}
      </Group>
    </Box>
  )
}

export default SongsPage
