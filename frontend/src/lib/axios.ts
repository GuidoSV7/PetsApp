import axios from "axios";
import {
  applyRequestAuthPolicy,
  mapApiResponseError,
} from "@/lib/api-auth-policy";
import { petsappPublicClientUrl } from "@/lib/petsapp-api-origin";

const api = axios.create({
  baseURL: petsappPublicClientUrl(),
  timeout: 30_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  applyRequestAuthPolicy(config);
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(mapApiResponseError(error)),
);

export default api;

export function getPetsAppBaseUrl() {
  return api.defaults.baseURL ?? petsappPublicClientUrl();
}
