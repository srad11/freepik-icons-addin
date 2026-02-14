import { BASE_URL, ENDPOINTS, DEFAULT_PER_PAGE } from "./config.js";

class FreepikAPI {
  constructor(apiKey) {
    this.apiKey = apiKey;
  }

  /**
   * Internal fetch wrapper with auth header and error handling.
   */
  async _request(path, options = {}) {
    const url = options.fullUrl || `${BASE_URL}${path}`;
    const headers = {
      "x-freepik-api-key": this.apiKey,
      ...options.headers,
    };

    const fetchOptions = {
      method: options.method || "GET",
      headers,
    };

    if (options.body) {
      fetchOptions.body = JSON.stringify(options.body);
      headers["Content-Type"] = "application/json";
    }

    const response = await fetch(url, fetchOptions);

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(
          "Rate limit exceeded. Please wait before making more requests. " +
            "Free accounts allow 25 requests per day."
        );
      }
      if (response.status === 401) {
        throw new Error("Invalid API key. Check your key in Settings.");
      }
      if (response.status === 404) {
        throw new Error("Resource not found.");
      }
      const errorBody = await response.text().catch(() => "");
      throw new Error(
        `API error ${response.status}: ${errorBody || response.statusText}`
      );
    }

    return response.json();
  }

  // ---------------------------------------------------------------------------
  // Stock Icons
  // ---------------------------------------------------------------------------

  /**
   * Search icons from the stock library.
   * @param {string} term - Search query
   * @param {object} options - Optional filters
   * @param {number} options.page
   * @param {number} options.per_page
   * @param {string} options.familyId
   * @param {string} options.order - "relevance" | "recent"
   * @param {number} options.thumbnail_size
   * @param {object} options.filters
   * @param {string} options.slug
   * @returns {Promise<object>} Search results with data and meta
   */
  async searchIcons(term, options = {}) {
    const params = new URLSearchParams({ term });

    if (options.page) params.set("page", options.page);
    params.set("per_page", options.per_page || DEFAULT_PER_PAGE);
    if (options.familyId) params.set("family-id", options.familyId);
    if (options.order) params.set("order", options.order);
    if (options.thumbnail_size) params.set("thumbnail_size", options.thumbnail_size);
    if (options.slug) params.set("slug", options.slug);

    if (options.filters) {
      for (const [key, value] of Object.entries(options.filters)) {
        params.set(`filters[${key}]`, value);
      }
    }

    return this._request(`${ENDPOINTS.icons.search}?${params.toString()}`);
  }

  /**
   * Get icon details by ID.
   * @param {number|string} id
   * @returns {Promise<object>} Icon details including thumbnails, tags, related
   */
  async getIconById(id) {
    return this._request(ENDPOINTS.icons.byId(id));
  }

  /**
   * Download an icon in the specified format.
   * @param {number|string} id
   * @param {string} format - e.g. "svg", "png", "eps"
   * @param {number} [pngSize] - PNG size when format is "png"
   * @returns {Promise<{filename: string, url: string}>}
   */
  async downloadIcon(id, format, pngSize) {
    const params = new URLSearchParams({ format });
    if (format === "png" && pngSize) {
      params.set("png_size", pngSize);
    }
    const response = await this._request(
      `${ENDPOINTS.icons.download(id)}?${params.toString()}`
    );
    return { url: response.data?.url };
  }

  // ---------------------------------------------------------------------------
  // AI Icon Generation
  // ---------------------------------------------------------------------------

  /**
   * Generate an icon from a text prompt.
   * @param {string} prompt
   * @param {object} options
   * @param {string} options.style - solid | outline | color | flat | sticker
   * @param {string} options.format - png | svg
   * @param {number} options.num_inference_steps
   * @param {number} options.guidance_scale
   * @returns {Promise<object>} Generation task info (includes task ID)
   */
  async generateIcon(prompt, options = {}) {
    const body = { prompt };
    if (options.style) body.style = options.style;
    if (options.format) body.format = options.format;
    if (options.num_inference_steps) body.num_inference_steps = options.num_inference_steps;
    if (options.guidance_scale) body.guidance_scale = options.guidance_scale;

    return this._request(ENDPOINTS.ai.generate, {
      method: "POST",
      body,
    });
  }

  /**
   * Generate a preview icon from a text prompt (faster, lower quality).
   * @param {string} prompt
   * @param {object} options
   * @param {string} options.style
   * @param {string} options.format
   * @returns {Promise<object>} Preview task info
   */
  async generatePreview(prompt, options = {}) {
    const body = { prompt };
    if (options.style) body.style = options.style;
    if (options.format) body.format = options.format;

    return this._request(ENDPOINTS.ai.preview, {
      method: "POST",
      body,
    });
  }

  /**
   * Download a previously generated AI icon.
   * @param {string} taskId - Generation task ID
   * @param {string} format - png | svg
   * @returns {Promise<object>} Download info with URL
   */
  async downloadGeneratedIcon(taskId, format) {
    return this._request(ENDPOINTS.ai.download(taskId, format), {
      method: "POST",
    });
  }

  /**
   * Poll an AI generation task until it completes or times out.
   * @param {string} taskId
   * @param {number} interval - Polling interval in ms (default 2000)
   * @param {number} maxAttempts - Max poll attempts (default 30)
   * @returns {Promise<object>} Completed task result
   */
  async pollGenerationStatus(taskId, interval = 2000, maxAttempts = 30) {
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const result = await this._request(ENDPOINTS.ai.status(taskId));

      if (result.status === "completed") {
        return result;
      }

      if (result.status === "failed") {
        throw new Error(
          `Icon generation failed: ${result.error || "Unknown error"}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error(
      "Icon generation timed out. Please try again."
    );
  }
}

export default FreepikAPI;
