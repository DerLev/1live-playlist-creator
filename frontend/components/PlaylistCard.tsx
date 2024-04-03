'use client'

import {
  ActionIcon,
  Badge,
  Button,
  Card,
  CardSection,
  Group,
  Stack,
  Text,
  useMantineTheme,
} from '@mantine/core'
import Link from 'next/link'
import { HiOutlineHeart } from 'react-icons/hi2'

interface PlaylistCardProps {
  liked?: boolean
  onLikeClick: () => void
  navigateLocation: string
  image: React.ReactNode
  title: string
  description: React.ReactNode
  station: '1live' | '1liveDiggi'
  likeDisabled?: boolean
}

const PlaylistCard = ({
  image,
  liked,
  navigateLocation,
  onLikeClick,
  description,
  station,
  title,
  likeDisabled,
}: PlaylistCardProps) => {
  const theme = useMantineTheme()

  return (
    <Card
      withBorder
      radius="md"
      p="md"
      maw={382}
      w="100%"
      shadow="md"
      style={{ display: 'flex', flexDirection: 'column' }}
    >
      <CardSection>{image}</CardSection>
      <CardSection mt="xs" p="md">
        <Group align="center" gap="xs">
          <Badge
            variant="light"
            color={(() => {
              switch (station) {
                case '1live':
                  return 'grape'
                case '1liveDiggi':
                  return 'indigo'
                default:
                  return 'blue'
              }
            })()}
          >
            {(() => {
              switch (station) {
                case '1liveDiggi':
                  return '1LIVE DIGGI'
                default:
                  return station
              }
            })()}
          </Badge>
          <Text fz="lg" fw={500}>
            {title}
          </Text>
        </Group>
        <Text fz="sm" mt="xs">
          {description}
        </Text>
      </CardSection>
      <Stack style={{ flex: 1 }} justify="end">
        <Group mt="xs">
          <Button
            style={{ flex: 1 }}
            radius="md"
            component={Link}
            href={navigateLocation}
            /* TODO: Remove when pages are created */
            disabled
          >
            Show details
          </Button>
          <ActionIcon
            variant="default"
            radius="md"
            size={36}
            onClick={onLikeClick}
            disabled={likeDisabled}
          >
            <HiOutlineHeart
              strokeWidth={2}
              color={theme.colors.red[6]}
              fill={liked ? 'currentColor' : 'none'}
              opacity={likeDisabled ? 0.45 : 1}
            />
          </ActionIcon>
        </Group>
      </Stack>
    </Card>
  )
}

export default PlaylistCard
