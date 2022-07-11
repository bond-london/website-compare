import commandLineArgs, { OptionDefinition } from "command-line-args";
import commandLineUsage from "command-line-usage";
import { join } from "path";
import { exit } from "process";
import { crawlSite, defaultOptions, Options } from "./crawler";

export function doScreenshot() {
  const optionDefinitions: OptionDefinition[] = [
    { name: "urls", type: String, multiple: true },
    { name: "output", type: String },
    {
      name: "allImages",
      type: Boolean,
      defaultValue: defaultOptions.allImages,
    },
    {
      name: "totalPages",
      type: Number,
      defaultValue: defaultOptions.totalPages,
    },
    { name: "width", type: Number, defaultValue: defaultOptions.width },
    { name: "hasTouch", type: Boolean, defaultValue: defaultOptions.hasTouch },
    { name: "height", type: Number, defaultValue: defaultOptions.height },
    {
      name: "deviceScaleFactor",
      type: Number,
      defaultValue: defaultOptions.deviceScaleFactor,
    },
    {
      name: "isLandscape",
      type: Boolean,
      defaultValue: defaultOptions.isLandscape,
    },
    { name: "isMobile", type: Boolean, defaultValue: defaultOptions.isMobile },
  ];

  const options = commandLineArgs(optionDefinitions) as Partial<Options>;
  if (!options.urls || options.urls.length === 0 || !options.output) {
    const usage = commandLineUsage([
      {
        header: "Options",
        optionList: optionDefinitions,
      },
    ]);
    console.log(usage);
    exit(-1);
  }
  crawlSite(options as Options)
    .then(() => {
      console.log("Compelted ok");
    })
    .catch((error) => {
      console.error("Failed", error);
    });
}

export function doCompare() {
  const optionDefinitions: OptionDefinition[] = [
    { name: "input", type: String },
  ];

  const options = commandLineArgs(optionDefinitions);
  const input = options["input"];
  if (!input) {
    const usage = commandLineUsage([
      {
        header: "Options",
        optionList: optionDefinitions,
      },
    ]);
    console.log(usage);
    exit(-1);
  }

  interface InfoType {
    paths: string[];
    output: string;
    urls: { url: string; name: string }[];
    widths: number[];
  }

  const info = require(input) as InfoType;

  async function run(i: InfoType) {
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
}
