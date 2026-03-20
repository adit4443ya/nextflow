import crypto from "crypto";

interface TransloaditParams {
  authKey: string;
  authSecret: string;
  templateId?: string;
  steps?: Record<string, any>;
}

/**
 * Generates signed Transloadit assembly parameters.
 * The signature prevents client-side tampering with upload instructions.
 */
export function createTransloaditParams({
  authKey,
  authSecret,
  steps,
}: TransloaditParams) {
  // Expiry 1 hour from now
  const expires = new Date(Date.now() + 60 * 60 * 1000)
    .toISOString()
    .replace("T", " ")
    .slice(0, 19) + "+00:00";

  const params = JSON.stringify({
    auth: {
      key: authKey,
      expires,
    },
    steps: steps || {
      ":original": {
        robot: "/upload/handle",
      },
    },
  });

  const signature = crypto
    .createHmac("sha384", authSecret)
    .update(Buffer.from(params, "utf-8"))
    .digest("hex");

  return { params, signature };
}

/**
 * Image upload steps — stores the file and returns CDN URL
 */
export const IMAGE_UPLOAD_STEPS = {
  ":original": {
    robot: "/upload/handle",
  },
  optimize: {
    use: ":original",
    robot: "/image/optimize",
    progressive: true,
  },
  store: {
    use: "optimize",
    robot: "/s3/store",
    // Uses Transloadit's own temporary storage
    // Files persist for 24h which is plenty for a demo
    credentials: "YOUR_S3_CREDENTIALS", // Or use Transloadit temp storage
  },
};

/**
 * Video upload steps
 */
export const VIDEO_UPLOAD_STEPS = {
  ":original": {
    robot: "/upload/handle",
  },
};

/**
 * Crop image steps — uses Transloadit's image processing
 */
export function createCropSteps(
  xPercent: number,
  yPercent: number,
  widthPercent: number,
  heightPercent: number
) {
  return {
    ":original": {
      robot: "/upload/handle",
    },
    crop: {
      use: ":original",
      robot: "/image/resize",
      crop: {
        x1: `${xPercent}%`,
        y1: `${yPercent}%`,
        x2: `${xPercent + widthPercent}%`,
        y2: `${yPercent + heightPercent}%`,
      },
    },
  };
}

/**
 * Extract frame from video steps
 */
export function createExtractFrameSteps(timestamp: string) {
  // Parse timestamp — could be seconds or "50%"
  return {
    ":original": {
      robot: "/upload/handle",
    },
    thumbnail: {
      use: ":original",
      robot: "/video/thumbs",
      count: 1,
      offsets: [parseFloat(timestamp) || 0],
      format: "jpg",
      width: 1920,
      height: 1080,
    },
  };
}
