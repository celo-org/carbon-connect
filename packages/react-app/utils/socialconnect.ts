import { Contract, Wallet, ethers } from "ethers";
import {
    ACCOUNTS_CONTRACT,
    ACCOUNTS_PROXY_ADDRESS,
    ALFAJORES_CUSD_ADDRESS,
    FA_CONTRACT,
    FA_PROXY_ADDRESS,
    ODIS_PAYMENTS_CONTRACT,
    ODIS_PAYMENTS_PROXY_ADDRESS,
    STABLE_TOKEN_CONTRACT,
} from "./constants";
import { OdisUtils } from "@celo/identity";
import {
    AuthSigner,
    OdisContextName,
    ServiceContext,
} from "@celo/identity/lib/odis/query";
import { IdentifierPrefix } from "@celo/identity/lib/odis/identifier";

export const ONE_CENT_CUSD = ethers.utils.parseEther("0.01");

export const NOW_TIMESTAMP = Math.floor(new Date().getTime() / 1000);

export class SocialConnnectClient {
    private readonly accountsContract: Contract
    private readonly federatedAttestationsContract: Contract
    private readonly odisPaymentsContract: Contract
    private readonly stableTokenContract: Contract
    readonly serviceContext: ServiceContext

    constructor(
        private readonly wallet: Wallet,
        private readonly authSigner: AuthSigner,
        context: OdisContextName
    ) {
        this.serviceContext = OdisUtils.Query.getServiceContext(context)
        this.accountsContract =  new ethers.Contract(
            ACCOUNTS_PROXY_ADDRESS,
            ACCOUNTS_CONTRACT.abi,
            this.wallet
        )
        this.federatedAttestationsContract = new ethers.Contract(
            FA_PROXY_ADDRESS,
            FA_CONTRACT.abi,
            this.wallet
        )
        this.odisPaymentsContract = new ethers.Contract(
            ODIS_PAYMENTS_PROXY_ADDRESS,
            ODIS_PAYMENTS_CONTRACT.abi,
            this.wallet
        )
        this.stableTokenContract = new ethers.Contract(
            ALFAJORES_CUSD_ADDRESS,
            STABLE_TOKEN_CONTRACT.abi,
            this.wallet
        )
    }

    async getObfuscatedId(plaintextId: string) { // TODO look into client side blinding
        const { obfuscatedIdentifier } = await OdisUtils.Identifier.getObfuscatedIdentifier(
            plaintextId,
            IdentifierPrefix.TWITTER,
            this.wallet.address,
            this.authSigner,
            this.serviceContext
        )
        return obfuscatedIdentifier
    }

    async getObfuscatedIdWithQuotaRetry(plaintextId: string) {
        try {
            return this.getObfuscatedId(plaintextId)
        } catch {
            await this.checkAndTopUpODISQuota()
            return this.getObfuscatedId(plaintextId)
        }
    }
    
    async registerOnChainIdentifier(plaintextId: string, address: string) {
        const obfuscatedId = await this.getObfuscatedIdWithQuotaRetry(plaintextId)
        const tx = await this.federatedAttestationsContract.registerAttestationAsIssuer( // TODO check if there are better code patterns for sending txs
            obfuscatedId,
            address,
            NOW_TIMESTAMP
        )
        const receipt = await tx.wait()
        return receipt
    }

    async deregisterOnChainIdentifier(plaintextId: string, address: string) {
        const obfuscatedId = await this.getObfuscatedIdWithQuotaRetry(plaintextId)
        const tx = await this.federatedAttestationsContract.revokeAttestation(
            obfuscatedId,
            this.wallet.address,
            address
        )
        const receipt = await tx.wait()
        return receipt
    }

    async checkODISQuota() {
        const { remainingQuota } = await OdisUtils.Quota.getPnpQuotaStatus(
            this.wallet.address,
            this.authSigner,
            this.serviceContext
        )
        console.log("Remaining Quota", remainingQuota)
        return remainingQuota
    }

    async checkAndTopUpODISQuota() {
        const remainingQuota = await this.checkODISQuota()
    
        if (remainingQuota < 1) { // TODO make threshold a constant
            const approvalTxReceipt = (
                await this.stableTokenContract.increaseAllowance(
                    this.odisPaymentsContract.address,
                    ONE_CENT_CUSD // TODO we should increase by more
                )
            ).sendAndWaitForReceipt()
            console.log(approvalTxReceipt)
            const odisPaymentTxReceipt = (
                await this.odisPaymentsContract.payInCUSD(
                    this.wallet.address,
                    ONE_CENT_CUSD // TODO we should increase by more
                )
            ).sendAndWaitForReceipt()
            console.log(odisPaymentTxReceipt)
        }
    }

    async lookupAddresses(plaintextId: string) {
        const attestations = await this.federatedAttestationsContract.lookupAttestations(
            await this.getObfuscatedIdWithQuotaRetry(plaintextId),
            [ this.wallet.address ]
        )
      
        return attestations.accounts as string[]; // TODO typesafety
    }
}
