
import { ACTIONS_CORS_HEADERS, ActionsJson, createActionHeaders } from "@solana/actions";

// create the standard headers for this route (including CORS)
const headers = createActionHeaders();

export const GET = async () => {
  const payload: ActionsJson = {
    rules: [
      // map all root level routes to an action
      {
        pathPattern: "/*",
        apiPath: "/api/actions/*",
      },
      // idempotent rule as the fallback
      {
        pathPattern: "/api/actions/**",
        apiPath: "/api/actions/**",
      },
    ],
  };

  return Response.json(payload, {
    headers: ACTIONS_CORS_HEADERS,
  });
};

// DO NOT FORGET TO INCLUDE THE `OPTIONS` HTTP METHOD
export const OPTIONS = async () => Response.json(null, { headers });
