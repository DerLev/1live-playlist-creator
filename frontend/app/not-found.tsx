import { Button, Stack, Text, Title } from '@mantine/core'
import Link from 'next/link'
import { HiOutlineHomeModern } from 'react-icons/hi2'

const NotFound = () => (
  <Stack align="center" gap="lg">
    <Stack gap={0} align="center" pb="sm">
      <Title size={'10rem'} c="dark.2" fw={900}>
        404
      </Title>
      <Title size={'3rem'} fw={800}>
        Not Found
      </Title>
    </Stack>
    <Text c="dark.2" fw={600} ta="center">
      You&apos;ve reached a page we couldn&apos;t find
    </Text>
    <Button
      variant="subtle"
      leftSection={<HiOutlineHomeModern />}
      component={Link}
      href="/"
    >
      Go back home
    </Button>
  </Stack>
)

export default NotFound
