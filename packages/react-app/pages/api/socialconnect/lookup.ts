import type { NextApiRequest, NextApiResponse } from "next"
import { SocialConnectIssuer, SocialConnectResponse, handle } from "@/pages/handler";

export default async function lookup(req: NextApiRequest, res: NextApiResponse<SocialConnectResponse>) {
  const identifier = req.query.handle as string; // TODO typesafety
  console.log(identifier);
  await handle(req, res, SocialConnectIssuer.lookup(identifier))
}