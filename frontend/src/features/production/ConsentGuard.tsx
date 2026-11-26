import {useEffect, useRef, useState, type ReactNode} from 'react'
import {Link} from 'react-router-dom'
import {useStudio} from '../studio/session'
import {apiRequest} from '../../services/api'

export function ConsentGuard({id, purpose, children}: {id:string; purpose:string; children:ReactNode}) {
  const [status,setStatus] = useState<'pending'|'ready'|'closed'>('pending')
  const studio = useStudio()
  const clear = useRef(studio.clear)
  clear.current = studio.clear
  useEffect(()=>{
    const controller = new AbortController()
    let pending = false
    function close() {
      controller.abort()
      clear.current(id)
      setStatus('closed')
    }
    async function check() {
      if (controller.signal.aborted || pending) return
      pending = true
      try {
        await apiRequest('/profiles/'+encodeURIComponent(id)+'/processing/'+purpose, {
          signal:AbortSignal.any([controller.signal, AbortSignal.timeout(7000)])
        })
        if (!controller.signal.aborted) setStatus('ready')
      } catch {if (!controller.signal.aborted) close()}
      finally {pending = false}
    }
    void check()
    const timer = window.setInterval(check, 5000)
    window.addEventListener('offline',close)
    window.addEventListener('focus',check)
    return ()=>{
      controller.abort()
      window.clearInterval(timer)
      window.removeEventListener('offline',close)
      window.removeEventListener('focus',check)
    }
  },[id,purpose])
  if (status==='pending') return <p role="status">Comprobando autorización…</p>
  if (status==='closed') return <p role="alert">Captura bloqueada. Verifica la conexión y el <Link to={'/profiles/'+id+'/consents'}>consentimiento del expediente</Link>.</p>
  return children
}
