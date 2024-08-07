import {
    type Chain,
    type Client,
    ContractFunctionExecutionError,
    type Transport,
    decodeFunctionResult,
    encodeFunctionData
} from "viem"
import type { SmartAccount } from "../../accounts/types"
import type { GetAccountParameter } from "../../types"
import type { EntryPoint } from "../../types/entrypoint"
import { parseAccount } from "../../utils/"
import { AccountOrClientNotFoundError } from "../../utils/signUserOperationHashWithECDSA"

export async function accountId<
    TEntryPoint extends EntryPoint,
    TSmartAccount extends SmartAccount<TEntryPoint> | undefined,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, TSmartAccount>,
    args?: TSmartAccount extends undefined
        ? GetAccountParameter<TEntryPoint, TSmartAccount>
        : undefined
): Promise<string> {
    let account_ = client.account

    if (args) {
        account_ = args.account as TSmartAccount
    }

    if (!account_) {
        throw new AccountOrClientNotFoundError({
            docsPath: "/docs/actions/wallet/sendTransaction"
        })
    }

    const account = parseAccount(account_) as SmartAccount<TEntryPoint>

    const publicClient = account.client

    const abi = [
        {
            name: "accountId",
            type: "function",
            stateMutability: "view",
            inputs: [],
            outputs: [
                {
                    type: "string",
                    name: "accountImplementationId"
                }
            ]
        }
    ] as const

    try {
        return await publicClient.readContract({
            abi,
            functionName: "accountId",
            address: account.address
        })
    } catch (error) {
        if (error instanceof ContractFunctionExecutionError) {
            const factory = await account.getFactory()
            const factoryData = await account.getFactoryData()

            const result = await publicClient.call({
                factory: factory,
                factoryData: factoryData,
                to: account.address,
                data: encodeFunctionData({
                    abi,
                    functionName: "accountId"
                })
            })

            if (!result || !result.data) {
                throw new Error("accountId result is empty")
            }

            return decodeFunctionResult({
                abi,
                functionName: "accountId",
                data: result.data
            })
        }

        throw error
    }
}
