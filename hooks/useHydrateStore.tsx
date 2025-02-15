import { Connection } from '@solana/web3.js'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { getRealmInfo } from '../models/registry/api'
import { EndpointTypes } from '../models/types'
import useWalletStore, { ENDPOINTS } from '../stores/useWalletStore'

export default function useHydrateStore() {
  const router = useRouter()
  const { symbol, cluster, pk } = router.query
  const apiEndpoint = cluster ? (cluster as EndpointTypes) : 'mainnet'
  const selectedRealmMints = useWalletStore((s) => s.selectedRealm.mints)
  const setWalletStore = useWalletStore((s) => s.set)
  const { fetchAllRealms, fetchRealm, fetchProposal } = useWalletStore(
    (s) => s.actions
  )
  useEffect(() => {
    const fetch = async () => {
      const realmInfo = getRealmInfo(symbol as string, apiEndpoint)
      if (realmInfo) {
        setWalletStore((s) => {
          const ENDPOINT = ENDPOINTS.find((e) => e.name === realmInfo.endpoint)
          s.connection.cluster = ENDPOINT?.name
          s.connection.current = ENDPOINT
            ? new Connection(ENDPOINT.url, 'recent')
            : undefined
          s.connection.endpoint = ENDPOINT?.url
        })
        await fetchAllRealms(realmInfo.programId)
        fetchRealm(realmInfo.programId, realmInfo.realmId)
      }
    }
    fetch()
  }, [symbol])

  useEffect(() => {
    const fetch = async () => {
      if (pk && Object.entries(selectedRealmMints).length > 0) {
        await fetchProposal(pk)
      }
    }
    fetch()
  }, [pk, selectedRealmMints])
}
