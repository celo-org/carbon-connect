import { Wallet, ethers } from "ethers";
import {
    ACCOUNTS_CONTRACT,
    ACCOUNTS_PROXY_ADDRESS,
    ALFAJORES_CUSD_ADDRESS,
    FA_CONTRACT,
    FA_PROXY_ADDRESS,
    ODIS_PAYMENTS_CONTRACT,
    ODIS_PAYMENTS_PROXY_ADDRESS,
    STABLE_TOKEN_CONTRACT,
    ALFAJORES_RPC,
} from "./constants";
import { OdisUtils } from "@celo/identity";
import {
    AuthSigner,
    AuthenticationMethod,
    OdisContextName,
} from "@celo/identity/lib/odis/query";
import { IdentifierPrefix } from "@celo/identity/lib/odis/identifier";

export const provider = new ethers.providers.JsonRpcProvider(ALFAJORES_RPC);
export const issuer = new Wallet(
    process.env.ISSUER_PRIVATE_KEY as string,
    provider
);
export const serviceContext = OdisUtils.Query.getServiceContext(
    OdisContextName.ALFAJORES
);
export const ONE_CENT_CUSD = ethers.utils.parseEther("0.01");

export const authSigner: AuthSigner = {
    authenticationMethod: AuthenticationMethod.ENCRYPTION_KEY,
    rawKey: process.env.DEK_PRIVATE_KEY as string,
};
export const accountsContract = new ethers.Contract(
    ACCOUNTS_PROXY_ADDRESS,
    ACCOUNTS_CONTRACT.abi,
    issuer
);
export const federatedAttestationsContract = new ethers.Contract(
    FA_PROXY_ADDRESS,
    FA_CONTRACT.abi,
    issuer
);
export const odisPaymentsContract = new ethers.Contract(
    ODIS_PAYMENTS_PROXY_ADDRESS,
    ODIS_PAYMENTS_CONTRACT.abi,
    issuer
);
export const stableTokenContract = new ethers.Contract(
    ALFAJORES_CUSD_ADDRESS,
    STABLE_TOKEN_CONTRACT.abi,
    issuer
);

const NOW_TIMESTAMP = Math.floor(new Date().getTime() / 1000);

export async function registerOnChainIdentifier(plaintextId: string, address: string) {
    const obfuscatedId = await getObfuscatedIdWithQuotaRetry(plaintextId)
    const tx = await federatedAttestationsContract.registerAttestationAsIssuer( // TODO check if there are better code patterns for sending txs
        obfuscatedId,
        address,
        NOW_TIMESTAMP
    )
    const receipt = await tx.wait()
    return receipt
}

export async function deregisterOnChainIdentifier(plaintextId: string, address: string) {
    const obfuscatedId = await getObfuscatedIdWithQuotaRetry(plaintextId)
    const tx = await federatedAttestationsContract.revokeAttestation( // TODO check if there are better code patterns for sending txs
        obfuscatedId,
        issuer.address,
        address
    )
    const receipt = await tx.wait()
    return receipt
}

export async function checkAndTopUpODISQuota() {
    const { remainingQuota } = await OdisUtils.Quota.getPnpQuotaStatus(
        issuer?.address,
        authSigner,
        serviceContext
    );
    console.log("Remaining Quota", remainingQuota)

    if (remainingQuota < 1) { // TODO make threshold a constant
        const approvalTxReceipt = (
            await stableTokenContract.increaseAllowance(
                odisPaymentsContract.address,
                ONE_CENT_CUSD // TODO we should increase by more
            )
        ).sendAndWaitForReceipt()
        console.log(approvalTxReceipt)
        const odisPaymentTxReceipt = (
            await odisPaymentsContract.payInCUSD(
                issuer.address,
                ONE_CENT_CUSD // TODO we should increase by more
            )
        ).sendAndWaitForReceipt()
        console.log(odisPaymentTxReceipt)
    }
}

export async function lookupAddresses(plaintextId: string) {
    const attestations = await federatedAttestationsContract.lookupAttestations(
        await getObfuscatedIdWithQuotaRetry(plaintextId),
        [ issuer.address ]
    );
  
    return attestations.accounts as string[]; // TODO typesafety
}

export async function getObfuscatedId(plaintextId: string) {
    const { obfuscatedIdentifier } = await OdisUtils.Identifier.getObfuscatedIdentifier(
        plaintextId,
        IdentifierPrefix.TWITTER,
        issuer.address,
        authSigner,
        serviceContext
    )
    return obfuscatedIdentifier
}

export async function getObfuscatedIdWithQuotaRetry(plaintextId: string) {
    try {
        return getObfuscatedId(plaintextId)
    } catch {
        await checkAndTopUpODISQuota()
        return getObfuscatedId(plaintextId)
    }
}
