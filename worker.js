import { handleRequest } from "./api/router.js";

export default {
  async fetch(request, env) {
    return handleRequest(request, env);
  },
};
