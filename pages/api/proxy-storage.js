import https from "https";

export default function handler(req, res) {
    const { url } = req.query;
    if (!url) return res.status(400).json({ error: "url required" });

    // Only allow Firebase Storage URLs
    if (!url.includes("firebasestorage.googleapis.com")) {
        return res.status(403).json({ error: "forbidden" });
    }

    https.get(url, (proxyRes) => {
        const contentType = proxyRes.headers["content-type"] || "application/octet-stream";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "no-store");
        proxyRes.pipe(res);
    }).on("error", () => {
        res.status(500).json({ error: "download failed" });
    });
}

export const config = {
    api: { responseLimit: false },
};
