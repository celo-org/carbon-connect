import type { NextApiRequest, NextApiResponse } from "next"

export type SocialConnectResponse = string[] | { error: unknown } // TODO

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