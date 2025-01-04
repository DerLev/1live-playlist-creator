import useLoginStatus from '@/lib/useLoginStatus'
import {
  AppShellSection,
  NavLink,
  ScrollArea,
  AppShellNavbar as MAppShellNavbar,
} from '@mantine/core'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HiOutlineArrowLeftOnRectangle,
  HiOutlineArrowRightOnRectangle,
  HiOutlineChevronRight,
  HiOutlineCog,
  HiOutlineHomeModern,
  HiOutlineUserCircle,
} from 'react-icons/hi2'

const AppShellNavbar = () => {
  const pathname = usePathname()

  const { signedIn, user, hasRequiredClaims } = useLoginStatus({
    requiredClaims: { isAdmin: true },
    behavior: 'both',
  })

  return (
    <MAppShellNavbar p="xs">
      <AppShellSection grow component={ScrollArea} scrollbarSize={6} h={'100%'}>
        <NavLink
          label="Home"
          component={Link}
          href="/"
          leftSection={<HiOutlineHomeModern />}
          active={pathname === '/'}
        />
        {(signedIn && hasRequiredClaims && (
          <NavLink
            label="Administration"
            leftSection={<HiOutlineCog />}
            component={Link}
            href="/administration"
            active={pathname.startsWith('/administration')}
          />
        )) ||
          null}
        {signedIn ? (
          <NavLink
            label={user.displayName}
            leftSection={<HiOutlineUserCircle />}
            rightSection={<HiOutlineChevronRight />}
          >
            <NavLink
              label="Logout"
              leftSection={<HiOutlineArrowRightOnRectangle />}
              component={Link}
              href="/auth/logout"
            />
          </NavLink>
        ) : (
          <NavLink
            label="Login"
            component={Link}
            href="/auth/login"
            leftSection={<HiOutlineArrowLeftOnRectangle />}
            active={pathname === '/auth/login'}
          />
        )}
      </AppShellSection>
    </MAppShellNavbar>
  )
}

export default AppShellNavbar
