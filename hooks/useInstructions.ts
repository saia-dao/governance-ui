import { GovernanceAccountType } from '@models/accounts'
import { MintInfo } from '@solana/spl-token'
import {
  getMultipleAccounts,
  GovernedMintInfoAccount,
  GovernedTokenAccount,
  parseMintAccountData,
} from '@utils/tokens'
import { Instructions } from '@utils/uiTypes/proposalCreationTypes'
import useWalletStore from 'stores/useWalletStore'
import useRealm from './useRealm'
export default function useInstructions() {
  const { governances, tokenMints, realmTokenAccounts } = useRealm()
  const governancesArray = Object.keys(governances).map(
    (key) => governances[key]
  )
  const connection = useWalletStore((s) => s.connection.current)
  const { ownVoterWeight, realm } = useRealm()
  const getGovernancesByAccountType = (type: GovernanceAccountType) => {
    const governancesFiltered = governancesArray.filter(
      (gov) => gov.info?.accountType === type
    )
    return governancesFiltered
  }

  // TODO: Check governedAccounts from all governances plus search for token accounts owned by governances
  const canUseTransferInstruction =
    realm &&
    getGovernancesByAccountType(
      GovernanceAccountType.TokenGovernance
    ).some((g) => ownVoterWeight.canCreateProposal(g.info.config))

  const canUseProgramUpgradeInstruction =
    realm &&
    getGovernancesByAccountType(
      GovernanceAccountType.ProgramGovernance
    ).some((g) => ownVoterWeight.canCreateProposal(g.info.config))

  const canUseMintInstruction =
    realm &&
    getGovernancesByAccountType(
      GovernanceAccountType.MintGovernance
    ).some((g) => ownVoterWeight.canCreateProposal(g.info.config))

  const availableInstructions = [
    {
      id: Instructions.Transfer,
      name: 'Transfer Tokens',
      isVisible: canUseTransferInstruction,
    },
    {
      id: Instructions.ProgramUpgrade,
      name: 'Program Upgrade',
      isVisible: canUseProgramUpgradeInstruction,
    },
    {
      id: Instructions.Mint,
      name: 'Mint',
      isVisible: canUseMintInstruction,
    },
  ]
  const getAvailableInstructions = () => {
    return availableInstructions.filter((x) => x.isVisible)
  }
  function prepareTokenGovernances() {
    const tokenGovernances = getGovernancesByAccountType(
      GovernanceAccountType.TokenGovernance
    )
    const governedTokenAccounts: GovernedTokenAccount[] = []
    for (const i of tokenGovernances) {
      const realmTokenAccount = realmTokenAccounts.find(
        (x) => x.publicKey.toBase58() === i.info.governedAccount.toBase58()
      )
      const mint = tokenMints.find(
        (x) =>
          realmTokenAccount?.account.mint.toBase58() === x.publicKey.toBase58()
      )
      const obj = {
        governance: i,
        token: realmTokenAccount,
        mint,
      }
      governedTokenAccounts.push(obj)
    }
    return governedTokenAccounts
  }
  async function getMintWithGovernances() {
    const mintGovernances = getGovernancesByAccountType(
      GovernanceAccountType.MintGovernance
    )
    const governedMintInfoAccounts: GovernedMintInfoAccount[] = []
    const mintGovernancesMintInfo = await getMultipleAccounts(
      connection,
      mintGovernances.map((x) => x.info.governedAccount.toBase58())
    )
    mintGovernancesMintInfo.keys.forEach((key, index) => {
      const mintAccount = mintGovernancesMintInfo.array[index]
      const data = Buffer.from(mintAccount!.data)
      const parsedMintInfo = parseMintAccountData(data) as MintInfo
      const obj = {
        governance: mintGovernances.find(
          (x) => x.info.governedAccount.toBase58() === key
        ),
        mintInfo: parsedMintInfo,
      }
      governedMintInfoAccounts.push(obj)
    })
    return governedMintInfoAccounts
  }
  const governedTokenAccounts = prepareTokenGovernances()
  return {
    governancesArray,
    getGovernancesByAccountType,
    availableInstructions,
    getAvailableInstructions,
    governedTokenAccounts,
    getMintWithGovernances,
  }
}
