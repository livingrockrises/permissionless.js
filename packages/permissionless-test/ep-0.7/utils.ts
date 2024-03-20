import {
    ENTRYPOINT_ADDRESS_V07,
    createBundlerClient,
    createSmartAccountClient
} from "permissionless"
import {
    SmartAccount,
    SmartAccountSigner,
    signerToBiconomySmartAccountV3,
    signerToSimpleSmartAccount
} from "permissionless/accounts"
import { Middleware } from "permissionless/actions/smartAccount"
import {
    createPimlicoBundlerClient,
    createPimlicoPaymasterClient
} from "permissionless/clients/pimlico"
import { ENTRYPOINT_ADDRESS_V07_TYPE } from "permissionless/types"
import { walletClientToSmartAccountSigner } from "permissionless/utils"
import {
    http,
    Account,
    Address,
    Chain,
    Hex,
    Transport,
    WalletClient,
    createPublicClient,
    createWalletClient,
    defineChain,
    encodeFunctionData,
    parseEther
} from "viem"
import { privateKeyToAccount } from "viem/accounts"
import * as allChains from "viem/chains"

export const getFactoryAddress = () => {
    if (!process.env.FACTORY_ADDRESS)
        throw new Error("FACTORY_ADDRESS environment variable not set")
    const factoryAddress = process.env.FACTORY_ADDRESS as Address
    return factoryAddress
}

export const getPrivateKeyAccount = () => {
    if (!process.env.TEST_PRIVATE_KEY)
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    return privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex)
}

export const getTestingChain = () => {
    // If custom chain specified in environment variable, use that

    if (!process.env.TEST_CHAIN_ID)
        throw new Error("TEST_CHAIN_ID environment variable not set")

    const chainId = parseInt(process.env.TEST_CHAIN_ID)
    const chain = Object.values(allChains).find((chain) => chain.id === chainId)
    if (chain) return chain

    // Otherwise, use fallback to goerli
    return defineChain({
        id: chainId,
        network: "goerli",
        name: "Goerli",
        nativeCurrency: { name: "Goerli Ether", symbol: "ETH", decimals: 18 },
        rpcUrls: {
            default: {
                http: ["http://0.0.0.0:3000"]
            },
            public: {
                http: ["http://0.0.0.0:3000"]
            }
        },
        testnet: true
    })
}

export const getSignerToSimpleSmartAccount = async ({
    signer = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex),
    address,
    index = 0n
}: {
    signer?: SmartAccountSigner
    address?: Address
    index?: bigint
} = {}) => {
    if (!process.env.TEST_PRIVATE_KEY)
        throw new Error("TEST_PRIVATE_KEY environment variable not set")

    const publicClient = await getPublicClient()

    return await signerToSimpleSmartAccount(publicClient, {
        entryPoint: getEntryPoint(),
        factoryAddress: getFactoryAddress(),
        signer: signer,
        address,
        index: index
    })
}

export const getSignerToBiconomySmartAccountV3 = async (
    { index }: { index: bigint } = { index: 0n }
) => {
    if (!process.env.TEST_PRIVATE_KEY)
        throw new Error("TEST_PRIVATE_KEY environment variable not set")

    const publicClient = await getPublicClient()
    const signer = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex)

    return await signerToBiconomySmartAccountV3(publicClient, {
        entryPoint: getEntryPoint(),
        signer: signer,
        index: index
    })
}

export const getCustomSignerToSimpleSmartAccount = async () => {
    if (!process.env.TEST_PRIVATE_KEY)
        throw new Error("TEST_PRIVATE_KEY environment variable not set")

    const signer = privateKeyToAccount(process.env.TEST_PRIVATE_KEY as Hex)

    const walletClient = createWalletClient({
        chain: getTestingChain(),
        account: signer,
        transport: http(process.env.RPC_URL as string)
    })

    return walletClientToSmartAccountSigner(walletClient)
}

export const getSmartAccountClient = async ({
    account,
    middleware,
    preFund = false,
    index = 0n
}: Middleware<ENTRYPOINT_ADDRESS_V07_TYPE> & {
    account?: SmartAccount<ENTRYPOINT_ADDRESS_V07_TYPE>
    preFund?: boolean
    index?: bigint
} = {}) => {
    if (!process.env.BUNDLER_RPC_HOST)
        throw new Error("BUNDLER_RPC_HOST environment variable not set")
    const chain = getTestingChain()

    const pimlicoBundlerClient = getPimlicoBundlerClient()

    const smartAccountClient = createSmartAccountClient({
        account: account ?? (await getSignerToSimpleSmartAccount({ index })),
        chain,
        bundlerTransport: http(`${process.env.BUNDLER_RPC_HOST}`),
        middleware:
            typeof middleware === "function"
                ? middleware
                : {
                      gasPrice: async () => {
                          return (
                              await pimlicoBundlerClient.getUserOperationGasPrice()
                          ).fast
                      },
                      ...middleware
                  }
    })

    if (preFund) {
        const walletClient = getEoaWalletClient()
        const publicClient = await getPublicClient()

        const balance = await publicClient.getBalance({
            address: smartAccountClient.account.address
        })

        if (balance < parseEther("1")) {
            await walletClient.sendTransaction({
                to: smartAccountClient.account.address,
                value: parseEther("1"),
                data: "0x"
            })
        }
    }

    return smartAccountClient
}

export const getEoaWalletClient = () => {
    return createWalletClient({
        account: getPrivateKeyAccount(),
        chain: getTestingChain(),
        transport: http(process.env.RPC_URL as string)
    })
}

export const getEntryPoint = () => {
    return ENTRYPOINT_ADDRESS_V07
}

export const getPublicClient = async () => {
    if (!process.env.RPC_URL)
        throw new Error("RPC_URL environment variable not set")

    const publicClient = createPublicClient({
        transport: http(process.env.RPC_URL as string)
    })

    const chainId = await publicClient.getChainId()

    if (chainId !== getTestingChain().id)
        throw new Error(
            `Testing Chain ID: ${
                getTestingChain().id
            } not supported by RPC URL, RPC Chain ID: ${chainId}`
        )

    return publicClient
}

export const getBundlerClient = () => {
    if (!process.env.BUNDLER_RPC_HOST)
        throw new Error("BUNDLER_RPC_HOST environment variable not set")

    const chain = getTestingChain()

    return createBundlerClient({
        chain: chain,
        transport: http(`${process.env.BUNDLER_RPC_HOST}`),
        entryPoint: getEntryPoint()
    })
}

export const getPimlicoBundlerClient = () => {
    if (!process.env.PIMLICO_BUNDLER_RPC_HOST)
        throw new Error("PIMLICO_BUNDLER_RPC_HOST environment variable not set")

    const chain = getTestingChain()

    return createPimlicoBundlerClient({
        chain: chain,
        transport: http(`${process.env.PIMLICO_BUNDLER_RPC_HOST}`),
        entryPoint: getEntryPoint()
    })
}

export const getPimlicoPaymasterClient = () => {
    if (!process.env.PIMLICO_PAYMASTER_RPC_HOST)
        throw new Error(
            "PIMLICO_PAYMASTER_RPC_HOST environment variable not set"
        )

    const chain = getTestingChain()

    return createPimlicoPaymasterClient({
        chain: chain,
        transport: http(`${process.env.PIMLICO_PAYMASTER_RPC_HOST}`),
        entryPoint: getEntryPoint()
    })
}

export const isAccountDeployed = async (accountAddress: Address) => {
    const publicClient = await getPublicClient()

    const contractCode = await publicClient.getBytecode({
        address: accountAddress
    })

    if ((contractCode?.length ?? 0) > 2) return true

    return false
}

export const getDummySignature = (): Hex => {
    return "0xfffffffffffffffffffffffffffffff0000000000000000000000000000000007aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa1c"
}

export const getOldUserOpHash = (): Hex => {
    return "0xe9fad2cd67f9ca1d0b7a6513b2a42066784c8df938518da2b51bb8cc9a89ea34"
}

export const waitForNonceUpdate = async (time = 10000) => {
    return new Promise((res) => {
        setTimeout(res, time)
    })
}

export const generateApproveCallData = (paymasterAddress: Address) => {
    const approveData = encodeFunctionData({
        abi: [
            {
                inputs: [
                    { name: "_spender", type: "address" },
                    { name: "_value", type: "uint256" }
                ],
                name: "approve",
                outputs: [{ name: "", type: "bool" }],
                payable: false,
                stateMutability: "nonpayable",
                type: "function"
            }
        ],
        args: [
            paymasterAddress,
            0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffn
        ]
    })

    return approveData
}

export const refillSmartAccount = async (
    walletClient: WalletClient<Transport, Chain, Account>,
    address
) => {
    const publicClient = await getPublicClient()
    const balance = await publicClient.getBalance({ address })
    if (balance === 0n) {
        await walletClient.sendTransaction({
            to: address,
            value: parseEther("1")
        })
    }
}
