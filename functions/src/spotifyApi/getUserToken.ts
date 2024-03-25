import {onRequest} from "firebase-functions/v2/https";
import {getUserToken as getSpotifyUserToken} from "../helpers/spotifyTokens";

/** Remove this function when done with testing */
export const getUserToken = onRequest(async (req, res) => {
  const accessToken = await getSpotifyUserToken();
  res.json({accessToken});
});
