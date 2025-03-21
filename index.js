const express = require("express");
const puppeteer = require("puppeteer-extra");
const StealthPlugin = require("puppeteer-extra-plugin-stealth");
const fs = require("fs");
const path = require("path");

puppeteer.use(StealthPlugin());

const app = express();
const PORT = process.env.PORT || 3000; // Χρήση δυναμικής θύρας που παρέχεται από το Render

// Δημιουργία φακέλου screenshots, αν δεν υπάρχει
const screenshotsDir = path.join(__dirname, "screenshots");
if (!fs.existsSync(screenshotsDir)) {
    fs.mkdirSync(screenshotsDir);
    console.log(`Created directory: ${screenshotsDir}`);
}

// Ρίζα API (Root Route)
app.get("/", (req, res) => {
    res.send("Welcome to the Screenshot API! Use /screenshot with query parameters to take screenshots.");
});

// Διαδρομή για λήψη screenshots
app.get("/screenshot", async (req, res) => {
    const url = req.query.url;
    const device = req.query.device || "desktop";

    if (!url) {
        return res.status(400).json({ error: "Missing URL parameter" });
    }

    console.log("Launching browser...");
    const browser = await puppeteer.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"], // Σημαντικό για Render servers
        executablePath: '/opt/render/.cache/puppeteer/chrome' // Διόρθωση διαδρομής Chrome
    });

    const page = await browser.newPage();

    try {
        console.log(`Setting viewport for ${device}`);
        if (device === "mobile") {
            await page.setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 13_3 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/13.0 Mobile/15E148 Safari/604.1");
            await page.setViewport({ width: 375, height: 812, isMobile: true, hasTouch: true });
        } else if (device === "tablet") {
            await page.setUserAgent("Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/537.36 (KHTML, like Gecko) Version/13.0 Safari/604.1");
            await page.setViewport({ width: 768, height: 1024, isMobile: true, hasTouch: true });
        } else {
            await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.5481.178 Safari/537.36");
            await page.setViewport({ width: 1920, height: 1080 });
        }

        console.log(`Navigating to: ${url}`);
        await page.goto(url, { waitUntil: "networkidle0", timeout: 15000 });

        console.log("Waiting for the body to load...");
        await page.waitForSelector('body');
        console.log("Content loaded. Taking screenshot...");

        const filePath = path.join(screenshotsDir, `screenshot-${device}.png`);
        const screenshot = await page.screenshot({ path: filePath, fullPage: true });
        console.log(`Screenshot saved at: ${filePath}`);

        res.setHeader("Content-Type", "image/png");
        res.send(screenshot);
        console.log("Screenshot sent successfully.");
    } catch (error) {
        console.error("An error occurred:", error);
        res.status(500).json({ error: "An error occurred while taking the screenshot." });
    } finally {
        console.log("Closing browser...");
        await browser.close();
    }
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
