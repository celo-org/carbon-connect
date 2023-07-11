import type { NextApiRequest, NextApiResponse } from "next"
import { lookupAddresses } from "@/utils/odisHelpers";
import { SocialConnectResponse, handle } from "@/utils/handler";

export default async function lookup(req: NextApiRequest, res: NextApiResponse<SocialConnectResponse>) {
  const identifier = req.query.handle as string; // TODO typesafety
  console.log(identifier);
  await handle(req, res, lookupAddresses(identifier))
}