import { SocialConnectIssuer, SocialConnectResponse, handle } from "@/pages/handler";
import type { NextApiRequest, NextApiResponse } from "next"

export default async function deregister(req: NextApiRequest, res: NextApiResponse<SocialConnectResponse>) {
  const plaintextId = req.query.handle as string; // TODO typesafety
  const address = req.query.address as string; // TODO typesafety
  console.log(plaintextId)
  console.log(address)
  await handle(req, res, SocialConnectIssuer.deregisterOnChainIdentifier(plaintextId, address))
}