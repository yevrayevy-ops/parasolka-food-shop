const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbyVHhPfXR9SWugxdubgTBA0CH1LIlt6gK4A5e4L9wfueL8RSoSG89FAVjWjGbDXh1FGZg/exec";

module.exports = async function handler(req, res) {
  try {
    const query =
      req.url && req.url.includes("?")
        ? req.url.substring(req.url.indexOf("?"))
        : "";

    const targetUrl = GOOGLE_SCRIPT_URL + query;

    const options = {
      method: req.method,
      headers: {
        "Content-Type":
          req.headers["content-type"] ||
          "text/plain;charset=utf-8"
      }
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      options.body =
        typeof req.body === "string"
          ? req.body
          : JSON.stringify(req.body || {});
    }

    const response = await fetch(targetUrl, options);
    const text = await response.text();

    res.status(response.status);
    res.setHeader(
      "Content-Type",
      response.headers.get("content-type") ||
        "application/json"
    );

    return res.send(text);
  } catch (error) {
    console.error("Google Apps Script proxy error:", error);

    return res.status(500).json({
      success: false,
      error: error.message
    });
  }
};
