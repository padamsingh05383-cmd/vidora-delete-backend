function response(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    }
  });
}

async function sha1(text) {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-1", data);

  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

async function destroyVideo(env, publicId) {
  const timestamp = Math.floor(Date.now() / 1000);

  const params = {
    invalidate: "true",
    public_id: publicId,
    timestamp: String(timestamp)
  };

  const toSign = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join("&");

  const signature = await sha1(
    toSign + env.CLOUDINARY_API_SECRET
  );

  const body = new URLSearchParams({
    ...params,
    api_key: env.CLOUDINARY_API_KEY,
    signature
  });

  const url =
    `https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/video/destroy`;

  const result = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });

  return await result.json();
}

export default {
  async fetch(request, env) {

    if (request.method === "OPTIONS") {
      return response({ ok: true });
    }

    if (request.method !== "POST") {
      return response({
        ok: false,
        error: "POST required"
      }, 405);
    }

    try {
      const data = await request.json();

      const publicId =
        data.publicId ||
        data.public_id;

      if (!publicId) {
        return response({
          ok: false,
          error: "publicId is required"
        }, 400);
      }

      if (
        !env.CLOUDINARY_CLOUD_NAME ||
        !env.CLOUDINARY_API_KEY ||
        !env.CLOUDINARY_API_SECRET
      ) {
        return response({
          ok: false,
          error: "Cloudinary secrets are not configured"
        }, 500);
      }

      const result = await destroyVideo(env, publicId);

      return response({
        ok: result.result === "ok",
        cloudinary: result
      });

    } catch (error) {
      return response({
        ok: false,
        error: error.message
      }, 500);
    }
  }
};
