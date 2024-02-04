import dotenv from "dotenv"
import {
    deepHexlify,
    getSenderAddress,
    getUserOperationHash
} from "permissionless"
import {
    getRequiredPrefund,
    signUserOperationHashWithECDSA
} from "permissionless/utils"
import { Address, Hash, Hex } from "viem"
import { beforeAll, describe, expect, expectTypeOf, test } from "vitest"
import { buildUserOp, getAccountInitCode } from "./userOp"
import {
    getBundlerClient,
    getEntryPoint,
    getEoaWalletClient,
    getFactoryAddress,
    getPrivateKeyAccount,
    getPublicClient,
    getTestingChain
} from "./utils"

dotenv.config()

beforeAll(() => {
    if (!process.env.FACTORY_ADDRESS)
        throw new Error("FACTORY_ADDRESS environment variable not set")
    if (!process.env.TEST_PRIVATE_KEY)
        throw new Error("TEST_PRIVATE_KEY environment variable not set")
    if (!process.env.RPC_URL)
        throw new Error("RPC_URL environment variable not set")
    if (!process.env.ENTRYPOINT_ADDRESS)
        throw new Error("ENTRYPOINT_ADDRESS environment variable not set")
})

describe("test public actions and utils", () => {
    test("Test deep Hexlify", async () => {
        console.log("Testing deep hexlify")
        expect(deepHexlify("abcd")).toBe("abcd")
        expect(deepHexlify(null)).toBe(null)
        expect(deepHexlify(true)).toBe(true)
        expect(deepHexlify(false)).toBe(false)
        expect(deepHexlify(1n)).toBe("0x1")
        expect(
            deepHexlify({
                name: "Garvit",
                balance: 1n
            })
        ).toEqual({
            name: "Garvit",
            balance: "0x1"
        })
    })
    test("get sender address", async () => {
        const eoaWalletClient = getEoaWalletClient()
        const factoryAddress = getFactoryAddress()

        const initCode = await getAccountInitCode(
            factoryAddress,
            eoaWalletClient
        )
        const publicClient = await getPublicClient()
        const entryPoint = getEntryPoint()

        const sender = await getSenderAddress(publicClient, {
            initCode,
            entryPoint
        })

        expect(sender).not.toBeNull()
        expect(sender).not.toBeUndefined()
        expectTypeOf(sender).toMatchTypeOf<Address>()
    })

    test("get sender address with invalid entry point", async () => {
        const eoaWalletClient = getEoaWalletClient()
        const factoryAddress = getFactoryAddress()

        const initCode = await getAccountInitCode(
            factoryAddress,
            eoaWalletClient
        )
        const publicClient = await getPublicClient()
        const entryPoint = "0x0000000"

        await expect(async () =>
            getSenderAddress(publicClient, {
                initCode,
                entryPoint
            })
        ).rejects.toThrow()
    })

    test("getUserOperationHash", async () => {
        const eoaWalletClient = getEoaWalletClient()
        const chain = getTestingChain()
        const entryPoint = getEntryPoint()
        const bundlerClient = getBundlerClient()
        const userOperation = await buildUserOp(eoaWalletClient)

        const gasParameters = await bundlerClient.estimateUserOperationGas({
            userOperation,
            entryPoint: entryPoint
        })

        userOperation.callGasLimit = gasParameters.callGasLimit
        userOperation.verificationGasLimit = gasParameters.verificationGasLimit
        userOperation.preVerificationGas = gasParameters.preVerificationGas

        const userOpHash = getUserOperationHash({
            userOperation,
            entryPoint,
            chainId: chain.id
        })

        expect(userOpHash).length.greaterThan(0)
        expectTypeOf(userOpHash).toBeString()
        expectTypeOf(userOpHash).toMatchTypeOf<Hash>()
    })

    test("signUserOperationHashWithECDSA", async () => {
        const bundlerClient = getBundlerClient()
        const eoaWalletClient = getEoaWalletClient()
        const userOperation = await buildUserOp(eoaWalletClient)

        const entryPoint = getEntryPoint()
        const chain = getTestingChain()

        const gasParameters = await bundlerClient.estimateUserOperationGas({
            userOperation,
            entryPoint: getEntryPoint()
        })

        userOperation.callGasLimit = gasParameters.callGasLimit
        userOperation.verificationGasLimit = gasParameters.verificationGasLimit
        userOperation.preVerificationGas = gasParameters.preVerificationGas

        const userOpHash = getUserOperationHash({
            userOperation,
            entryPoint,
            chainId: chain.id
        })

        userOperation.signature = await signUserOperationHashWithECDSA({
            client: eoaWalletClient,
            userOperation,
            entryPoint: entryPoint,
            chainId: chain.id
        })

        expectTypeOf(userOperation.signature).toBeString()
        expectTypeOf(userOperation.signature).toMatchTypeOf<Hex>()

        const signature = await signUserOperationHashWithECDSA({
            client: eoaWalletClient,
            hash: userOpHash
        })

        await signUserOperationHashWithECDSA({
            account: eoaWalletClient.account,
            hash: userOpHash
        })

        await signUserOperationHashWithECDSA({
            account: eoaWalletClient.account,
            userOperation,
            entryPoint: entryPoint,
            chainId: chain.id
        })

        await signUserOperationHashWithECDSA({
            account: getPrivateKeyAccount(),
            userOperation,
            entryPoint: entryPoint,
            chainId: chain.id
        })

        expectTypeOf(userOpHash).toBeString()
        expectTypeOf(userOpHash).toMatchTypeOf<Hash>()
        expect(userOpHash).length.greaterThan(0)

        expect(signature).toEqual(userOperation.signature)
    })

    test("getRequiredGas", async () => {
        const bundlerClient = getBundlerClient()
        const eoaWalletClient = getEoaWalletClient()
        const userOperation = await buildUserOp(eoaWalletClient)

        const gasParameters = await bundlerClient.estimateUserOperationGas({
            userOperation,
            entryPoint: getEntryPoint()
        })

        userOperation.callGasLimit = gasParameters.callGasLimit
        userOperation.verificationGasLimit = gasParameters.verificationGasLimit
        userOperation.preVerificationGas = gasParameters.preVerificationGas

        const requiredGas = getRequiredPrefund({
            userOperation
        })

        expect(requiredGas).toBe(
            (gasParameters.callGasLimit +
                gasParameters.verificationGasLimit +
                gasParameters.preVerificationGas) *
                userOperation.maxFeePerGas
        )
    })
})
