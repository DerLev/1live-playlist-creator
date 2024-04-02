export type CreateRedirectInput = {
  local?: boolean
}

export type CreateRedirectOutput = {
  nonce: string
  authUrl: string
}

export type ResolveNonceInput = {
  nonce: string
}

export type LoginWithCodeInput = {
  nonce: string
  code: string
  local?: boolean
}

export type LoginWithCodeOutput = {
  loginToken: string
}
