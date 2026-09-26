const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

app.get("/health", (req, res) => {
  res.json({ ok: true, service: "vidora-delete-backend" });
});

app.post("/api/delete-video", async (req, res) => {
  try {
    const { publicId, thumbnailUrl, ownerUid } = req.body || {};

    if (!publicId) {
      return res.status(400).json({ ok: false, error: "publicId missing" });
    }

    if (!process.env.VIDORA_OWNER_UID) {
      return res.status(500).json({
        ok: false,
        error: "VIDORA_OWNER_UID environment variable is not configured."
      });
    }

    if (!ownerUid || String(ownerUid) !== String(process.env.VIDORA_OWNER_UID)) {
      return res.status(403).json({ ok: false, error: "Owner check failed." });
    }

    const videoResult = await cloudinary.uploader.destroy(publicId, {
      resource_type: "video",
      type: "upload",
      invalidate: true
    });

    let imageResult = null;
    try {
      imageResult = await cloudinary.uploader.destroy(publicId, {
        resource_type: "image",
        type: "upload",
        invalidate: true
      });
    } catch (e) {
      imageResult = { result: "not_deleted" };
    }

    const videoDeleted =
      videoResult &&
      ["ok", "not_found"].includes(String(videoResult.result));

    if (!videoDeleted) {
      return res.status(502).json({
        ok: false,
        error: "Cloudinary video delete failed.",
        cloudinary: videoResult
      });
    }

    return res.json({
      ok: true,
      message: "Cloudinary asset deleted.",
      video: videoResult,
      thumbnail: imageResult
    });
  } catch (err) {
    console.error("Delete error:", err);
    return res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : "Server error"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Vidora delete backend listening on port ${PORT}`);
});
