import { join } from "path";
import { crawlSite, defaultOptions } from "./crawler";

const info = {
  paths: [
    "/",
    "/product/",
    "/impact-report/",
    "/blog/the-complete-guide-to-coffee-shop-profit-margins-and-how-to-raise-them/",
  ],
  output: "c:/temp/bwtest/",
  // urls: [{
  //     url: "https://bellwethercoffee.com", name: "prod"
  // },
  // { url: "https://bellwetherwebsitedev.gatsbyjs.io", name: "dev" }],
  urls: [{ url: "http://localhost:8000", name: "local" }],
  widths: [375, 768, 1024, 1440, 1920],
};

async function run(i: typeof info) {
  console.log("Running multiple test");
  const { paths, output, urls, widths } = i;

  for (const x of urls) {
    const { url, name } = x;
    for (const width of widths) {
      console.log(`Running for ${name}: @ ${width}`);
      const urls = paths.map((p) => url + p);
      await crawlSite({
        ...defaultOptions,
        totalPages: 0,
        urls,
        output: join(i.output, name, `${width}`),
        width,
      });
    }
  }
}

run(info)
  .then(() => console.log("finished"))
  .catch(console.error);
