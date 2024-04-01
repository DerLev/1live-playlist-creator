'use client'

import {
  AppShell as MAppShell,
  AppShellMain,
  AppShellHeader,
  Group,
  Title,
  Burger,
  AppShellNavbar,
  AppShellSection,
  ScrollArea,
  NavLink,
  Anchor,
} from '@mantine/core'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { PropsWithChildren, useState } from 'react'
import { HiOutlineHomeModern } from 'react-icons/hi2'

interface HeaderProps {
  navOpen: boolean
  toggleNavOpen: () => void
}

const Header = ({ navOpen, toggleNavOpen }: HeaderProps) => (
  <AppShellHeader px={'md'}>
    <Group justify="space-between" h={'100%'}>
      <Group gap={'xs'}>
        <Burger
          opened={navOpen}
          size={'sm'}
          display={{ base: 'block', sm: 'none' }}
          onClick={() => toggleNavOpen()}
        />
        <Anchor component={Link} href="/" c="dark.0">
          <Title size="h2">1LIVE playlist creator</Title>
        </Anchor>
      </Group>
    </Group>
  </AppShellHeader>
)

const Navbar = () => {
  const pathname = usePathname()

  return (
    <AppShellNavbar p="xs">
      <AppShellSection grow component={ScrollArea} scrollbarSize={6} h={'100%'}>
        <NavLink
          label="Home"
          component={Link}
          href="/"
          leftSection={<HiOutlineHomeModern />}
          active={pathname === '/'}
        />
      </AppShellSection>
    </AppShellNavbar>
  )
}

const AppShell = ({ children }: PropsWithChildren) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  return (
    <MAppShell
      padding={'md'}
      header={{ height: 60 }}
      styles={(theme) => ({
        main: {
          backgroundColor: theme.colors.dark[8],
          position: 'relative',
          display: 'grid',
        },
      })}
      navbar={{
        width: 300,
        breakpoint: 'sm',
        collapsed: { mobile: !mobileNavOpen },
      }}
    >
      <Header
        navOpen={mobileNavOpen}
        toggleNavOpen={() => setMobileNavOpen(!mobileNavOpen)}
      />
      <Navbar />
      <AppShellMain>{children}</AppShellMain>
    </MAppShell>
  )
}

export default AppShell
