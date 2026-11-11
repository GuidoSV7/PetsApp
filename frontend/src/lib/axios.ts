import axios from "axios";
import {
  applyRequestAuthPolicy,
  mapApiResponseError,
} from "@/lib/api-auth-policy";
import { handleSessionExpired } from "@/lib/session-expiry";
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
  (error) => {
    const status = (error as { response?: { status?: number } })?.response?.status;
    if (status === 401) {
      handleSessionExpired();
    }
    return Promise.reject(mapApiResponseError(error));
  },
);

export default api;

export function getPetsAppBaseUrl() {
  return api.defaults.baseURL ?? petsappPublicClientUrl();
}
