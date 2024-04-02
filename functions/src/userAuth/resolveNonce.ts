import {HttpsError, onCall} from "firebase-functions/v2/https";
import * as Joi from "joi";
import {db} from "../helpers/firebase";
import firestoreConverter from "../helpers/firestoreConverter";
import type {
  LoginNoncesCollection,
} from "../firestoreDocumentTypes/LoginNoncesCollection";

interface ResolveNonceBodySchema {
  nonce: string
}

const resolveNonceBodySchema = Joi.object<ResolveNonceBodySchema>({
  nonce: Joi.string().required(),
});

export const resolveNonce = onCall(async (req) => {
  if (req.auth?.uid) {
    throw new HttpsError("unavailable", "Only available to logged out users");
  }

  const {error, value: body} = resolveNonceBodySchema.validate(req.data);
  if (error) {
    throw new HttpsError("invalid-argument", error.details[0].message);
  }

  const loginNoncesCollection = db.collection("loginNonces")
    .withConverter(firestoreConverter<LoginNoncesCollection>());

  const nonceDoc = await loginNoncesCollection.doc(body.nonce).get();

  if (!nonceDoc.exists) {
    throw new HttpsError("not-found", "Login nonce does not exist");
  }

  await nonceDoc.ref.delete();

  return;
});
