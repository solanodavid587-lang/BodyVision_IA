import { InMemoryWebStorage, UserManager, WebStorageStateStore, type User } from 'oidc-client-ts'

let manager: UserManager | undefined
let initializing: Promise<User | null> | undefined

export function session() {
  if (!manager) {
    const authority = import.meta.env.VITE_OIDC_ISSUER
    const client_id = import.meta.env.VITE_OIDC_CLIENT_ID
    const audience = import.meta.env.VITE_OIDC_AUDIENCE
    if (!authority?.startsWith('https://') || !client_id || !audience) throw Error('Falta configurar el acceso empresarial.')
    manager = new UserManager({
      authority, client_id, response_type: 'code',
      redirect_uri: location.origin + '/auth/callback',
      post_logout_redirect_uri: location.origin + '/',
      scope: 'openid profile bodyvision:read bodyvision:write',
      extraQueryParams: { audience },
      automaticSilentRenew: false,
      userStore: new WebStorageStateStore({ store: new InMemoryWebStorage() }),
      stateStore: new WebStorageStateStore({ store: sessionStorage }),
    })
  }
  return manager
}

export function loadSession() {
  if (!initializing) initializing = (async () => {
    if (location.pathname === '/auth/callback') {
      const user = await session().signinRedirectCallback()
      history.replaceState({}, '', '/')
      return user
    }
    return session().getUser()
  })()
  return initializing
}

export async function logout() {
  const client = session()
  const hint = (await client.getUser())?.id_token
  await client.removeUser()
  initializing = undefined
  try { await client.signoutRedirect({ id_token_hint: hint }) }
  catch { location.replace('/') }
}
