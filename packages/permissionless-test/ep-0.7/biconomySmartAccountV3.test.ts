import dotenv from "dotenv"
import { SignTransactionNotSupportedBySmartAccount } from "permissionless/accounts"
import {
    http,
    Account,
    Chain,
    Transport,
    WalletClient,
    createWalletClient,
    decodeEventLog,
    getContract,
    zeroAddress
} from "viem"
import {
    beforeAll,
    beforeEach,
    describe,
    expect,
    expectTypeOf,
    test
} from "vitest"
import { EntryPointAbi } from "../abis/EntryPoint"
import { GreeterAbi, GreeterBytecode } from "../abis/Greeter"
import {
    getBundlerClient,
    getEntryPoint,
    getPimlicoBundlerClient,
    getPimlicoPaymasterClient,
    getPrivateKeyAccount,
    getPublicClient,
    getSignerToBiconomySmartAccountV3,
    getSmartAccountClient,
    getTestingChain,
    refillSmartAccount,
    waitForNonceUpdate
} from "./utils"

dotenv.config()

beforeAll(() => {
    if (!process.env.FACTORY_ADDRESS) {
        throw new Error("FACTORY_ADDRESS environment variable not set")
    }
    if (!process.env.TEST_PRIVATE_KEY) {
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    }
    if (!process.env.RPC_URL) {
        throw new Error("RPC_URL environment variable not set")
    }
})

describe("Biconomy 7579 Account", () => {
    let walletClient: WalletClient<Transport, Chain, Account>

    beforeEach(async () => {
        const owner = getPrivateKeyAccount()
        walletClient = createWalletClient({
            account: owner,
            chain: getTestingChain(),
            transport: http(process.env.RPC_URL as string)
        })
    })

    test("Biconomy Modular Smart Account address", async () => {
        const biconomyModularSA = await getSignerToBiconomySmartAccountV3()

        console.log("account address ", biconomyModularSA.address)

        expectTypeOf(biconomyModularSA.address).toBeString()
        expect(biconomyModularSA.address).toHaveLength(42)
        expect(biconomyModularSA.address).toMatch(/^0x[0-9a-fA-F]{40}$/)

        await expect(async () =>
            biconomyModularSA.signTransaction({
                to: zeroAddress,
                value: 0n,
                data: "0x"
            })
        ).rejects.toThrow(SignTransactionNotSupportedBySmartAccount)
    })

    // test("Smart account client signMessage", async () => {
    //     const bundlerClient = getBundlerClient()
    //     const pimlicoBundlerClient = getPimlicoBundlerClient()

    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })

    //     const response = await smartAccountClient.signMessage({
    //         message: "hello world"
    //     })

    //     expectTypeOf(response).toBeString()
    //     expect(response).toHaveLength(132)
    //     expect(response).toMatch(/^0x[0-9a-fA-F]{130}$/)
    // })

    // test("Smart account client signTypedData", async () => {
    //     const bundlerClient = getBundlerClient()
    //     const pimlicoBundlerClient = getPimlicoBundlerClient()
    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })

    //     const response = await smartAccountClient.signTypedData({
    //         domain: {
    //             chainId: 1,
    //             name: "Test",
    //             verifyingContract: zeroAddress
    //         },
    //         primaryType: "Test",
    //         types: {
    //             Test: [
    //                 {
    //                     name: "test",
    //                     type: "string"
    //                 }
    //             ]
    //         },
    //         message: {
    //             test: "hello world"
    //         }
    //     })

    //     expectTypeOf(response).toBeString()
    //     expect(response).toHaveLength(132)
    //     expect(response).toMatch(/^0x[0-9a-fA-F]{130}$/)
    // })

    // test("smart account client deploy contract", async () => {
    //     const bundlerClient = getBundlerClient()
    //     const pimlicoBundlerClient = getPimlicoBundlerClient()
    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })

    //     await expect(async () =>
    //         smartAccountClient.deployContract({
    //             abi: GreeterAbi,
    //             bytecode: GreeterBytecode
    //         })
    //     ).rejects.toThrowError(
    //         "Simple account doesn't support account deployment"
    //     )
    // })

    // test("Smart account client send multiple transactions", async () => {
    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })
    //     await refillSmartAccount(
    //         walletClient,
    //         smartAccountClient.account.address
    //     )
    //     const response = await smartAccountClient.sendTransactions({
    //         transactions: [
    //             {
    //                 to: zeroAddress,
    //                 value: 0n,
    //                 data: "0x"
    //             },
    //             {
    //                 to: zeroAddress,
    //                 value: 0n,
    //                 data: "0x"
    //             }
    //         ]
    //     })
    //     expectTypeOf(response).toBeString()
    //     expect(response).toHaveLength(66)
    //     expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)
    //     await waitForNonceUpdate()
    // }, 1000000)

    // test("Smart account write contract", async () => {
    //     const bundlerClient = getBundlerClient()
    //     const pimlicoBundlerClient = getPimlicoBundlerClient()
    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })
    //     await refillSmartAccount(
    //         walletClient,
    //         smartAccountClient.account.address
    //     )
    //     const entryPointContract = getContract({
    //         abi: EntryPointAbi,
    //         address: getEntryPoint(),
    //         client: {
    //             public: await getPublicClient(),
    //             wallet: smartAccountClient
    //         }
    //     })

    //     const oldBalance = await entryPointContract.read.balanceOf([
    //         smartAccountClient.account.address
    //     ])

    //     const txHash = await entryPointContract.write.depositTo(
    //         [smartAccountClient.account.address],
    //         {
    //             value: 10n
    //         }
    //     )

    //     expectTypeOf(txHash).toBeString()
    //     expect(txHash).toHaveLength(66)

    //     const newBalnce = await entryPointContract.read.balanceOf([
    //         smartAccountClient.account.address
    //     ])

    //     await waitForNonceUpdate()
    // }, 1000000)

    // test("Smart account client send transaction", async () => {
    //     const bundlerClient = getBundlerClient()
    //     const pimlicoBundlerClient = getPimlicoBundlerClient()
    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })
    //     await refillSmartAccount(
    //         walletClient,
    //         smartAccountClient.account.address
    //     )
    //     const response = await smartAccountClient.sendTransaction({
    //         to: zeroAddress,
    //         value: 0n,
    //         data: "0x"
    //     })
    //     expectTypeOf(response).toBeString()
    //     expect(response).toHaveLength(66)
    //     expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)
    //     await waitForNonceUpdate()
    // }, 1000000)

    // test("Smart account client send transaction with address", async () => {
    //     const oldSmartAccountClient = await getSmartAccountClient({ index: 5n })

    //     const bundlerClient = getBundlerClient()
    //     const pimlicoBundlerClient = getPimlicoBundlerClient()
    //     const smartAccountClient = await getSmartAccountClient({
    //         account: await getSignerToBiconomySmartAccountV3(),
    //         index: 5n
    //     })

    //     await refillSmartAccount(
    //         walletClient,
    //         smartAccountClient.account.address
    //     )

    //     const response = await smartAccountClient.sendTransaction({
    //         to: smartAccountClient.account.address,
    //         data: "0x",
    //         value: 0n
    //     })

    //     expectTypeOf(response).toBeString()
    //     expect(response).toHaveLength(66)
    //     expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)
    //     await waitForNonceUpdate()
    // }, 1000000)

    // test("test prepareUserOperationRequest", async () => {
    //     const bundlerClient = getBundlerClient()
    //     const pimlicoBundlerClient = getPimlicoBundlerClient()
    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })
    //     await refillSmartAccount(
    //         walletClient,
    //         smartAccountClient.account.address
    //     )

    //     const userOperation =
    //         await smartAccountClient.prepareUserOperationRequest({
    //             userOperation: {
    //                 callData: await smartAccountClient.account.encodeCallData({
    //                     to: zeroAddress,
    //                     value: 0n,
    //                     data: "0x"
    //                 })
    //             }
    //         })

    //     smartAccountClient.sendUserOperation({ userOperation })
    // }, 1000000)

    // test("smart account client send Transaction with paymaster", async () => {
    //     const publicClient = await getPublicClient()

    //     const bundlerClient = getBundlerClient()

    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })

    //     const response = await smartAccountClient.sendTransaction({
    //         to: zeroAddress,
    //         value: 0n,
    //         data: "0x"
    //     })

    //     expectTypeOf(response).toBeString()
    //     expect(response).toHaveLength(66)
    //     expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

    //     const transactionReceipt = await publicClient.waitForTransactionReceipt(
    //         {
    //             hash: response
    //         }
    //     )

    //     let eventFound = false

    //     for (const log of transactionReceipt.logs) {
    //         const event = decodeEventLog({
    //             abi: EntryPointAbi,
    //             ...log
    //         })
    //         if (event.eventName === "UserOperationEvent") {
    //             eventFound = true
    //             const userOperation =
    //                 await bundlerClient.getUserOperationByHash({
    //                     hash: event.args.userOpHash
    //                 })
    //             expect(userOperation?.userOperation.paymasterAndData).not.toBe(
    //                 "0x"
    //             )
    //         }
    //     }

    //     expect(eventFound).toBeTruthy()
    //     await waitForNonceUpdate()
    // }, 1000000)

    // test("smart account client send multiple Transactions with paymaster", async () => {
    //     const publicClient = await getPublicClient()

    //     const bundlerClient = getBundlerClient()

    //     const smartAccountClient = await getSmartAccountClient({
    //         index: 5n
    //     })

    //     const response = await smartAccountClient.sendTransactions({
    //         transactions: [
    //             {
    //                 to: zeroAddress,
    //                 value: 0n,
    //                 data: "0x"
    //             },
    //             {
    //                 to: zeroAddress,
    //                 value: 0n,
    //                 data: "0x"
    //             }
    //         ]
    //     })

    //     expectTypeOf(response).toBeString()
    //     expect(response).toHaveLength(66)
    //     expect(response).toMatch(/^0x[0-9a-fA-F]{64}$/)

    //     const transactionReceipt = await publicClient.waitForTransactionReceipt(
    //         {
    //             hash: response
    //         }
    //     )

    //     let eventFound = false

    //     for (const log of transactionReceipt.logs) {
    //         const event = decodeEventLog({
    //             abi: EntryPointAbi,
    //             ...log
    //         })
    //         if (event.eventName === "UserOperationEvent") {
    //             eventFound = true
    //             const userOperation =
    //                 await bundlerClient.getUserOperationByHash({
    //                     hash: event.args.userOpHash
    //                 })
    //             expect(userOperation?.userOperation.paymasterAndData).not.toBe(
    //                 "0x"
    //             )
    //         }
    //     }

    //     expect(eventFound).toBeTruthy()
    //     await waitForNonceUpdate()
    // }, 1000000)
})
