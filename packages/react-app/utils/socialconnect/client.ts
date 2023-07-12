import { OdisUtils } from "@celo/identity"
import { OdisContextName, ServiceContext } from "@celo/identity/lib/odis/query"
import { Contract, Wallet } from "ethers"
import { ALFAJORES_CARBON_TOKEN_ADDRESS, CARBON_TOKEN_CONTRACT, FA_CONTRACT, FA_PROXY_ADDRESS } from "../constants"
import { Escrow } from "../escrow"

export class SocialConnectClient {
    readonly federatedAttestationsContract: Contract
    readonly tokenContract: Contract
    readonly escrow: Escrow
    readonly serviceContext: ServiceContext

    constructor(
        readonly wallet: Wallet,
        readonly trustedIssuers: string[],
        context: OdisContextName
    ) {
        this.serviceContext = OdisUtils.Query.getServiceContext(context)
        this.federatedAttestationsContract = new Contract(
            FA_PROXY_ADDRESS,
            FA_CONTRACT.abi,
            this.wallet
        )
        this.escrow = new Escrow(
            this.wallet,
            this.trustedIssuers,
        )
        this.tokenContract = new Contract(
            ALFAJORES_CARBON_TOKEN_ADDRESS,
            CARBON_TOKEN_CONTRACT.abi,
            this.wallet
        )
    }
    
    async register(plaintextId: string, address: string) {
        const response = await fetch('/api/socialconnect/register', {
            method: 'POST',
            body: JSON.stringify({
                plaintextId,
                address,
            }),
        })
        return response.json()
    }
    
    async lookup(plaintextId: string) {
        const response = await fetch('/api/socialconnect/lookup', {
            method: 'POST',
            body: JSON.stringify({ plaintextId }),
        })
        return response.json()
    }
    
    async deregister(plaintextId: string, address: string) { // TODO authorization? 
        const response = await fetch('/api/socialconnect/revoke', {
            method: "POST",
            body: JSON.stringify({
                plaintextId,
                address,
            }),
        })
        return response.json()
    }

    async send(plaintextId: string, value: number) {
        const { addresses, obfuscatedID } = await this.lookup(plaintextId)
        if (!addresses.length) {
            return this.escrow.send(
                plaintextId,
                obfuscatedID,
                value
            )
        }
        return this.tokenContract.tranfer(addresses[0], value)
    }
}

export class CarbonConnectClient extends SocialConnectClient {

    async claimRegistrationTokens(plaintextId: string) {
        const { obfuscatedID } = await this.lookup(plaintextId)

        const hasRegistered = await this.tokenContract.hasRegistered(obfuscatedID, this.wallet.address)
        const hasMinted = await this.tokenContract.hasMinted(obfuscatedID)

        if (!hasMinted && hasRegistered) {
            await this.tokenContract.mint(obfuscatedID)
        } 
    }

    async burnTokens() {
        const balance = await this.tokenContract.balanceOf(this.wallet.address);
        await this.tokenContract.burn(balance);
    }
}