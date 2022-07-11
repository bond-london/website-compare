import commandLineArgs, { OptionDefinition } from "command-line-args";
import commandLineUsage from "command-line-usage";
import { join } from "path";
import { exit } from "process";
import { crawlSite, defaultOptions, Options } from "./crawler";

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

doCompare();
