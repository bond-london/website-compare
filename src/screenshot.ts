import {
  CheerioCrawler,
  openKeyValueStore,
  openRequestQueue,
  PseudoUrl,
  utils,
} from "apify";
import { extractUrlsFromCheerio } from "apify/build/enqueue_links/enqueue_links";
import commandLineArgs, { OptionDefinition } from "command-line-args";
import commandLineUsage from "command-line-usage";
import { mkdir } from "fs/promises";
import { dirname, join } from "path";
import { exit } from "process";
import { launch } from "puppeteer";

const details = {
  url: "https://bellwethercoffee.com",
  directory: "d:/temp/bwscreenshots/production",
};
// const details = { url: "https://bellwetherwebsitedev.gatsbyjs.io", directory: "d:/temp/bwscreenshots/dev"};
// const details = {
//   url: "http://localhost:8000",
//   directory: "d:/temp/bwscreenshots/local",
// };

// async function crawlSite(url: string, matcher: RegExp, directory: string) {
async function crawlSite(args: {
  url: string;
  directory: string;
  allImages?: boolean;
  totalPages?: number;
}) {
  utils.log.setLevel(utils.log.LEVELS.OFF);
  const { url, directory, allImages, totalPages } = args;
  await mkdir(directory, { recursive: true });

  // const purl = new PseudoUrl(matcher);
  const purl = new PseudoUrl(url + "[/.*$]");
  const matched = purl.matches(url);

  const oldKvs = await openKeyValueStore();
  await oldKvs.drop();

  const oldRequestQueue = await openRequestQueue();
  await oldRequestQueue.drop();

  const requestQueue = await openRequestQueue();
  await requestQueue.addRequest({ url });

  const browser = await launch();

  let count = 0;

  const crawler = new CheerioCrawler({
    requestQueue,
    handlePageFunction: async (args) => {
      console.log(`Got ${args.request.url} (${args.request.loadedUrl})`);
      const info = new URL(args.request.loadedUrl);
      const path = info.pathname.slice(0, -1);
      const screenshotName = join(
        directory,
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
            if (req.resourceType() === "image") {
              req.abort();
            } else {
              req.continue();
            }
          });
        }
        const height = 1024;
        await page.setViewport({
          width: 1440,
          hasTouch: false,
          height,
          deviceScaleFactor: 2,
          isLandscape: false,
          isMobile: false,
        });
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
                previousOffset + height
              );
              previousOffset += height;

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

      const urls = extractUrlsFromCheerio(args.$, "a", args.request.loadedUrl);
      for (const found of urls) {
        if (purl.matches(found)) {
          if (!totalPages || count < totalPages - 1) {
            const result = await requestQueue.addRequest({ url: found });
            if (!result.wasAlreadyPresent) {
              count++;
            }
          }
        }
      }
    },
  });

  await crawler.run();
  await browser.close();
}

function run() {
  // doProd
  //   ? crawlSite(
  //       "https://bellwethercoffee.com",
  //       /^https:\/\/bellwethercoffee.com\/.*$/,
  //       "d:/temp/bwscreenshots/production"
  //     )
  //   : crawlSite(
  //       "https://bellwetherwebsitedev.gatsbyjs.io",
  //       /^https:\/\/bellwetherwebsitedev.gatsbyjs.io\/.*$/,
  //       "d:/temp/bwscreenshots/dev"
  //     )
  crawlSite(details)
    .then(() => {
      console.log("Compelted ok");
    })
    .catch((error) => {
      console.error("Failed", error);
    });
}
// run();

const optionDefinitions: OptionDefinition[] = [
  { name: "url", type: String },
  { name: "output", type: String },
  { name: "allImages", type: Boolean },
  { name: "totalPages", type: Number },
];

const options = commandLineArgs(optionDefinitions);
const url = options["url"];
const directory = options["output"];
if (!url || !directory) {
  const usage = commandLineUsage([
    {
      header: "Options",
      optionList: optionDefinitions,
    },
  ]);
  console.log(usage);
  exit(-1);
}
crawlSite({
  url: options["url"],
  directory: options["output"],
  allImages: options["allImages"],
  totalPages: options["totalPages"],
})
  .then(() => {
    console.log("Compelted ok");
  })
  .catch((error) => {
    console.error("Failed", error);
  });
