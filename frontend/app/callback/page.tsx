'use client'

import {
  LoginWithCodeInput,
  LoginWithCodeOutput,
  ResolveNonceInput,
} from '@/types/functions'
import { Alert, Anchor, Container, Text, Title } from '@mantine/core'
import { signInWithCustomToken } from 'firebase/auth'
import { httpsCallable } from 'firebase/functions'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { HiOutlineExclamationTriangle } from 'react-icons/hi2'
import { useAuth, useFunctions } from 'reactfire'

const humanReadableCallbackErrors = (cberror: string) => {
  switch (cberror) {
    case 'access_denied':
      return 'You denied the authorization request'
    case 'invalid_request':
      return 'The authorization request was malformed'
    case 'unauthorized_client':
      return 'This website is not authorized to request user authorization'
    case 'invalid_grant':
      return 'The provided grant is invalid'
    case 'unsupported_grant_type':
      return 'The authorization server does not support the requested grant type'
    case 'invalid_scope':
      return 'One or more requested scopes are invalid'
    default:
      return cberror
  }
}

const CallbackPage = () => {
  const queryParams = useSearchParams()
  const functions = useFunctions()
  const auth = useAuth()
  const router = useRouter()

  const [isError, setIsError] = useState(false)
  const [errorType, setErrorType] = useState('access_denied')

  const deleteLoginNonce = useCallback(async () => {
    const deleteNonceFunction = httpsCallable<ResolveNonceInput>(
      functions,
      'resolveNonce',
    )
    await deleteNonceFunction({ nonce: queryParams.get('state') || '' }).catch(
      (err) => err,
    )
  }, [functions, queryParams])

  const [loginFuncCall, setLoginFuncCall] = useState(false)

  const loginWithCode = useCallback(async () => {
    const getLoginTokenFunction = httpsCallable<
      LoginWithCodeInput,
      LoginWithCodeOutput
    >(functions, 'loginWithCode')

    const callbackCode = queryParams.get('code')
    const callbackState = queryParams.get('state')

    if (!callbackCode?.length || !callbackState?.length) {
      throw new Error(
        "Request query params don't contain `code` and/or `state`",
      )
    }

    try {
      const loginResult = await getLoginTokenFunction({
        code: callbackCode,
        nonce: callbackState,
        local: process.env.NODE_ENV === 'production' ? false : true,
      })

      await signInWithCustomToken(auth, loginResult.data.loginToken)

      router.push('/')
    } catch (err) {
      throw err
    }
  }, [functions, auth, queryParams, router])

  useEffect(() => {
    if (queryParams.get('error') && !queryParams.get('code')) {
      setIsError(true)
      setErrorType((e) => queryParams.get('error') || e)
      deleteLoginNonce()
    } else if (queryParams.get('code') && queryParams.get('state')) {
      setLoginFuncCall(true)
    }
  }, [queryParams, deleteLoginNonce, loginWithCode])

  useEffect(() => {
    if (loginFuncCall) {
      loginWithCode()
    }
  }, [loginFuncCall, loginWithCode])

  if (isError) {
    return (
      <Container maw={420} w={'100%'}>
        <Alert
          title="There was an error with the OAuth 2.0 flow"
          color="red"
          variant="outline"
          icon={<HiOutlineExclamationTriangle />}
        >
          <Text fw={700} c="red.3">
            {humanReadableCallbackErrors(errorType)}.
          </Text>
          <Text c="red.3">Contact an admin for further help</Text>
          <Anchor
            component={Link}
            href="/auth/login"
            c="red.3"
            underline="always"
          >
            Retry
          </Anchor>
        </Alert>
      </Container>
    )
  } else {
    return (
      <Title ta="center" c="dark.2" fw={800}>
        Logging you in...
      </Title>
    )
  }
}

export default CallbackPage
