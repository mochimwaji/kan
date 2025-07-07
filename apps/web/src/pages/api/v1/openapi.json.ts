import type { NextApiRequest, NextApiResponse } from "next";

import { openApiDocument } from "@kan/api/openapi";

const handler = (req: NextApiRequest, res: NextApiResponse) => {
  res.status(200).send(openApiDocument);
};

export default handler;
