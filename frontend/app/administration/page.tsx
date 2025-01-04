'use client'

import { Box, Button, Card, Flex, Text } from '@mantine/core'
import Link from 'next/link'
import { HiOutlineMusicalNote } from 'react-icons/hi2'

const AdministrationPage = () => (
  <Box>
    <Flex h="max-content" gap="md" wrap="wrap">
      <Card radius="md" padding="lg" shadow="sm" maw={382} w="100%">
        <Flex align="center" gap="xs">
          <HiOutlineMusicalNote />
          <Text>Songs</Text>
        </Flex>
        <Text size="sm" c="dimmed">
          List and manage Songs
        </Text>
        <Button
          fullWidth
          mt="md"
          radius="md"
          component={Link}
          href="/administration/songs"
        >
          Manage
        </Button>
      </Card>
    </Flex>
  </Box>
)

export default AdministrationPage
