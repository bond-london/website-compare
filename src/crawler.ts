import {
  CheerioCrawler,
  KeyValueStore,
  RequestQueue,
  utils,
  CheerioCrawlingContext,
} from "crawlee";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { Browser, launch, Viewport } from "puppeteer";

// blank image from https://onlinepngtools.com/generate-1x1-png
const whiteImage =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdj+P///38ACfsD/QVDRcoAAAAASUVORK5CYII=";
const blackImage =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAA1JREFUGFdjYGBg+A8AAQQBAHAgZQsAAAAASUVORK5CYII=";
const transparentImage =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAAXNSR0IArs4c6QAAAAtJREFUGFdjYAACAAAFAAGq1chRAAAAAElFTkSuQmCC";
const blankImage = transparentImage;
const blankBuffer = Buffer.from(blankImage, "base64");

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

async function takeScreenshot(
  context: CheerioCrawlingContext<any, any>,
  browser: Browser,
  options: Options
) {
  const { urls, output, allImages, totalPages, ...rest } = options;
  const viewport = rest as Viewport;
  const info = new URL(context.request.loadedUrl || "");
  const path = info.pathname.endsWith("/")
    ? info.pathname.slice(0, -1)
    : info.pathname;
  const screenshotName = join(
    output,
    (path.length === 0 ? "index" : path) + ".png"
  );

  context.log.info(`taking screenshot ${screenshotName}`);
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
    await page.goto(context.request.loadedUrl || "", {
      waitUntil: "networkidle2",
    });

    if (allImages) {
      let previousOffset = 0;
      const pageHeight = await page.evaluate(() => document.body.scrollHeight);
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
          context.log.error("Error scrolling", e as any);
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
}

export async function crawlSite(options: Options) {
  utils.log.setLevel(utils.log.LEVELS.INFO);
  const { urls, output, allImages, totalPages, ...rest } = options;
  await mkdir(output, { recursive: true });

  const oldKvs = await KeyValueStore.open();
  await oldKvs.drop();

  const oldRequestQueue = await RequestQueue.open();
  await oldRequestQueue.drop();

  const browser = await launch();
  let remainingRequests = totalPages > 0 ? totalPages : 1;

  const crawler = new CheerioCrawler({
    async requestHandler(context) {
      const { log, request, enqueueLinks } = context;
      if (totalPages < 0 || remainingRequests) {
        log.info(request.url);
        remainingRequests--;
        await takeScreenshot(context, browser, options);
        if (totalPages < 0 || remainingRequests) {
          await enqueueLinks();
        }
      }
    },
  });

  await crawler.run(urls);
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
