import { ENTRYPOINT_ADDRESS_V07 } from "permissionless"
import { isHash, zeroAddress } from "viem"
import { beforeAll, describe, expect, test } from "vitest"
import {
    ensureBundlerIsReady,
    ensurePaymasterIsReady,
    getPimlicoPaymasterClient,
    getSafeClient
} from "../utils"

describe("Safe Specific Actions V0.7", () => {
    beforeAll(async () => {
        await ensureBundlerIsReady()
        await ensurePaymasterIsReady()
    })

    test("Can deploy with setup transaction", async () => {
        const smartAccountClient = await getSafeClient({
            entryPoint: ENTRYPOINT_ADDRESS_V07,
            setupTransactions: [
                {
                    to: zeroAddress,
                    data: "0xff",
                    value: 0n
                }
            ],
            paymasterClient: getPimlicoPaymasterClient(ENTRYPOINT_ADDRESS_V07)
        })

        const response = await smartAccountClient.sendTransaction({
            to: zeroAddress,
            value: 0n,
            data: "0x"
        })

        expect(isHash(response)).toBe(true)
    }, 10000)
})
