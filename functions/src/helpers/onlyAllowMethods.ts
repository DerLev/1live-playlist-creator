import type {Response} from "express";
import type {Request} from "firebase-functions/v2/https";

type AllowedMethods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Restrict an onRequest function to certain HTTP methods
 * @param {Request} req Request object of function invocation
 * @param {Response} res Response object for sending response if applicable
 * @param {AllowedMethods[]} methods Array of allowed methods to restrict
 * function call to
 * @return {Response<any> | undefined}
 */
const onlyAllowMethods = (
  req: Request,
  res: Response,
  methods: AllowedMethods[],
) => {
  const methodsUnique = methods.filter(
    (value, index, array) => array.indexOf(value) === index,
  );

  let header = "OPTIONS";
  methodsUnique.forEach((method) => {
    header += `, ${method}`;
  });

  /* Set CORS for entirety of function call */
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }
  const requestHeaders = req.headers["access-control-request-headers"];
  if (requestHeaders) {
    res.setHeader("Access-Control-Allow-Headers", requestHeaders);
  }

  if (req.method === "OPTIONS") {
    res.setHeader("Allow", header);
    return res.status(204).end();
  }

  if (!methodsUnique.find((value) => value === req.method)) {
    res.setHeader("Allow", header);
    return res.status(405).json({code: 405, message: "Method not allowed!"});
  }
  return;
};

export default onlyAllowMethods;
