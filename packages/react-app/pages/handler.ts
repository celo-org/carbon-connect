import { ALFAJORES_RPC } from "@/utils/constants";
import { SocialConnnectClient } from "@/utils/odisHelpers";
import { OdisUtils } from "@celo/identity";
import { AuthenticationMethod, OdisContextName } from "@celo/identity/lib/odis/query";
import { Wallet, ethers } from "ethers";
import type { NextApiRequest, NextApiResponse } from "next"

export type SocialConnectResponse = string[] | { error: unknown } // TODO

export const SocialConnect = new SocialConnnectClient( 
    new Wallet(
        process.env.ISSUER_PRIVATE_KEY as string,
        new ethers.providers.JsonRpcProvider(ALFAJORES_RPC)
    ),
    { 
        authenticationMethod: AuthenticationMethod.ENCRYPTION_KEY,
        rawKey: process.env.DEK_PRIVATE_KEY as string,
    },
    OdisContextName.ALFAJORES
)

export async function handle<R extends SocialConnectResponse>(req: NextApiRequest, res: NextApiResponse<R>, data: Promise<R>) {
    try {
        const body = await data 
        switch (req.method) {
            case "GET":
                return res.status(200).json(body);
            case "POST":
                return res.status(201).json(body); // TODO response types?
            default:
                console.log(`Request method ${req.method} is unsupported`)
        }
        
    } catch (error) {
        return res.status(500).json({
            error,
        } as R);
    }
    
    return res.status(404);
}