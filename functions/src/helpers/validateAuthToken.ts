import {HttpsError, type Request} from "firebase-functions/v2/https";
import type {
  ApiKeyDocument,
} from "../firestoreDocumentTypes/ProjectCredentials";
import type {Response} from "express";
import {db} from "./firebase";
import firestoreConverter from "./firestoreConverter";

const validateAuthToken = async (req: Request, res: Response) => {
  const apiKeyDoc = (await db.collection("project").doc("apiKey")
    .withConverter(firestoreConverter<ApiKeyDocument>()).get()).data();

  if (apiKeyDoc === undefined) {
    res.status(500).json({code: 500, message: "ApiKeyDoc does not exist"});
    throw new HttpsError("internal", "ApiKeyDoc does not exist");
  }

  const reqApiKey = req.headers["authorization"]?.split(" ")[1];

  if (!reqApiKey?.length) {
    res.status(401).json({
      code: 401,
      message: "Add an API key to the Auth header",
    });
    throw new HttpsError("unauthenticated", "No API key in Auth header");
  }

  if (reqApiKey !== apiKeyDoc.invocationsKey) {
    res.status(401).json({
      code: 401,
      message: "The supplied API key does not exist",
    });
    throw new HttpsError("unauthenticated", "Supplied API key does not exist");
  }

  return;
};

export default validateAuthToken;
