import useLoginStatus from '@/lib/useLoginStatus'
import {
  Anchor,
  Burger,
  Button,
  Group,
  Skeleton,
  Title,
  AppShellHeader as MAppShellHeader,
  UnstyledButton,
  Avatar,
  Text,
  Menu,
  MenuTarget,
  MenuDropdown,
  MenuLabel,
  MenuItem,
} from '@mantine/core'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HiOutlineArrowLeftOnRectangle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineUser,
} from 'react-icons/hi2'

interface HeaderProps {
  navOpen: boolean
  toggleNavOpen: () => void
}

const AppShellHeader = ({ navOpen, toggleNavOpen }: HeaderProps) => {
  const { status, signedIn, user } = useLoginStatus()
  const pathname = usePathname()

  return (
    <MAppShellHeader px={'md'}>
      <Group justify="space-between" h={'100%'} align="center">
        <Group gap={'xs'}>
          <Burger
            opened={navOpen}
            size={'sm'}
            display={{ base: 'block', sm: 'none' }}
            onClick={() => toggleNavOpen()}
          />
          <Anchor component={Link} href="/" c="dark.0">
            <Title size="h3">1LIVE playlist creator</Title>
          </Anchor>
        </Group>
        {signedIn && pathname !== '/callback' ? (
          <Menu shadow="md" width={220} position="bottom-end">
            <MenuTarget>
              <UnstyledButton>
                <Group mr={{ base: 0, sm: 'md' }} align="center">
                  <Avatar>
                    {user.photoURL?.length ? (
                      <Image
                        src={user.photoURL}
                        width={38}
                        height={38}
                        alt={user.displayName + ' Avatar'}
                      ></Image>
                    ) : (
                      <HiOutlineUser />
                    )}
                  </Avatar>
                  <Text display={{ base: 'none', sm: 'block' }}>
                    {user.displayName}
                  </Text>
                </Group>
              </UnstyledButton>
            </MenuTarget>

            <MenuDropdown>
              <MenuLabel>{user.displayName}</MenuLabel>
              <MenuItem
                component={Link}
                href="/auth/logout"
                leftSection={<HiOutlineArrowRightOnRectangle />}
                color="red"
              >
                Logout
              </MenuItem>
            </MenuDropdown>
          </Menu>
        ) : (
          <Skeleton
            width={'max-content'}
            visible={status !== 'success' || pathname === '/callback'}
            animate={pathname !== '/callback'}
            display={{ base: 'none', sm: 'block' }}
          >
            <Button
              variant="subtle"
              component={Link}
              href="/auth/login"
              leftSection={<HiOutlineArrowLeftOnRectangle />}
            >
              Login
            </Button>
          </Skeleton>
        )}
      </Group>
    </MAppShellHeader>
  )
}

export default AppShellHeader
