'use client'

import PlaylistCard from '@/components/PlaylistCard'
import { Box, Flex } from '@mantine/core'
import Image from 'next/image'
import Image1LiveWeeklyTop100 from '@/assets/1live-weekly-top-100-card-image.png'
import Image1LiveNewReleases from '@/assets/1live-new-releases-card-image.png'
import Image1LiveDiggiWeeklyTop100 from '@/assets/1live-diggi-weekly-top-100-card-image.png'
import Image1LiveTodaysPlaylist from '@/assets/1live-todays-playlist-card-image.png'
import Image1LiveDiggiTodaysPlaylist from '@/assets/1live-diggi-todays-playlist-card-image.png'

const HomePage = () => {
  return (
    <Box>
      <Flex h="max-content" gap="md" wrap="wrap" justify="center">
        <PlaylistCard
          description="The Top 100 songs of the last 7 days. Calculated with all songs played from 6am to 7pm on 1LIVE"
          image={
            <Image
              src={Image1LiveWeeklyTop100}
              alt="1LIVE weekly Top 100"
              width={380}
              height={180}
              style={{
                height: 'auto',
                width: '100%',
              }}
            />
          }
          navigateLocation="/"
          onLikeClick={() =>
            window.open(
              'https://open.spotify.com/playlist/6bh1OihjOBd8W5RDHyHdzP',
              '_blank',
              'noopener,noreferrer',
            )
          }
          station="1live"
          title="Weekly Top 100"
        />
        <PlaylistCard
          description={
            <>
              The current &quot;Neu für den Sektor&quot;-Show from the radio
              station 1LIVE - Updated every Monday at noon
            </>
          }
          image={
            <Image
              src={Image1LiveNewReleases}
              alt="1LIVE new releases programm"
              width={380}
              height={180}
              style={{
                height: 'auto',
                width: '100%',
              }}
            />
          }
          navigateLocation="/"
          onLikeClick={() =>
            window.open(
              'https://open.spotify.com/playlist/2CeM2BTnq1gncyH8ufkGk6',
              '_blank',
              'noopener,noreferrer',
            )
          }
          station="1live"
          title="Neu für den Sektor"
        />
        <PlaylistCard
          description="The Top 100 songs of the last 7 days. Calculated with all songs played from 6am to 7pm on 1LIVE DIGGI"
          image={
            <Image
              src={Image1LiveDiggiWeeklyTop100}
              alt="1LIVE Diggi weekly Top 100"
              width={380}
              height={180}
              style={{
                height: 'auto',
                width: '100%',
              }}
            />
          }
          navigateLocation="/"
          onLikeClick={() =>
            window.open(
              'https://open.spotify.com/playlist/1xNqr6xVfh6VLuEh2SAOys',
              '_blank',
              'noopener,noreferrer',
            )
          }
          station="1liveDiggi"
          title="Weekly Top 100"
        />
        <PlaylistCard
          description="Today's songs played on 1LIVE - Updated every hour from 6am to 7pm"
          image={
            <Image
              src={Image1LiveTodaysPlaylist}
              alt="1LIVE todays playlist"
              width={380}
              height={180}
              style={{
                height: 'auto',
                width: '100%',
              }}
            />
          }
          navigateLocation="/"
          onLikeClick={() => {}}
          station="1live"
          title="Today's playlist"
          likeDisabled
        />
        <PlaylistCard
          description="Today's songs played on 1LIVE DIGGI - Updated every hour from 6am to 7pm"
          image={
            <Image
              src={Image1LiveDiggiTodaysPlaylist}
              alt="1LIVE Diggi todays playlist"
              width={380}
              height={180}
              style={{
                height: 'auto',
                width: '100%',
              }}
            />
          }
          navigateLocation="/"
          onLikeClick={() => {}}
          station="1liveDiggi"
          title="Today's playlist"
          likeDisabled
        />
      </Flex>
    </Box>
  )
}

export default HomePage
