'use client'

import { AppShell as MAppShell, AppShellMain } from '@mantine/core'
import { usePathname } from 'next/navigation'
import { PropsWithChildren, useEffect, useMemo, useState } from 'react'
import AppShellHeader from './AppShellHeader'
import AppShellNavbar from './AppShellNavbar'

const AppShell = ({ children }: PropsWithChildren) => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [desktopNavOpen, setDesktopNavOpen] = useState(true)

  const sectionsWithoutNavbar = useMemo(() => ['/auth', '/callback'], [])
  const pathname = usePathname()

  useEffect(() => {
    const matchedPaths = sectionsWithoutNavbar.map((item) => {
      return pathname.startsWith(item)
    })

    if (matchedPaths.some((item) => item)) {
      setDesktopNavOpen(false)
    } else {
      setDesktopNavOpen(true)
    }
  }, [pathname, sectionsWithoutNavbar])

  useEffect(() => {
    if (pathname) {
      setMobileNavOpen(false)
    }
  }, [pathname])

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
        collapsed: { mobile: !mobileNavOpen, desktop: !desktopNavOpen },
      }}
      transitionDuration={0}
    >
      <AppShellHeader
        navOpen={mobileNavOpen}
        toggleNavOpen={() => setMobileNavOpen(!mobileNavOpen)}
      />
      <AppShellNavbar />
      <AppShellMain>{children}</AppShellMain>
    </MAppShell>
  )
}

export default AppShell
