'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { SignInCheckOptionsClaimsObject, useSigninCheck } from 'reactfire'

const DEFAULT_PAGE = '/'
const LOGIN_PAGE = '/auth/login'

interface signInCheckConfig {
  requiredClaims: SignInCheckOptionsClaimsObject['requiredClaims']
}

interface useLoginStatusConfig {
  requiredClaims?: SignInCheckOptionsClaimsObject['requiredClaims']
  behavior?: 'onlyUser' | 'both' | 'notUser'
}

/**
 * Get the user data of the currently logged in user and/or redirect depending on login status
 * @param {Object} config The hook config
 * @param {useLoginStatusConfig['requiredClaims']} config.requiredClaims Configure required claims for the login check
 * @param {useLoginStatusConfig['behavior']} [config.behavior="both"] The redirect behavior
 * @returns Information about the login status with user data
 */
const useLoginStatus = ({
  requiredClaims,
  behavior,
}: useLoginStatusConfig = {}) => {
  const signInCheckConfig = {} as signInCheckConfig
  if (requiredClaims) signInCheckConfig['requiredClaims'] = requiredClaims
  const { status, data: signInCheckResult } = useSigninCheck({
    ...signInCheckConfig,
  })
  const router = useRouter()

  useEffect(() => {
    if (status === 'success') {
      switch (behavior) {
        case 'onlyUser':
          if (signInCheckResult.signedIn === false) {
            router.push(LOGIN_PAGE)
          } else if (signInCheckResult.hasRequiredClaims === false) {
            router.push(DEFAULT_PAGE)
          }
          break
        case 'notUser':
          if (
            signInCheckResult.signedIn === true &&
            signInCheckResult.hasRequiredClaims === true
          )
            router.push(DEFAULT_PAGE)
          break
        default:
          break
      }
    }
  }, [status, signInCheckResult, behavior, router])

  return { status, ...signInCheckResult }
}

export default useLoginStatus

export { DEFAULT_PAGE, LOGIN_PAGE }
