import { type Chain, type Client, type Hex, type Transport } from "viem"
import { privateKeyToAccount } from "viem/accounts"
import type { ENTRYPOINT_ADDRESS_V07_TYPE, Prettify } from "../../types"
import {
    type BiconomySmartAccountV3,
    type SignerToBiconomySmartAccountV3Parameters,
    signerToBiconomySmartAccountV3
} from "./signerToBiconomySmartAccountV3"

export type PrivateKeyToBiconomySmartAccountV3Parameters<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE
> = Prettify<
    {
        privateKey: Hex
    } & Omit<SignerToBiconomySmartAccountV3Parameters<entryPoint>, "signer">
>

/**
 * @description Creates a Biconomy Smart Account from a private key.
 *
 * @returns A Private Key Biconomy Smart Account using ECDSA as default validation module.
 */
export async function privateKeyToBiconomySmartAccountV3<
    entryPoint extends ENTRYPOINT_ADDRESS_V07_TYPE,
    TTransport extends Transport = Transport,
    TChain extends Chain | undefined = Chain | undefined
>(
    client: Client<TTransport, TChain, undefined>,
    {
        privateKey,
        ...rest
    }: PrivateKeyToBiconomySmartAccountV3Parameters<entryPoint>
): Promise<BiconomySmartAccountV3<entryPoint, TTransport, TChain>> {
    const privateKeyAccount = privateKeyToAccount(privateKey)
    return signerToBiconomySmartAccountV3<
        entryPoint,
        TTransport,
        TChain,
        "privateKey"
    >(client, {
        signer: privateKeyAccount,
        ...rest
    })
}
