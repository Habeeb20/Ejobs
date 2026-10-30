export const isHttpUrl = (value) => {
  try {
    const u = new URL(String(value));
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

// Accepts only https://res.cloudinary.com/<our cloud>/<image|video>/upload/...
export const isCloudinaryUrl = (value, type) => {
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  if (!cloud || !["image", "video"].includes(type)) return false;
  try {
    const u = new URL(String(value));
    return (
      u.protocol === "https:" &&
      u.hostname === "res.cloudinary.com" &&
      u.pathname.startsWith(`/${cloud}/${type}/upload/`)
    );
  } catch {
    return false;
  }
};