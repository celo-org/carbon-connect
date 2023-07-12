import { OdisUtils } from "@celo/identity"
import { OdisContextName, ServiceContext } from "@celo/identity/lib/odis/query"
import { Contract, Wallet } from "ethers"
import { ALFAJORES_CUSD_ADDRESS, FA_CONTRACT, FA_PROXY_ADDRESS, STABLE_TOKEN_CONTRACT } from "../constants"
import { Escrow } from "../escrow"

export class SocialConnectClient {
    private readonly federatedAttestationsContract: Contract
    private readonly tokenContract: Contract
    private readonly escrow: Escrow
    readonly serviceContext: ServiceContext

    constructor(
        private readonly wallet: Wallet,
        private readonly trustedIssuers: string[],
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
            ALFAJORES_CUSD_ADDRESS,
            STABLE_TOKEN_CONTRACT.abi,
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