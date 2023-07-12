import { Contract, Wallet, ethers } from "ethers"
import { ALFAJORES_CUSD_ADDRESS, ESCROW_CONTRACT, ESCROW_PROXY_ADDRESS, STABLE_TOKEN_CONTRACT } from "./constants"

export class Escrow {
    private readonly escrowContract: Contract
    private readonly tokenContract: Contract

    constructor(
        private readonly wallet: Wallet,
        private readonly trustedIssuers: string[],
    ) {
        this.escrowContract = new Contract(
            ESCROW_PROXY_ADDRESS,
            ESCROW_CONTRACT.abi,
            this.wallet
        )
        this.tokenContract = new Contract(
            ALFAJORES_CUSD_ADDRESS,
            STABLE_TOKEN_CONTRACT.abi,
            this.wallet
        )
    }
    
    async send(
        plaintextId: string,
        obfuscatedId: string,
        value: number
    ) {
        await this.tokenContract.approve(
            this.escrowContract.address,
            value
        )
        await this.escrowContract.transferWithTrustedIssuers(
            obfuscatedId,
            this.tokenContract.address,
            value,
            0,
            this.getPaymentIdWallet(plaintextId, obfuscatedId, this.wallet.address).address,
            1,
            this.trustedIssuers
        )
    }

    async withdrawAll(
        plaintextId: string,
        obfuscatedID: string,
    ) {
        const paymentIds: string[] = await this.escrowContract.getReceivedPaymentIds(obfuscatedID)

        const results = await Promise.allSettled(
            paymentIds.map((paymentId) => this.escrowContract.escrowedPayments(paymentId))
        )

        const senders = results.map((result) => result.status === 'fulfilled' ? result.value.sender : undefined)

        await Promise.all(senders
            .filter((sender) => !!sender)
            .map((sender) => this.withdraw(plaintextId, obfuscatedID, sender))
        )
    }


    async withdraw(
        plaintextId: string,
        obfuscatedId: string,
        senderAddress: string
    ) {
        const paymentIdWallet = this.getPaymentIdWallet(
            plaintextId, 
            obfuscatedId,
            senderAddress
        )
        const paymentIdSig = ethers.utils.splitSignature(
            await paymentIdWallet.signMessage(this.wallet.address)
        )
        await this.escrowContract.withdraw(
            paymentIdWallet.address,
            paymentIdSig.v,
            paymentIdSig.r,
            paymentIdSig.s
        )
    }

    private getPaymentIdWallet(
        plaintextId: string, 
        obfuscatedId: string,
        senderAddress: string
    ) {
        return Wallet.fromMnemonic(
            plaintextId.concat(obfuscatedId).concat(senderAddress)
        )
    }
}