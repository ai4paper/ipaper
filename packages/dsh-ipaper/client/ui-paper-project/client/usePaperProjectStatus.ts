import type { ClientConnectionRpc } from '@deepseek-ai/dsh-client-connection/client'
import { useCallback, useEffect, useState } from 'react'
import type { PaperProjectStatus } from './types.ts'

const CHANNEL = '/ipaper'
const ENDPOINT = 'paper-project/status'

export interface PaperProjectStatusState {
  readonly status: PaperProjectStatus | null | undefined
  readonly error: string | undefined
}

export function usePaperProjectStatus(rpc: ClientConnectionRpc, workspaceId: string | undefined): PaperProjectStatusState {
  const [status, setStatus] = useState<PaperProjectStatus | null | undefined>()
  const [error, setError] = useState<string>()

  const refresh = useCallback(async (signal?: AbortSignal): Promise<void> => {
    if (workspaceId === undefined) { setStatus(null); return }
    const result = await rpc.call(CHANNEL, ENDPOINT, { workspaceId }, signal)
    if (signal?.aborted === true) return
    if (!result.ok) { setError(result.error.message); return }
    setError(undefined)
    setStatus(result.value as PaperProjectStatus | null)
  }, [rpc, workspaceId])

  useEffect(() => {
    setStatus(undefined)
    setError(undefined)
    const controller = new AbortController()
    void refresh(controller.signal)
    const timer = window.setInterval(() => { void refresh(controller.signal) }, 3000)
    return () => { controller.abort(); window.clearInterval(timer) }
  }, [refresh])

  return { status, error }
}
