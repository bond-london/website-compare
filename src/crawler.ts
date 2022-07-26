import {
  CheerioCrawler,
  openKeyValueStore,
  openRequestQueue,
  PseudoUrl,
  utils,
} from "apify";
import { extractUrlsFromCheerio } from "apify/build/enqueue_links/enqueue_links";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { launch, Viewport } from "puppeteer";

export interface Options {
  urls: string[];
  output: string;
  allImages: boolean;
  totalPages: number;
  width: number;
  hasTouch: boolean;
  height: number;
  deviceScaleFactor: number;
  isLandscape: boolean;
  isMobile: boolean;
}

export async function crawlSite(args: Options) {
  utils.log.setLevel(utils.log.LEVELS.OFF);
  const { urls, output, allImages, totalPages, ...rest } = args;
  const viewport = rest as Viewport;
  await mkdir(output, { recursive: true });

  const oldKvs = await openKeyValueStore();
  await oldKvs.drop();

  const oldRequestQueue = await openRequestQueue();
  await oldRequestQueue.drop();

  const requestQueue = await openRequestQueue();
  for (const url of urls) {
    await requestQueue.addRequest({ url });
  }
  const browser = await launch();

  let count = 0;

  // blank image from https://onlinepngtools.com/generate-1x1-png
  const blankImage =
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=";
  const blankBuffer = Buffer.from(blankImage, "base64");

  const crawler = new CheerioCrawler({
    requestQueue,
    handlePageFunction: async (args) => {
      console.log(`Got ${args.request.url} (${args.request.loadedUrl})`);
      const info = new URL(args.request.loadedUrl);
      const purl = new PseudoUrl(info.origin + "[/.*$]");
      const path = info.pathname.slice(0, -1);
      const screenshotName = join(
        output,
        (path.length === 0 ? "index" : path) + ".png"
      );

      console.log("taking screenshot", screenshotName);
      const screenshotDir = dirname(screenshotName);
      await mkdir(screenshotDir, { recursive: true });

      const page = await browser.newPage();
      try {
        if (!allImages) {
          await page.setRequestInterception(true);
          page.on("request", (req) => {
            const url = req.url().toLowerCase();
            const resourceType = req.resourceType();
            if (resourceType === "image") {
              req.respond({
                status: 200,
                contentType: "image/png",
                body: blankBuffer,
              });
            } else if (
              resourceType == "media" ||
              url.endsWith(".mp4") ||
              url.endsWith(".avi") ||
              url.endsWith(".flv") ||
              url.endsWith(".mov") ||
              url.endsWith(".mov")
            ) {
              req.abort();
            } else {
              req.continue();
            }
          });
        }
        await page.setViewport(viewport);
        await page.setJavaScriptEnabled(false);
        await page.goto(args.request.loadedUrl, {
          waitUntil: "networkidle2",
        });
        if (allImages) {
          let previousOffset = 0;
          const pageHeight = await page.evaluate(
            () => document.body.scrollHeight
          );
          while (previousOffset < pageHeight) {
            try {
              await page.evaluate(
                (position) => window.scrollTo(0, position),
                previousOffset + viewport.height
              );
              previousOffset += viewport.height;

              await page.evaluate(() => window.scrollY);
              await page.waitForNetworkIdle();
            } catch (e) {
              console.log("Error scrolling", e);
              break;
            }
          }
        }
        await page.screenshot({
          path: screenshotName,
          captureBeyondViewport: true,
          fullPage: true,
        });
      } finally {
        await page.close();
      }

      if (totalPages !== 0) {
        const urls = extractUrlsFromCheerio(
          args.$,
          "a",
          args.request.loadedUrl
        );
        for (const found of urls) {
          if (purl.matches(found)) {
            if (totalPages === -1 || count < totalPages - 1) {
              const result = await requestQueue.addRequest({ url: found });
              if (!result.wasAlreadyPresent) {
                count++;
              }
            }
          }
        }
      }
    },
  });

  await crawler.run();
  await browser.close();
}

export const defaultOptions: Options = {
  urls: [],
  output: "",
  allImages: false,
  totalPages: -1,
  width: 1440,
  hasTouch: false,
  height: 1024,
  deviceScaleFactor: 2,
  isLandscape: false,
  isMobile: false,
};
