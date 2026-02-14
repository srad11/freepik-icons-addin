// In development: webpack dev server proxies /api/freepik/* to https://api.freepik.com/v1/*
// In production: uses the Cloudflare Worker URL (injected at build time via CF_WORKER_URL env var)
/* global __API_BASE_URL__ */
const BASE_URL = typeof __API_BASE_URL__ !== "undefined" ? __API_BASE_URL__ : "/api/freepik";

const ENDPOINTS = {
  icons: {
    search: "/icons",
    byId: (id) => `/icons/${id}`,
    download: (id) => `/icons/${id}/download`,
  },
  ai: {
    generate: "/ai/text-to-icon",
    preview: "/ai/text-to-icon/preview",
    status: (taskId) => `/ai/text-to-icon/status/${taskId}`,
    download: (taskId, format) => `/ai/text-to-icon/${taskId}/render/${format}`,
  },
};

const FORMAT_OPTIONS = ["svg", "png", "gif", "mp4", "aep", "json", "psd", "eps"];

const PNG_SIZE_OPTIONS = [512, 256, 128, 64, 32, 24, 16];

const AI_STYLE_OPTIONS = ["solid", "outline", "color", "flat", "sticker"];

const AI_FORMAT_OPTIONS = ["png", "svg"];

const DEFAULT_PER_PAGE = 20;

export {
  BASE_URL,
  ENDPOINTS,
  FORMAT_OPTIONS,
  PNG_SIZE_OPTIONS,
  AI_STYLE_OPTIONS,
  AI_FORMAT_OPTIONS,
  DEFAULT_PER_PAGE,
};
